import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  assertTransition,
  canTransition,
  checkpointDigest,
  demonstrationResult,
  evidenceReferenceDigest,
  makeEvent,
  maskSandboxReference,
} from "../lib/fc-sandbox/lifecycle";
import {
  calculateHibernationSavings,
  parseProbeResult,
  proveCompatibility,
  proveCostEfficiency,
  proveElasticity,
  proveIsolation,
  proveObservability,
  validateStressAuthorization,
  type FcProbeResult,
} from "../lib/fc-sandbox/evidence";
import {
  calculateFcHibernationSavingsFromCny,
  calculateFcRunCost,
  FC_COST_SAMPLE_ACTIVE_MS,
  FC_COST_SAMPLE_HIBERNATED_MS,
} from "../lib/fc-sandbox/cost";
import {
  buildAlert,
  matchAlertRules,
  WAKE_LATENCY_SLA_MS,
} from "../lib/fc-sandbox/alerting";
import type { FcRunRecord } from "../lib/fc-sandbox/types";
import { formatFcTelemetry } from "../lib/fc-sandbox/telemetry";
import { verifyEvidenceSignature } from "../lib/fc-sandbox/evidence-signature";
import {
  buildSlsAuthorization,
  buildSlsSignString,
  contentMd5,
  encodeSlsLogGroup,
  postLogsToSls,
} from "../lib/fc-sandbox/sls";

function test(name: string, run: () => void) {
  run();
  console.log(`✓ ${name}`);
}

test("permits only the approval-gated lifecycle", () => {
  assert.equal(canTransition("created", "provisioning"), true);
  assert.equal(canTransition("provisioning", "validating"), true);
  assert.equal(canTransition("validating", "awaiting_approval"), true);
  assert.equal(canTransition("awaiting_approval", "pausing"), true);
  assert.equal(canTransition("pausing", "hibernated"), true);
  assert.equal(canTransition("hibernated", "resuming"), true);
  assert.equal(canTransition("resuming", "scoring"), true);
  assert.equal(canTransition("scoring", "completed"), true);

  assert.equal(canTransition("awaiting_approval", "scoring"), false);
  assert.equal(canTransition("created", "validating"), false);
  assert.equal(canTransition("hibernated", "completed"), false);
  assert.equal(canTransition("completed", "resuming"), false);
  assert.throws(() => assertTransition("hibernated", "scoring"));
});

test("produces stable, stage-bound checkpoint digests", () => {
  const first = checkpointDigest(
    "run-1",
    "trace-1",
    1,
    "awaiting_approval",
  );
  const repeated = checkpointDigest(
    "run-1",
    "trace-1",
    1,
    "awaiting_approval",
  );
  const advanced = checkpointDigest(
    "run-1",
    "trace-1",
    2,
    "awaiting_approval",
  );

  assert.equal(first, repeated);
  assert.notEqual(first, advanced);
  assert.match(first, /^[a-f0-9]{64}$/);
});

test("keeps local results explicitly marked as fixtures", () => {
  const result = demonstrationResult();
  assert.equal(result.source, "demonstration_fixture");
  assert.equal(result.predictedCtrPercent, 2.84);
});

test("bounds public trace summaries and masks sandbox identifiers", () => {
  assert.equal(
    maskSandboxReference("01JCED8Z9Y6XQVK8M2NRST5WXY"),
    "01JCED8Z…5WXY",
  );
  assert.match(evidenceReferenceDigest("session-sensitive-id"), /^[a-f0-9]{64}$/);
  assert.notEqual(
    evidenceReferenceDigest("session-sensitive-id"),
    "session-sensitive-id",
  );
  assert.throws(() =>
    makeEvent({
      sequence: 1,
      eventType: "test",
      stage: "created",
      summary: "x".repeat(241),
      evidenceClass: "local_demonstration",
    }),
  );
});

test("requires every VM isolation layer and exact cleanup", () => {
  const result: FcProbeResult = {
    passed: true,
    metrics: {},
    evidence: {
      isolationLevel: "virtual_machine",
      computeDenied: true,
      networkDenied: true,
      storageDenied: true,
      separateSessionIds: true,
      cleanupVerified: true,
    },
    note: "verified",
  };
  assert.equal(proveIsolation(result), true);
  assert.equal(
    proveIsolation({
      ...result,
      evidence: { ...result.evidence, networkDenied: false },
    }),
    false,
  );
});

