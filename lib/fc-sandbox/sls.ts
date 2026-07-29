import { createHash, createHmac } from "node:crypto";
import { gzipSync } from "node:zlib";

export type SlsLogEntry = {
  time: number;
  contents: Record<string, string>;
};

export type SlsPostResult = {
  success: boolean;
  requestId?: string;
  error?: string;
};

const SLS_API_VERSION = "0.6.0";
const SLS_CONTENT_TYPE = "application/x-protobuf";
const SLS_COMPRESS_TYPE = "gzip";

function encodeVarint(value: number): number[] {
  let n = value >>> 0;
  const bytes: number[] = [];
  while (n > 0x7f) {
    bytes.push((n & 0x7f) | 0x80);
    n >>>= 7;
  }
  bytes.push(n);
  return bytes;
}

function encodeKey(fieldNumber: number, wireType: number): number[] {
  return encodeVarint((fieldNumber << 3) | wireType);
}

function encodeBytes(fieldNumber: number, value: Uint8Array): Uint8Array {
  const key = encodeKey(fieldNumber, 2);
  const length = encodeVarint(value.length);
  const out = new Uint8Array(key.length + length.length + value.length);
  out.set(key, 0);
  out.set(length, key.length);
  out.set(value, key.length + length.length);
  return out;
}

function encodeString(fieldNumber: number, value: string): Uint8Array {
  return encodeBytes(fieldNumber, Buffer.from(value, "utf8"));
}

function encodeUint32(fieldNumber: number, value: number): Uint8Array {
  const key = encodeKey(fieldNumber, 0);
  const varint = encodeVarint(value >>> 0);
  const out = new Uint8Array(key.length + varint.length);
  out.set(key, 0);
  out.set(varint, key.length);
  return out;
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function encodeContent(key: string, value: string): Uint8Array {
  return concatBytes([encodeString(1, key), encodeString(2, value)]);
}

function encodeLog(entry: SlsLogEntry): Uint8Array {
  const parts: Uint8Array[] = [encodeUint32(1, entry.time)];
  for (const [key, value] of Object.entries(entry.contents)) {
    parts.push(encodeBytes(2, encodeContent(key, value)));
  }
  return concatBytes(parts);
}

/** Protobuf LogGroup bytes for PutLogs (field 1 = repeated Log). */
export function encodeSlsLogGroup(
  entries: SlsLogEntry[],
  options?: { topic?: string; source?: string },
): Uint8Array {
  const parts: Uint8Array[] = [];
  for (const entry of entries) {
    parts.push(encodeBytes(1, encodeLog(entry)));
  }
  if (options?.topic) parts.push(encodeString(3, options.topic));
  if (options?.source) parts.push(encodeString(4, options.source));
  return concatBytes(parts);
}

export function contentMd5(body: Uint8Array): string {
  return createHash("md5").update(body).digest("hex").toUpperCase();
}

export function buildSlsSignString(input: {
  method: string;
  contentMd5: string;
  contentType: string;
  date: string;
  headers: Record<string, string>;
  resource: string;
}): string {
  const canonicalHeaders = Object.keys(input.headers)
    .filter((key) => {
      const lower = key.toLowerCase();
      return lower.startsWith("x-log-") || lower.startsWith("x-acs-");
    })
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
    .map((key) => `${key.toLowerCase()}:${input.headers[key].trim()}`)
    .join("\n");

  return [
    input.method.toUpperCase(),
    input.contentMd5,
    input.contentType,
    input.date,
    canonicalHeaders,
    input.resource,
  ].join("\n");
}

export function buildSlsAuthorization(input: {
  accessKeyId: string;
  accessKeySecret: string;
  method: string;
  contentMd5: string;
  contentType: string;
  date: string;
  headers: Record<string, string>;
  resource: string;
}): string {
  const signString = buildSlsSignString(input);
  const signature = createHmac("sha1", input.accessKeySecret)
    .update(signString, "utf8")
    .digest("base64");
  return `LOG ${input.accessKeyId}:${signature}`;
}

function resolveSlsConfig() {
  const endpoint = process.env.ALIYUN_SLS_ENDPOINT?.trim() || null;
  const project = process.env.ALIYUN_SLS_PROJECT?.trim() || null;
  const logstore = process.env.ALIYUN_SLS_LOGSTORE?.trim() || null;
  const accessKeyId = process.env.ALIYUN_SLS_ACCESS_KEY_ID?.trim() || null;
  const accessKeySecret =
    process.env.ALIYUN_SLS_ACCESS_KEY_SECRET?.trim() || null;
  if (!endpoint || !project || !logstore || !accessKeyId || !accessKeySecret) {
    return null;
  }
  return { endpoint, project, logstore, accessKeyId, accessKeySecret };
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

export async function postLogsToSls(
  entries: SlsLogEntry[],
): Promise<SlsPostResult> {
  if (entries.length === 0) {
    return { success: false, error: "sls_empty_entries" };
  }

  const config = resolveSlsConfig();
  if (!config) {
    return { success: false, error: "sls_unconfigured" };
  }

  const endpoint = normalizeEndpoint(config.endpoint);
  const resource = `/logstores/${config.logstore}/shards/lb`;
  const host = `${config.project}.${endpoint}`;
  const url = `https://${host}${resource}`;

  const rawBody = encodeSlsLogGroup(entries, {
    topic: "fc-sandbox",
    source: "dopa-app",
  });
  const body = gzipSync(Buffer.from(rawBody));
  const md5 = contentMd5(body);
  const date = new Date().toUTCString();
  const headers: Record<string, string> = {
    "x-log-apiversion": SLS_API_VERSION,
    "x-log-bodyrawsize": String(rawBody.length),
    "x-log-compresstype": SLS_COMPRESS_TYPE,
    "x-log-signaturemethod": "hmac-sha1",
  };
  const authorization = buildSlsAuthorization({
    accessKeyId: config.accessKeyId,
    accessKeySecret: config.accessKeySecret,
    method: "POST",
    contentMd5: md5,
    contentType: SLS_CONTENT_TYPE,
    date,
    headers,
    resource,
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Host: host,
        Date: date,
        "Content-Type": SLS_CONTENT_TYPE,
        "Content-MD5": md5,
        "Content-Length": String(body.length),
        Authorization: authorization,
        ...headers,
      },
      body,
    });
    const requestId =
      response.headers.get("x-log-requestid") ??
      response.headers.get("x-log-request-id") ??
      undefined;
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 200);
      return {
        success: false,
        requestId,
        error: `sls_http_${response.status}${detail ? `:${detail}` : ""}`,
      };
    }
    return { success: true, requestId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? `sls_transport:${error.message.slice(0, 120)}`
          : "sls_transport",
    };
  }
}

export function telemetryFieldsToSlsContents(
  level: string,
  input: Record<string, unknown>,
  observedAt: string,
): Record<string, string> {
  const contents: Record<string, string> = {
    schema: "dopa.fc-sandbox.telemetry.v1",
    observedAt,
    level,
  };
  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) continue;
    contents[key] = typeof value === "string" ? value : String(value);
  }
  return contents;
}
