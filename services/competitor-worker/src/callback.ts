import { createHash, createHmac, randomUUID } from "node:crypto";
import type { WorkerConfig } from "./config";

function signature(
  secret: string,
  timestamp: string,
  nonce: string,
  body: string,
) {
  const digest = createHash("sha256").update(body, "utf8").digest("hex");
  return createHmac("sha256", secret)
    .update(`${timestamp}.${nonce}.${digest}`)
    .digest("hex");
}

export async function postSigned(
  config: WorkerConfig,
  path: string,
  payload: unknown,
): Promise<unknown> {
  const body = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1_000));
  const nonce = randomUUID();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-dopa-timestamp": timestamp,
    "x-dopa-nonce": nonce,
    "x-dopa-signature": signature(
      config.callbackSecret,
      timestamp,
      nonce,
      body,
    ),
  };
  if (config.callbackBypassSecret) {
    headers["x-vercel-protection-bypass"] = config.callbackBypassSecret;
  }

  try {
    const response = await fetch(`${config.callbackBaseUrl}${path}`, {
      method: "POST",
      headers,
      body,
      signal: controller.signal,
    });
    const responseBody = await response.text();
    if (!response.ok) {
      throw new CallbackError(
        `Callback ${path} failed with ${response.status}.`,
        response.status,
      );
    }
    return responseBody ? JSON.parse(responseBody) : null;
  } finally {
    clearTimeout(timeout);
  }
}

export class CallbackError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "CallbackError";
  }
}

export function isPermanentCallbackError(error: unknown): boolean {
  return (
    error instanceof CallbackError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 409 &&
    error.status !== 429
  );
}