test("uses the rubric's full elasticity thresholds", () => {
  const result: FcProbeResult = {
    passed: true,
    metrics: {
      attempted: 100_000,
      successful: 99_000,
      failed: 1_000,
      creationRatePerMinute: 100_000,
      peakPerSecond: 5_000,
      successRatePercent: 99,
      p50CreationLatencyMs: 180,
      p95CreationLatencyMs: 420,
    },
    note: "verified",
  };
  assert.equal(proveElasticity(result, 100_000), true);
  assert.equal(
    proveElasticity({
      ...result,
      metrics: { ...result.metrics, peakPerSecond: 4_999 },
    }, 100_000),
    false,
  );
});

test("requires identical normalized output from separate E2B endpoints", () => {
  const digest = "a".repeat(64);
  const result: FcProbeResult = {
    passed: true,
    metrics: {},
    evidence: {
      sourceDigest: "b".repeat(64),
      agentRunOutputDigest: digest,
      e2bOutputDigest: digest,
      runtimeVersion: "python-3.13.13",
      e2bSdkVersion: "2.31.0",
      agentRunEndpoint: "fc-cn-hangzhou",
      e2bEndpoint: "e2b-production",
      separateEndpoints: true,
      normalizedOutput: true,
    },
    note: "verified",
  };
  assert.equal(proveCompatibility(result), true);
  assert.equal(
    proveCompatibility({
      ...result,
      evidence: { ...result.evidence, separateEndpoints: false },
    }),
    false,
  );
});

test("requires an SLS query, alert, failure root cause, and recovery", () => {
  const traceId = "123e4567-e89b-42d3-a456-426614174000";
  const result: FcProbeResult = {
    passed: true,
    metrics: { recoveryMs: 8_200, traceSpans: 5 },
    evidence: {
      traceId,
      slsProject: "dopa-fc",
      slsLogstore: "lifecycle",
      slsQuery: `traceId:${traceId}`,
      alertRuleId: "resume-failure-alert",
      metricName: "fc_resume_failures",
      failureEventId: "failure-1",
      rootCause: "checkpoint mismatch",
      alertFired: true,
    },
    note: "verified",
  };
  assert.equal(proveObservability(result), true);
  assert.equal(
    proveObservability({
      ...result,
      evidence: { ...result.evidence, alertFired: false },
    }),
    false,
  );
});

test("calculates bill-backed hibernation savings without calling it free", () => {
  const calculated = calculateHibernationSavings({
    waitHours: 2,
    activeHourlyCny: 1,
    hibernatedHourlyCny: 0.1,
    requestAndSnapshotCny: 0.05,
  });
  assert.deepEqual(calculated, {
    keptActiveCostCny: 2,
    hibernatedCostCny: 0.25,
    savedCny: 1.75,
    savingsPercent: 87.5,
  });
  const result: FcProbeResult = {
    passed: true,
    metrics: {
      waitHours: 2,
      activeHourlyCny: 1,
      hibernatedHourlyCny: 0.1,
      requestAndSnapshotCny: 0.05,
      savingsPercent: 87.5,
    },
    evidence: {
      billExportDigest: "c".repeat(64),
      currency: "CNY",
      billingPeriod: "2026-07",
      pricingSource: "Alibaba Cloud bill export",
    },
    note: "verified",
  };
  assert.equal(proveCostEfficiency(result), true);
});

test("never authorizes the scored stress probe implicitly", () => {
  const authorized = validateStressAuthorization({
    requested: true,
    targetCreates: 100_000,
    acknowledgement: "I_ACCEPT_ALIBABA_CLOUD_CHARGES",
    maximumSpendCny: 10,
  });
  assert.equal(authorized.authorized, true);
  assert.equal(
    validateStressAuthorization({
      requested: false,
      targetCreates: 100_000,
      acknowledgement: "I_ACCEPT_ALIBABA_CLOUD_CHARGES",
      maximumSpendCny: 10,
    }).authorized,
    false,
  );
  assert.equal(
    validateStressAuthorization({
      requested: true,
      targetCreates: 100_000,
      acknowledgement: undefined,
      maximumSpendCny: 10,
    }).authorized,
    false,
  );
});

test("formats bounded structured telemetry without raw provider errors", () => {
  const parsed = JSON.parse(
    formatFcTelemetry(
      "error",
      {
        event: "run.approval_path_failed",
        runId: "run-1",
        traceId: "trace-1",
        stage: "resuming",
        provider: "agentrun",
        outcome: "failed",
        errorCode: "RESUME_FAILED",
      },
      "2026-07-29T12:00:00.000Z",
    ),
  ) as Record<string, unknown>;
  assert.equal(parsed.schema, "dopa.fc-sandbox.telemetry.v1");
  assert.equal(parsed.errorCode, "RESUME_FAILED");
  assert.equal("error" in parsed, false);
});

