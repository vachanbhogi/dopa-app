import {
  createHash,
} from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import {
  proveCompatibility,
  proveCostEfficiency,
  proveElasticity,
  proveIsolation,
  proveObservability,
  parseProbeResult,
  validateStressAuthorization,
  type FcProbeResult,
} from "../lib/fc-sandbox/evidence";
import { verifyEvidenceSignature } from "../lib/fc-sandbox/evidence-signature";
import type {
  FcCapabilityStatus,
  FcPublicRun,
  FcRunAccess,
} from "../lib/fc-sandbox/types";

type EvidenceRecord = {
  capability: string;
  status: FcCapabilityStatus;
  source: string;
  sourceDigest: string;
  observedAt: string;
  metrics: Record<string, string | number | boolean | null>;
  notes: string;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required.`);
  return value;
}

function parseBaseUrl(value: string) {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.hostname !== "localhost") {
    throw new Error("FC_DEMO_BASE_URL must be HTTPS unless it is localhost.");
  }
  return url.origin;
}

async function json<T>(response: Response): Promise<T> {
  const body = (await response.json()) as unknown;
  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof body.error === "string"
        ? body.error
        : `Request failed with ${response.status}.`;
    throw new Error(message);
  }
  return body as T;
}

async function boundedText(response: Response, maximumBytes: number) {
  const declaredLength = Number(response.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maximumBytes
  ) {
    await response.body?.cancel();
    throw new Error("Evidence response exceeded the safe size limit.");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let result = "";
  while (true) {
    const chunk = await reader.read();
    if (chunk.done) break;
    bytes += chunk.value.byteLength;
    if (bytes > maximumBytes) {
      await reader.cancel();
      throw new Error("Evidence response exceeded the safe size limit.");
    }
    result += decoder.decode(chunk.value, { stream: true });
  }
  return result + decoder.decode();
}

function requireValidEvidenceSignature(
  body: string,
  timestamp: string | null,
  signature: string | null,
) {
  const secret = requiredEnv("AGENTRUN_EVIDENCE_SIGNING_SECRET");
  if (
    !verifyEvidenceSignature({
      body,
      timestamp,
      signature,
      secret,
    })
  ) {
    throw new Error("Evidence gateway signature is invalid or expired.");
  }
}

function digest(value: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(value))
    .digest("hex");
}

function requiredEvents(run: FcPublicRun, names: string[]) {
  const seen = new Set(run.events.map((event) => event.eventType));
  return names.every((name) => seen.has(name));
}

function event(run: FcPublicRun, name: string) {
  const found = run.events.find((item) => item.eventType === name);
  if (!found) throw new Error(`Required event ${name} is missing.`);
  return found;
}

async function gatewayProbe(
  gatewayUrl: string,
  gatewayToken: string,
  name:
    | "isolation"
    | "elasticity"
    | "e2b-compatibility"
    | "observability"
    | "cost",
  options?: {
    targetCreates?: number;
    maximumSpendCny?: number;
    runId?: string;
    traceId?: string;
  },
) {
  const response = await fetch(`${gatewayUrl}/v1/evidence/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${gatewayToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      probeId: crypto.randomUUID(),
      requestedAt: new Date().toISOString(),
      ...(options?.runId ? { runId: options.runId } : {}),
      ...(options?.traceId ? { traceId: options.traceId } : {}),
      ...(name === "elasticity"
        ? {
            targetCreates: options?.targetCreates,
            stressAcknowledged: true,
            maxSpendCny: options?.maximumSpendCny,
          }
        : {}),
    }),
    signal: AbortSignal.timeout(180_000),
    redirect: "error",
  });
  const rawBody = await boundedText(response, 256 * 1_024);
  if (!response.ok) {
    throw new Error(`Evidence gateway returned ${response.status}.`);
  }
  requireValidEvidenceSignature(
    rawBody,
    response.headers.get("x-dopa-evidence-timestamp"),
    response.headers.get("x-dopa-evidence-signature"),
  );
  return parseProbeResult(JSON.parse(rawBody) as unknown);
}

