export type WorkerConfig = {
  accountId: string;
  region: string;
  endpoint?: string;
  accessKeyId: string;
  accessKeySecret: string;
  securityToken?: string;
  refreshCredentials?: () => Promise<TemporaryCredentials>;
  queueName: string;
  callbackBaseUrl: string;
  callbackSecret: string;
  callbackBypassSecret?: string;
  dashscopeApiKey: string;
  qwenKeyExpiresAt: number;
  qwenEndpoint: string;
  qwenModel: string;
  workerId: string;
  workerVersion: string;
};

type TemporaryCredentials = {
  accessKeyId: string;
  accessKeySecret: string;
  securityToken: string;
};

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function requiredTimestamp(name: string): number {
  const value = Date.parse(required(name));
  if (!Number.isFinite(value)) {
    throw new Error(`${name} must be a valid ISO 8601 timestamp.`);
  }
  return value;
}

async function ecsRoleCredentials(
  roleName: string,
): Promise<TemporaryCredentials> {
  const metadataBase = "http://100.100.100.200/latest";
  const tokenResponse = await fetch(`${metadataBase}/api/token`, {
    method: "PUT",
    headers: {
      "X-aliyun-ecs-metadata-token-ttl-seconds": "21600",
    },
    signal: AbortSignal.timeout(5_000),
  });
  if (!tokenResponse.ok) {
    throw new Error("Could not obtain an ECS metadata token.");
  }
  const token = await tokenResponse.text();
  const credentialResponse = await fetch(
    `${metadataBase}/meta-data/ram/security-credentials/${encodeURIComponent(roleName)}`,
    {
      headers: { "X-aliyun-ecs-metadata-token": token },
      signal: AbortSignal.timeout(5_000),
    },
  );
  if (!credentialResponse.ok) {
    throw new Error("Could not obtain ECS RAM role credentials.");
  }
  const value: unknown = await credentialResponse.json();
  if (
    typeof value !== "object" ||
    value === null ||
    !("Code" in value) ||
    value.Code !== "Success" ||
    !("AccessKeyId" in value) ||
    typeof value.AccessKeyId !== "string" ||
    !("AccessKeySecret" in value) ||
    typeof value.AccessKeySecret !== "string" ||
    !("SecurityToken" in value) ||
    typeof value.SecurityToken !== "string"
  ) {
    throw new Error("ECS RAM role returned invalid temporary credentials.");
  }
  return {
    accessKeyId: value.AccessKeyId,
    accessKeySecret: value.AccessKeySecret,
    securityToken: value.SecurityToken,
  };
}

export async function loadConfig(): Promise<WorkerConfig> {
  const callbackBaseUrl = required("DOPA_CALLBACK_URL").replace(/\/+$/, "");
  const callbackUrl = new URL(callbackBaseUrl);
  if (
    callbackUrl.protocol !== "https:" &&
    !(callbackUrl.protocol === "http:" && callbackUrl.hostname === "localhost")
  ) {
    throw new Error("DOPA_CALLBACK_URL must use HTTPS outside local development.");
  }

  const qwenEndpoint =
    process.env.QWEN_RESPONSES_ENDPOINT?.trim() ??
    "https://dashscope-us.aliyuncs.com/compatible-mode/v1/responses";
  if (new URL(qwenEndpoint).protocol !== "https:") {
    throw new Error("QWEN_RESPONSES_ENDPOINT must use HTTPS.");
  }

  const roleName = process.env.ALIBABA_ECS_RAM_ROLE_NAME?.trim();
  const staticAccessKeyId = process.env.ALIBABA_MNS_ACCESS_KEY_ID?.trim();
  const staticAccessKeySecret =
    process.env.ALIBABA_MNS_ACCESS_KEY_SECRET?.trim();
  if (!roleName && (!staticAccessKeyId || !staticAccessKeySecret)) {
    throw new Error(
      "ALIBABA_ECS_RAM_ROLE_NAME or scoped MNS access keys are required.",
    );
  }
  const initialCredentials = roleName
    ? await ecsRoleCredentials(roleName)
    : {
        accessKeyId: staticAccessKeyId!,
        accessKeySecret: staticAccessKeySecret!,
        securityToken:
          process.env.ALIBABA_MNS_SECURITY_TOKEN?.trim() || undefined,
      };

  return {
    accountId: required("ALIBABA_MNS_ACCOUNT_ID"),
    region: process.env.ALIBABA_MNS_REGION?.trim() || "us-east-1",
    endpoint: process.env.ALIBABA_MNS_ENDPOINT?.trim() || undefined,
    accessKeyId: initialCredentials.accessKeyId,
    accessKeySecret: initialCredentials.accessKeySecret,
    securityToken: initialCredentials.securityToken,
    refreshCredentials: roleName
      ? () => ecsRoleCredentials(roleName)
      : undefined,
    queueName:
      process.env.ALIBABA_MNS_QUEUE?.trim() ||
      "dopa-competitor-research-v1",
    callbackBaseUrl,
    callbackSecret: required("DOPA_RESEARCH_HMAC_SECRET"),
    callbackBypassSecret:
      process.env.VERCEL_AUTOMATION_BYPASS_SECRET?.trim() || undefined,
    dashscopeApiKey: required("DASHSCOPE_API_KEY"),
    qwenKeyExpiresAt: requiredTimestamp("QWEN_KEY_EXPIRES_AT"),
    qwenEndpoint,
    qwenModel:
      process.env.QWEN_MODEL?.trim() || "qwen3.7-max-2026-06-08",
    workerId:
      process.env.DOPA_WORKER_ID?.trim() ||
      `competitor-worker-${process.env.HOSTNAME ?? "local"}`,
    workerVersion: process.env.DOPA_WORKER_VERSION?.trim() || "1.0.0",
  };
}