test("accepts only fresh evidence bodies signed by the gateway", () => {
  const body = JSON.stringify({ passed: true });
  const timestamp = "1785340800";
  const secret = "evidence-signing-secret-with-at-least-32-bytes";
  const signature = createHmac("sha256", secret)
    .update(`${timestamp}.${body}`)
    .digest("hex");
  assert.equal(
    verifyEvidenceSignature({
      body,
      timestamp,
      signature,
      secret,
      nowSeconds: 1_785_340_800,
    }),
    true,
  );
  assert.equal(
    verifyEvidenceSignature({
      body: `${body} `,
      timestamp,
      signature,
      secret,
      nowSeconds: 1_785_340_800,
    }),
    false,
  );
  assert.equal(
    verifyEvidenceSignature({
      body,
      timestamp,
      signature,
      secret,
      nowSeconds: 1_785_341_101,
    }),
    false,
  );
});

test("bounds signed gateway probe records before using them", () => {
  assert.deepEqual(
    parseProbeResult({
      passed: true,
      metrics: { latencyMs: 42 },
      evidence: { traceId: "trace-1" },
      note: "verified",
    }),
    {
      passed: true,
      metrics: { latencyMs: 42 },
      evidence: { traceId: "trace-1" },
      note: "verified",
    },
  );
  assert.throws(() =>
    parseProbeResult({
      passed: true,
      metrics: { invalid: Number.POSITIVE_INFINITY },
      note: "invalid",
    }),
  );
});

test("keeps the deployable gateway and cleanup contracts in the checkout", () => {
  const contract = readFileSync(
    "infra/agentrun/gateway-contract.openapi.yaml",
    "utf8",
  );
  for (const requirement of [
    "/v1/evidence/isolation:",
    "/v1/evidence/elasticity:",
    "/v1/evidence/e2b-compatibility:",
    "/v1/evidence/observability:",
    "/v1/evidence/cost:",
    "maxSpendCny:",
    "hibernationMode:",
    "X-Dopa-Evidence-Signature:",
  ]) {
    assert.match(contract, new RegExp(requirement.replaceAll("/", "\\/")));
  }

  const deployment = JSON.parse(
    readFileSync("vercel.json", "utf8"),
  ) as { crons?: Array<{ path?: string; schedule?: string }> };
  assert.deepEqual(deployment.crons, [
    {
      path: "/api/fc-demo/maintenance",
      schedule: "0 3 * * *",
    },
  ]);

  const durableMigration = readFileSync(
    "supabase/migrations/20260729165000_fc_sandbox_runs.sql",
    "utf8",
  );
  const hardeningMigration = readFileSync(
    "supabase/migrations/20260729165004_fc_sandbox_evidence_hardening.sql",
    "utf8",
  );
  assert.match(
    durableMigration,
    /alter table public\.fc_demo_runs enable row level security;/,
  );
  assert.match(
    durableMigration,
    /grant execute on function public\.consume_fc_demo_quota\(text\)\s+to service_role;/,
  );
  assert.match(hardeningMigration, /v_global_limit integer := 40;/);
  assert.match(
    hardeningMigration,
    /revoke all on table private\.fc_demo_global_rate_limit/,
  );
});

test("quantifies USD FC run cost against an idle-active baseline", () => {
  const sample = calculateFcRunCost(
    FC_COST_SAMPLE_ACTIVE_MS,
    FC_COST_SAMPLE_HIBERNATED_MS,
  );
  assert.deepEqual(sample, {
    activeCostUsd: 0.003792,
    hibernatedCostUsd: 0.0072,
    totalCostUsd: 0.010992,
    baselineIdleCostUsd: 0.117552,
    savedUsd: 0.10656,
    savingsPercent: 90.65,
  });

  const zero = calculateFcRunCost(0, 0);
  assert.equal(zero.totalCostUsd, 0);
  assert.equal(zero.savedUsd, 0);
  assert.equal(zero.savingsPercent, 0);

  const hibernatedOnly = calculateFcRunCost(0, 3_600_000);
  assert.equal(hibernatedOnly.activeCostUsd, 0);
  assert.equal(hibernatedOnly.hibernatedCostUsd, 0.0072);
  assert.equal(hibernatedOnly.baselineIdleCostUsd, 0.11376);
  assert.ok(hibernatedOnly.savedUsd > 0);
  assert.ok(hibernatedOnly.savingsPercent > 90);

  assert.throws(() => calculateFcRunCost(-1, 0));
  assert.throws(() => calculateFcRunCost(0, Number.NaN));
});