async function safeGatewayProbe(
  gatewayUrl: string,
  gatewayToken: string,
  name: Parameters<typeof gatewayProbe>[2],
  options?: Parameters<typeof gatewayProbe>[3],
) {
  try {
    return await gatewayProbe(gatewayUrl, gatewayToken, name, options);
  } catch {
    return {
      passed: false,
      metrics: {},
      note: `${name} probe did not return valid gateway evidence.`,
    } satisfies FcProbeResult;
  }
}

async function recordEvidence(records: EvidenceRecord[]) {
  if (!process.argv.includes("--record")) return;
  const supabase = createClient(
    requiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnv("SUPABASE_SECRET_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { data: existing, error: lookupError } = await supabase
    .from("fc_capability_evidence")
    .select("capability,status")
    .in(
      "capability",
      records.map((record) => record.capability),
    );
  if (lookupError) {
    throw new Error(`Evidence lookup failed: ${lookupError.code}`);
  }
  const statusRank: Record<FcCapabilityStatus, number> = {
    pending: 0,
    configured: 1,
    verified: 2,
  };
  const existingStatus = new Map(
    (existing ?? []).map((row) => [
      row.capability,
      row.status as FcCapabilityStatus,
    ]),
  );
  const advancingRecords = records.filter((record) => {
    const stored = existingStatus.get(record.capability);
    return !stored || statusRank[record.status] >= statusRank[stored];
  });
  if (advancingRecords.length === 0) return;
  const { error } = await supabase.from("fc_capability_evidence").upsert(
    advancingRecords.map((record) => ({
      capability: record.capability,
      status: record.status,
      source: record.source,
      source_digest: record.sourceDigest,
      observed_at: record.observedAt,
      metrics: record.metrics,
      notes: record.notes,
    })),
  );
  if (error) throw new Error(`Evidence recording failed: ${error.code}`);
}

function boundedIntegerEnv(
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
) {
  const value = Number(process.env[name] ?? fallback);
  if (
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }
  return value;
}

const baseUrl = parseBaseUrl(requiredEnv("FC_DEMO_BASE_URL"));
const origin = baseUrl;
const hibernationProofMs = boundedIntegerEnv(
  "FC_HIBERNATION_PROOF_MS",
  60_000,
  1_000,
  24 * 60 * 60 * 1_000,
);
const elasticityTarget = boundedIntegerEnv(
  "FC_ELASTICITY_TARGET",
  100_000,
  2,
  100_000,
);
const maximumSpendCny = Number(process.env.FC_STRESS_MAX_SPEND_CNY ?? "0");
const stressAuthorization = validateStressAuthorization({
  requested: process.argv.includes("--stress"),
  targetCreates: elasticityTarget,
  acknowledgement: process.env.FC_STRESS_ACK,
  maximumSpendCny,
});
if (process.argv.includes("--stress") && !stressAuthorization.authorized) {
  throw new Error(stressAuthorization.reason);
}
const started = await json<FcRunAccess>(
  await fetch(`${baseUrl}/api/fc-demo/runs`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ scenario: "retail_launch" }),
  }),
);

if (
  started.run.provider !== "agentrun" ||
  started.run.evidenceClass !== "verified_cloud"
) {
  throw new Error(
    "The app is not in AgentRun mode. Local demonstrations cannot produce evidence.",
  );
}
if (started.run.status !== "created") {
  throw new Error(`Expected created, received ${started.run.status}.`);
}
const prepared = await json<FcPublicRun>(
  await fetch(
    `${baseUrl}/api/fc-demo/runs/${encodeURIComponent(started.run.id)}/prepare`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({ accessToken: started.accessToken }),
    },
  ),
);
if (prepared.status !== "hibernated") {
  throw new Error(`Expected hibernated, received ${prepared.status}.`);
}
const checkpointBefore = prepared.checkpoint.digest;
await new Promise((resolve) => setTimeout(resolve, hibernationProofMs));
const completed = await json<FcPublicRun>(
  await fetch(
    `${baseUrl}/api/fc-demo/runs/${encodeURIComponent(started.run.id)}/approve`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: origin },
      body: JSON.stringify({
        accessToken: started.accessToken,
        approvalNonce: started.approvalNonce,
      }),
    },
  ),
);

if (completed.status !== "completed" || completed.result?.source !== "tribe_v2") {
  throw new Error("The live golden path did not return a TRIBE v2 result.");
}
if (!checkpointBefore || checkpointBefore !== completed.checkpoint.digest) {
  throw new Error("Checkpoint continuity failed.");
}
if (
  !requiredEvents(completed, [
    "sandbox.created",
    "creative.validated",
    "sandbox.paused",
    "sandbox.resumed",
    "score.completed",
    "sandbox.stopped",
  ])
) {
  throw new Error("The lifecycle trace is incomplete.");
}
const createdEvent = event(completed, "sandbox.created");
const validatedEvent = event(completed, "creative.validated");
const pausedEvent = event(completed, "sandbox.paused");
const resumedEvent = event(completed, "sandbox.resumed");
const hibernationInvalid =
  pausedEvent.metadata.state !== "PAUSED" ||
  (pausedEvent.metadata.hibernationMode !== "deep" &&
    pausedEvent.metadata.hibernationMode !== "light") ||
  resumedEvent.metadata.continuityVerified !== true ||
  (resumedEvent.metadata.state !== "READY" &&
    resumedEvent.metadata.state !== "RUNNING") ||
  typeof completed.metrics.wakeLatencyMs !== "number" ||
  completed.metrics.wakeLatencyMs < 0 ||
  completed.metrics.hibernatedMs < hibernationProofMs;
if (hibernationInvalid) {
  throw new Error(
    "The authoritative pause or resume evidence is incomplete.",
  );
}

const gatewayUrl = process.env.AGENTRUN_LIFECYCLE_GATEWAY_URL?.trim().replace(
  /\/$/,
  "",
);
const gatewayToken = process.env.AGENTRUN_LIFECYCLE_GATEWAY_TOKEN?.trim();
const unavailableProbe = (note: string): FcProbeResult => ({
  passed: false,
  metrics: {},
  note,
});
const commonProbeOptions = {
  runId: completed.id,
  traceId: completed.traceId,
};
const [isolation, compatibility, observability, cost] =
  gatewayUrl && gatewayToken
    ? await Promise.all([
        safeGatewayProbe(
          gatewayUrl,
          gatewayToken,
          "isolation",
          commonProbeOptions,
        ),
        safeGatewayProbe(
          gatewayUrl,
          gatewayToken,
          "e2b-compatibility",
          commonProbeOptions,
        ),
        safeGatewayProbe(
          gatewayUrl,
          gatewayToken,
          "observability",
          commonProbeOptions,
        ),
        safeGatewayProbe(
          gatewayUrl,
          gatewayToken,
          "cost",
          commonProbeOptions,
        ),
      ])
    : [
        unavailableProbe(
          "Strong isolation requires the evidence gateway.",
        ),
        unavailableProbe(
          "E2B compatibility requires the evidence gateway and an independent E2B credential.",
        ),
        unavailableProbe(
          "Observability requires SLS, an alert, and a controlled failure drill.",
        ),
        unavailableProbe(
          "Cost efficiency requires a settled Alibaba bill export.",
        ),
      ];
const elasticity =
  gatewayUrl && gatewayToken && stressAuthorization.authorized
    ? await safeGatewayProbe(
        gatewayUrl,
        gatewayToken,
        "elasticity",
        {
          ...commonProbeOptions,
          targetCreates: elasticityTarget,
          maximumSpendCny,
        },
      )
    : unavailableProbe(stressAuthorization.reason);
const observedAt = new Date().toISOString();
const lifecycleSource = `dopa-run:${completed.id}`;
const lifecycleDigest = digest(completed);
const mountDigestBefore =
  typeof validatedEvent.metadata.dynamicMountDigestBefore === "string"
    ? validatedEvent.metadata.dynamicMountDigestBefore
    : null;
const mountDigestAfter =
  typeof resumedEvent.metadata.dynamicMountDigest === "string"
    ? resumedEvent.metadata.dynamicMountDigest
    : null;