test("maps CNY hourly rates into bill-backed hibernation savings", () => {
  const viaWrapper = calculateFcHibernationSavingsFromCny({
    waitHours: 2,
    activeHourlyCny: 1,
    hibernatedHourlyCny: 0.1,
    requestAndSnapshotCny: 0.05,
  });
  assert.deepEqual(
    viaWrapper,
    calculateHibernationSavings({
      waitHours: 2,
      activeHourlyCny: 1,
      hibernatedHourlyCny: 0.1,
      requestAndSnapshotCny: 0.05,
    }),
  );
});

test("builds Alibaba SLS PutLogs HMAC-SHA1 authorization", () => {
  const headers = {
    "x-log-apiversion": "0.6.0",
    "x-log-bodyrawsize": "50",
    "x-log-compresstype": "gzip",
    "x-log-signaturemethod": "hmac-sha1",
  };
  const signString = buildSlsSignString({
    method: "POST",
    contentMd5: "1DD45FA4A70A9300CC9FE7305AF2C494",
    contentType: "application/x-protobuf",
    date: "Mon, 09 Nov 2015 06:03:03 GMT",
    headers,
    resource: "/logstores/fc-telemetry/shards/lb",
  });
  assert.equal(
    signString,
    [
      "POST",
      "1DD45FA4A70A9300CC9FE7305AF2C494",
      "application/x-protobuf",
      "Mon, 09 Nov 2015 06:03:03 GMT",
      "x-log-apiversion:0.6.0",
      "x-log-bodyrawsize:50",
      "x-log-compresstype:gzip",
      "x-log-signaturemethod:hmac-sha1",
      "/logstores/fc-telemetry/shards/lb",
    ].join("\n"),
  );

  const authorization = buildSlsAuthorization({
    accessKeyId: "testAccessKeyId",
    accessKeySecret: "testAccessKeySecret",
    method: "POST",
    contentMd5: "1DD45FA4A70A9300CC9FE7305AF2C494",
    contentType: "application/x-protobuf",
    date: "Mon, 09 Nov 2015 06:03:03 GMT",
    headers,
    resource: "/logstores/fc-telemetry/shards/lb",
  });
  const expectedSignature = createHmac("sha1", "testAccessKeySecret")
    .update(signString, "utf8")
    .digest("base64");
  assert.equal(authorization, `LOG testAccessKeyId:${expectedSignature}`);
});

test("encodes SLS log payloads as protobuf LogGroup bytes", () => {
  const body = encodeSlsLogGroup([
    {
      time: 1_753_804_800,
      contents: {
        schema: "dopa.fc-sandbox.telemetry.v1",
        level: "info",
        event: "run.started",
        traceId: "trace-1",
      },
    },
  ]);
  assert.ok(body.byteLength > 20);
  const asText = Buffer.from(body).toString("utf8");
  assert.match(asText, /dopa\.fc-sandbox\.telemetry\.v1/);
  assert.match(asText, /trace-1/);
  assert.match(asText, /run\.started/);
  assert.equal(contentMd5(body).length, 32);
  assert.match(contentMd5(body), /^[A-F0-9]{32}$/);
});

{
  const previous = {
    endpoint: process.env.ALIYUN_SLS_ENDPOINT,
    project: process.env.ALIYUN_SLS_PROJECT,
    logstore: process.env.ALIYUN_SLS_LOGSTORE,
    accessKeyId: process.env.ALIYUN_SLS_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_SLS_ACCESS_KEY_SECRET,
  };
  delete process.env.ALIYUN_SLS_ENDPOINT;
  delete process.env.ALIYUN_SLS_PROJECT;
  delete process.env.ALIYUN_SLS_LOGSTORE;
  delete process.env.ALIYUN_SLS_ACCESS_KEY_ID;
  delete process.env.ALIYUN_SLS_ACCESS_KEY_SECRET;
  const result = await postLogsToSls([
    { time: 1_753_804_800, contents: { event: "run.started" } },
  ]);
  assert.deepEqual(result, { success: false, error: "sls_unconfigured" });
  for (const [key, value] of Object.entries(previous)) {
    const envKey = {
      endpoint: "ALIYUN_SLS_ENDPOINT",
      project: "ALIYUN_SLS_PROJECT",
      logstore: "ALIYUN_SLS_LOGSTORE",
      accessKeyId: "ALIYUN_SLS_ACCESS_KEY_ID",
      accessKeySecret: "ALIYUN_SLS_ACCESS_KEY_SECRET",
    }[key as keyof typeof previous];
    if (value === undefined) delete process.env[envKey!];
    else process.env[envKey!] = value;
  }
  console.log("✓ returns sls_unconfigured without SLS credentials");
}