const statefulVerified =
  typeof createdEvent.metadata.sessionIdDigest === "string" &&
  typeof createdEvent.metadata.dynamicMountIdDigest === "string" &&
  typeof pausedEvent.metadata.snapshotIdDigest === "string" &&
  mountDigestBefore !== null &&
  mountDigestBefore === mountDigestAfter &&
  completed.metrics.hibernatedMs >= hibernationProofMs;
const observabilityVerified = proveObservability(observability);
const costVerified = proveCostEfficiency(cost);
const records: EvidenceRecord[] = [
  {
    capability: "sandbox_lifecycle",
    status: "verified",
    source: lifecycleSource,
    sourceDigest: lifecycleDigest,
    observedAt,
    metrics: { eventCount: completed.events.length },
    notes: "Create, validate, pause, resume, score, and cleanup completed.",
  },
  {
    capability: "hibernation_wakeup",
    status: "verified",
    source: lifecycleSource,
    sourceDigest: lifecycleDigest,
    observedAt,
    metrics: {
      hibernatedMs: completed.metrics.hibernatedMs,
      wakeLatencyMs: completed.metrics.wakeLatencyMs,
      hibernationMode: String(pausedEvent.metadata.hibernationMode),
    },
    notes:
      "The provider confirmed PAUSED, retained it for the proof interval, and measured wake latency.",
  },
  {
    capability: "stateful_sessions",
    status: statefulVerified ? "verified" : "configured",
    source: lifecycleSource,
    sourceDigest: lifecycleDigest,
    observedAt,
    metrics: {
      checkpointMatch: true,
      sessionIdObserved:
        typeof createdEvent.metadata.sessionIdDigest === "string",
      dynamicMountObserved:
        typeof createdEvent.metadata.dynamicMountIdDigest === "string",
      snapshotObserved:
        typeof pausedEvent.metadata.snapshotIdDigest === "string",
      mountDigestObserved:
        mountDigestBefore !== null && mountDigestAfter !== null,
      mountDigestMatch:
        mountDigestBefore !== null && mountDigestBefore === mountDigestAfter,
      proofIntervalMs: completed.metrics.hibernatedMs,
    },
    notes: statefulVerified
      ? "Session affinity, snapshot, and matching pre/post dynamic-mount digests survived the proof interval."
      : "Checkpoint continuity passed; matching pre/post dynamic-mount and snapshot evidence remains required.",
  },
  {
    capability: "observability",
    status: observabilityVerified ? "verified" : "configured",
    source: "agentrun-gateway:observability",
    sourceDigest: digest(observability),
    observedAt,
    metrics: observability.metrics,
    notes: observabilityVerified
      ? "SLS query, cross-service trace, metric, alert, root cause, and recovery were verified."
      : observability.note,
  },
  {
    capability: "cost_efficiency",
    status: costVerified ? "verified" : "configured",
    source: "agentrun-gateway:cost",
    sourceDigest: digest(cost),
    observedAt,
    metrics: cost.metrics,
    notes: costVerified
      ? "Measured wait time reconciled with current rates and a settled bill export."
      : cost.note,
  },
  ...(
    [
      ["strong_isolation", isolation, proveIsolation(isolation)],
      [
        "extreme_elasticity",
        elasticity,
        proveElasticity(elasticity, elasticityTarget),
      ],
      [
        "e2b_compatibility",
        compatibility,
        proveCompatibility(compatibility),
      ],
    ] as const
  ).map(([capability, result, verified]) => {
    return {
      capability,
      status: verified ? ("verified" as const) : ("pending" as const),
      source: `agentrun-gateway:${capability}`,
      sourceDigest: digest(result),
      observedAt,
      metrics: result.metrics,
      notes: result.note,
    };
  }),
];

await recordEvidence(records);
console.log(
  JSON.stringify(
    {
      runId: completed.id,
      traceId: completed.traceId,
      observedAt,
      recorded: process.argv.includes("--record"),
      capabilities: records,
    },
    null,
    2,
  ),
);