function sampleRun(
  overrides: Partial<FcRunRecord> = {},
): FcRunRecord {
  const timestamp = "2026-07-29T12:00:00.000Z";
  return {
    id: "run-1",
    traceId: "trace-1",
    publicTokenHash: "token",
    approvalNonceHash: "nonce",
    requestFingerprintHash: "fp",
    scenario: "retail_launch",
    provider: "local",
    evidenceClass: "local_demonstration",
    status: "scoring",
    sandboxId: "sandbox-1",
    sandboxState: "RUNNING",
    checkpointHash: "a".repeat(64),
    checkpointVersion: 1,
    result: null,
    safeErrorCode: null,
    requestedAt: timestamp,
    pausedAt: timestamp,
    resumedAt: timestamp,
    completedAt: null,
    activeMs: 1_000,
    hibernatedMs: 2_000,
    wakeLatencyMs: 500,
    expiresAt: timestamp,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

test("matches RUN_FAILED, SLA_BREACH, and CLEANUP_FAILED alert rules", () => {
  assert.deepEqual(
    matchAlertRules(sampleRun({ status: "failed", safeErrorCode: "RESUME_FAILED" }), {
      eventType: "run.failed",
      stage: "failed",
      metadata: { code: "RESUME_FAILED" },
    }),
    ["RUN_FAILED"],
  );

  assert.deepEqual(
    matchAlertRules(sampleRun({ status: "resuming" }), {
      eventType: "sandbox.resumed",
      stage: "resuming",
      metadata: { code: "FAULT_INJECTED_CHECKPOINT_MISMATCH" },
    }),
    ["RUN_FAILED"],
  );

  assert.deepEqual(
    matchAlertRules(
      sampleRun({ wakeLatencyMs: WAKE_LATENCY_SLA_MS + 1 }),
      {
        eventType: "sandbox.resumed",
        stage: "scoring",
        metadata: { wakeLatencyMs: WAKE_LATENCY_SLA_MS + 1 },
      },
    ),
    ["SLA_BREACH"],
  );

  assert.deepEqual(
    matchAlertRules(sampleRun({ wakeLatencyMs: WAKE_LATENCY_SLA_MS }), {
      eventType: "sandbox.resumed",
      stage: "scoring",
      metadata: { wakeLatencyMs: WAKE_LATENCY_SLA_MS },
    }),
    [],
  );

  assert.deepEqual(
    matchAlertRules(sampleRun({ status: "completed" }), {
      eventType: "sandbox.cleanup_failed",
      stage: "completed",
      metadata: { code: "CLEANUP_FAILED" },
    }),
    ["CLEANUP_FAILED"],
  );

  assert.deepEqual(
    matchAlertRules(
      sampleRun({
        status: "failed",
        safeErrorCode: "FAULT_INJECTED_CHECKPOINT_MISMATCH",
        wakeLatencyMs: 4_000,
      }),
      {
        eventType: "run.failed",
        stage: "failed",
        metadata: {
          code: "FAULT_INJECTED_CHECKPOINT_MISMATCH",
          wakeLatencyMs: 4_000,
        },
      },
    ),
    ["RUN_FAILED", "SLA_BREACH"],
  );
});

test("builds bounded alert payloads for webhook dispatch", () => {
  const alert = buildAlert(
    sampleRun({
      status: "failed",
      safeErrorCode: "PREPARATION_FAILED",
    }),
    {
      eventType: "run.failed",
      stage: "failed",
      metadata: { code: "PREPARATION_FAILED" },
    },
    "RUN_FAILED",
    "2026-07-29T12:00:00.000Z",
  );
  assert.equal(alert.schema, "dopa.fc-sandbox.alert.v1");
  assert.equal(alert.rule, "RUN_FAILED");
  assert.equal(alert.severity, "error");
  assert.equal(alert.code, "PREPARATION_FAILED");
  assert.equal(alert.runId, "run-1");
  assert.equal(alert.traceId, "trace-1");
  assert.match(alert.message, /failed state/i);

  const sla = buildAlert(
    sampleRun({ wakeLatencyMs: 4_200 }),
    {
      eventType: "sandbox.resumed",
      stage: "scoring",
      metadata: { wakeLatencyMs: 4_200 },
    },
    "SLA_BREACH",
    "2026-07-29T12:00:00.000Z",
  );
  assert.equal(sla.severity, "warn");
  assert.equal(sla.wakeLatencyMs, 4_200);
  assert.match(sla.message, /4200ms/);
});
