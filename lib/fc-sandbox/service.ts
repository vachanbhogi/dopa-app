import "server-only";
import { randomUUID } from "node:crypto";
import { evaluateAlertRules } from "@/lib/fc-sandbox/alerting";
import { getFcReadiness, getFcServerConfig } from "@/lib/fc-sandbox/config";
import {
  assertTransition,
  checkpointDigest,
  evidenceReferenceDigest,
  isExpired,
  makeEvent,
} from "@/lib/fc-sandbox/lifecycle";
import { getFcSandboxProvider } from "@/lib/fc-sandbox/provider";
import {
  appendRunEvent,
  consumeRunQuota,
  createRun,
  getCapabilityEvidence,
  getEvents,
  getExpiredRuns,
  getRun,
  toPublicRun,
  transitionRun,
} from "@/lib/fc-sandbox/repository";
import {
  hashToken,
  randomOpaqueToken,
  requestFingerprint,
  safeTokenMatch,
} from "@/lib/fc-sandbox/security";
import { emitFcTelemetry } from "@/lib/fc-sandbox/telemetry";
import type {
  FcCapabilityEvidence,
  FcPublicRun,
  FcReadiness,
  FcRunAccess,
  FcRunEvent,
  FcRunRecord,
  FcRunStatus,
} from "@/lib/fc-sandbox/types";

const RUN_TTL_MS = 60 * 60 * 1_000;
const RUNS_PER_HOUR = 4;

export class FcServiceError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
  }
}

class FcFailureDrillError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

async function nextSequence(runId: string) {
  const events = await getEvents(runId);
  return (events.at(-1)?.sequence ?? 0) + 1;
}

async function advance(
  run: FcRunRecord,
  to: FcRunStatus,
  patch: Omit<Parameters<typeof transitionRun>[2], "status">,
  event: Omit<
    FcRunEvent,
    "sequence" | "stage" | "evidenceClass" | "occurredAt" | "durationMs"
  > & {
    occurredAt?: string;
    durationMs?: number | null;
  },
) {
  assertTransition(run.status, to);
  const occurredAt = event.occurredAt ?? new Date().toISOString();
  const updated = await transitionRun(
    run.id,
    run.status,
    { ...patch, status: to },
    makeEvent({
      ...event,
      sequence: await nextSequence(run.id),
      stage: to,
      evidenceClass: run.evidenceClass,
      occurredAt,
    }),
  );
  if (!updated) {
    throw new FcServiceError(
      "This run changed before the operation completed.",
      409,
      "STALE_RUN",
    );
  }
  emitFcTelemetry("info", {
    event: event.eventType,
    runId: updated.id,
    traceId: updated.traceId,
    stage: to,
    provider: updated.provider,
    outcome: "succeeded",
    ...(event.durationMs === null || event.durationMs === undefined
      ? {}
      : { durationMs: event.durationMs }),
  });
  void evaluateAlertRules(updated, {
    eventType: event.eventType,
    stage: to,
    metadata: event.metadata ?? {},
    durationMs: event.durationMs,
  });
  return updated;
}

async function failRun(run: FcRunRecord, code: string) {
  if (run.status === "completed" || run.status === "failed") return run;
  try {
    return (
      (await advance(
        run,
        "failed",
        {
          safeErrorCode: code,
          completedAt: new Date().toISOString(),
          sandboxState: "ERROR",
        },
        {
          eventType: "run.failed",
          summary: "The run stopped safely. No provider error details were exposed.",
          durationMs: null,
          checkpointHash: run.checkpointHash,
          metadata: { code },
        },
      )) ?? run
    );
  } catch {
    void evaluateAlertRules(
      { ...run, status: "failed", safeErrorCode: code },
      {
        eventType: "run.failed",
        stage: "failed",
        metadata: { code },
      },
    );
    return run;
  }
}

async function recordCleanupFailure(run: FcRunRecord) {
  emitFcTelemetry("warn", {
    event: "sandbox.cleanup_failed",
    runId: run.id,
    traceId: run.traceId,
    stage: run.status,
    provider: run.provider,
    outcome: "failed",
    errorCode: "CLEANUP_FAILED",
  });
  const cleanupEvent = {
    eventType: "sandbox.cleanup_failed" as const,
    stage: run.status,
    metadata: { code: "CLEANUP_FAILED" as const },
  };
  try {
    await appendRunEvent(
      run.id,
      makeEvent({
        sequence: await nextSequence(run.id),
        eventType: cleanupEvent.eventType,
        stage: cleanupEvent.stage,
        summary:
          "Sandbox cleanup needs operator follow-up; the exact run remains traceable.",
        evidenceClass: run.evidenceClass,
        checkpointHash: run.checkpointHash,
        metadata: cleanupEvent.metadata,
      }),
    );
  } catch {
    emitFcTelemetry("error", {
      event: "sandbox.cleanup_trace_failed",
      runId: run.id,
      traceId: run.traceId,
      stage: run.status,
      provider: run.provider,
      outcome: "failed",
      errorCode: "CLEANUP_TRACE_FAILED",
    });
  }
  void evaluateAlertRules(run, cleanupEvent);
}

function providerContext(run: FcRunRecord) {
  if (!run.checkpointHash) {
    throw new Error("The run has no checkpoint digest.");
  }
  return {
    runId: run.id,
    traceId: run.traceId,
    checkpointHash: run.checkpointHash,
  };
}

function cleanupProviderContext(run: FcRunRecord) {
  return {
    runId: run.id,
    traceId: run.traceId,
    checkpointHash: run.checkpointHash ?? "0".repeat(64),
  };
}

export async function startFcRun(request: Request): Promise<FcRunAccess> {
  const now = new Date();
  const fingerprint = requestFingerprint(request);
  const quota = await consumeRunQuota(
    fingerprint,
    new Date(now.getTime() - 60 * 60 * 1_000).toISOString(),
    RUNS_PER_HOUR,
  );
  if (!quota.allowed) {
    throw new FcServiceError(
      "The public demo limit has been reached. Try again in one hour.",
      429,
      "RATE_LIMITED",
      quota.retryAfterSeconds,
    );
  }

  const provider = getFcSandboxProvider();
  const accessToken = randomOpaqueToken();
  const approvalNonce = randomOpaqueToken(24);
  const id = randomUUID();
  const traceId = randomUUID();
  const timestamp = now.toISOString();
  const run: FcRunRecord = {
    id,
    traceId,
    publicTokenHash: hashToken(accessToken),
    approvalNonceHash: hashToken(approvalNonce),
    requestFingerprintHash: fingerprint,
    scenario: "retail_launch",
    provider: provider.mode,
    evidenceClass: provider.evidenceClass,
    status: "created",
    sandboxId: null,
    sandboxState: null,
    checkpointHash: null,
    checkpointVersion: 0,
    result: null,
    safeErrorCode: null,
    requestedAt: timestamp,
    pausedAt: null,
    resumedAt: null,
    completedAt: null,
    activeMs: 0,
    hibernatedMs: 0,
    wakeLatencyMs: null,
    expiresAt: new Date(now.getTime() + RUN_TTL_MS).toISOString(),
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await createRun(
    run,
    makeEvent({
      sequence: 1,
      eventType: "run.created",
      stage: "created",
      summary:
        provider.mode === "agentrun"
          ? "A durable run record was created for the AgentRun lifecycle."
          : "A local lifecycle demonstration was created; it is not cloud evidence.",
      evidenceClass: provider.evidenceClass,
      occurredAt: timestamp,
      metadata: { provider: provider.mode },
    }),
  );
  emitFcTelemetry("info", {
    event: "run.created",
    runId: run.id,
    traceId: run.traceId,
    stage: run.status,
    provider: run.provider,
    outcome: "succeeded",
  });

  return {
    run: await toPublicRun(run),
    accessToken,
    approvalNonce,
  };
}

export async function prepareFcRun(
  runId: string,
  accessToken: string,
): Promise<FcPublicRun> {
  let current = await getRun(runId);
  if (!current || !safeTokenMatch(accessToken, current.publicTokenHash)) {
    throw new FcServiceError("Run not found.", 404, "RUN_NOT_FOUND");
  }
  if (isExpired(current)) {
    throw new FcServiceError("This demo run has expired.", 410, "RUN_EXPIRED");
  }
  if (current.status !== "created") {
    throw new FcServiceError(
      "This run has already started preparation.",
      409,
      "STALE_RUN",
    );
  }

  const provider = getFcSandboxProvider();
  if (provider.mode !== current.provider) {
    throw new FcServiceError(
      "The configured provider changed during this run.",
      409,
      "PROVIDER_CHANGED",
    );
  }

  const initialCheckpoint = checkpointDigest(
    current.id,
    current.traceId,
    1,
    "awaiting_approval",
  );
  current = await advance(
    current,
    "provisioning",
    {},
    {
      eventType: "sandbox.provisioning",
      summary: "The run atomically claimed sandbox provisioning.",
      checkpointHash: null,
      metadata: { provider: provider.mode },
    },
  );

  try {
    const created = await provider.create({
      runId: current.id,
      traceId: current.traceId,
      checkpointHash: initialCheckpoint,
    });
    current = await advance(
      current,
      "validating",
      {
        sandboxId: created.sandboxId,
        sandboxState: created.state,
        activeMs: created.durationMs,
      },
      {
        eventType: "sandbox.created",
        summary:
          provider.mode === "agentrun"
            ? "AgentRun created an isolated sandbox from the pinned template."
            : "The local adapter created an isolated lifecycle placeholder.",
        durationMs: created.durationMs,
        checkpointHash: null,
        metadata: {
          state: created.state,
          sessionIdDigest: created.sessionId
            ? evidenceReferenceDigest(created.sessionId)
            : null,
          dynamicMountIdDigest: created.dynamicMountId
            ? evidenceReferenceDigest(created.dynamicMountId)
            : null,
        },
      },
    );

    const validation = await provider.validate(
      {
        runId: current.id,
        traceId: current.traceId,
        checkpointHash: initialCheckpoint,
      },
      created.sandboxId,
    );
    if (validation.checkpointHash !== initialCheckpoint) {
      throw new Error("The provider returned a different checkpoint digest.");
    }
    current = await advance(
      current,
      "awaiting_approval",
      {
        sandboxState: "RUNNING",
        checkpointHash: initialCheckpoint,
        checkpointVersion: 1,
        activeMs: current.activeMs + validation.durationMs,
      },
      {
        eventType: "creative.validated",
        summary:
          "The sample creative passed the bounded input and policy checks.",
        durationMs: validation.durationMs,
        checkpointHash: initialCheckpoint,
        metadata: {
          checkpointVersion: 1,
          creativeDigest: validation.creativeDigest,
          dynamicMountDigestBefore:
            validation.dynamicMountDigest ?? null,
        },
      },
    );

    current = await advance(
      current,
      "pausing",
      { sandboxState: "PAUSING" },
      {
        eventType: "approval.requested",
        summary:
          "Execution stopped at the human approval boundary before TRIBE scoring.",
        checkpointHash: initialCheckpoint,
        metadata: { approvalRequired: true },
      },
    );

    const paused = await provider.pause(
      providerContext(current),
      created.sandboxId,
    );
    const pausedAt = new Date().toISOString();
    current = await advance(
      current,
      "hibernated",
      {
        sandboxState: paused.state,
        pausedAt,
        activeMs: current.activeMs + paused.durationMs,
      },
      {
        eventType: "sandbox.paused",
        summary:
          provider.mode === "agentrun"
            ? "AgentRun confirmed the sandbox is paused at the approval boundary."
            : "The adapter entered a local paused demonstration state.",
        durationMs: paused.durationMs,
        checkpointHash: initialCheckpoint,
        metadata: {
          state: paused.state,
          snapshotIdDigest: paused.snapshotId
            ? evidenceReferenceDigest(paused.snapshotId)
            : null,
          hibernationMode: paused.hibernationMode ?? null,
          computeBillingClaim:
            provider.mode === "agentrun"
              ? "requires_evidence_harness"
              : "not_measured",
        },
        occurredAt: pausedAt,
      },
    );
  } catch {
    emitFcTelemetry("error", {
      event: "run.preparation_failed",
      runId: current.id,
      traceId: current.traceId,
      stage: current.status,
      provider: current.provider,
      outcome: "failed",
      errorCode: "PREPARATION_FAILED",
    });
    current = await failRun(current, "PREPARATION_FAILED");
    if (current.sandboxId) {
      try {
        await provider.stop(
          {
            runId: current.id,
            traceId: current.traceId,
            checkpointHash: initialCheckpoint,
          },
          current.sandboxId,
        );
      } catch {
        await recordCleanupFailure(current);
      }
    }
  }

  return toPublicRun(current);
}

export async function readFcRun(runId: string, accessToken: string) {
  const run = await getRun(runId);
  if (!run || !safeTokenMatch(accessToken, run.publicTokenHash)) {
    throw new FcServiceError("Run not found.", 404, "RUN_NOT_FOUND");
  }
  if (isExpired(run)) {
    throw new FcServiceError("This demo run has expired.", 410, "RUN_EXPIRED");
  }
  return toPublicRun(run);
}

export async function approveFcRun(
  runId: string,
  accessToken: string,
  approvalNonce: string,
): Promise<FcPublicRun> {
  let current = await getRun(runId);
  if (!current || !safeTokenMatch(accessToken, current.publicTokenHash)) {
    throw new FcServiceError("Run not found.", 404, "RUN_NOT_FOUND");
  }
  if (isExpired(current)) {
    throw new FcServiceError("This demo run has expired.", 410, "RUN_EXPIRED");
  }
  if (
    current.status !== "hibernated" ||
    !safeTokenMatch(approvalNonce, current.approvalNonceHash)
  ) {
    throw new FcServiceError(
      "This approval is stale or has already been used.",
      409,
      "STALE_APPROVAL",
    );
  }
  if (!current.sandboxId || !current.checkpointHash || !current.pausedAt) {
    throw new FcServiceError(
      "The paused run is missing lifecycle state.",
      409,
      "INVALID_RUN_STATE",
    );
  }
  const sandboxId = current.sandboxId;

  const provider = getFcSandboxProvider();
  if (provider.mode !== current.provider) {
    throw new FcServiceError(
      "The configured provider changed during this run.",
      409,
      "PROVIDER_CHANGED",
    );
  }

  try {
    const resumedAt = new Date().toISOString();
    const hibernatedMs = Math.max(
      0,
      Date.parse(resumedAt) - Date.parse(current.pausedAt),
    );
    current = await advance(
      current,
      "resuming",
      {
        sandboxState: "RESUMING",
        resumedAt,
        hibernatedMs,
        approvalNonceHash: hashToken(randomOpaqueToken()),
      },
      {
        eventType: "approval.accepted",
        summary:
          "The one-time approval was accepted and invalidated before resume.",
        checkpointHash: current.checkpointHash,
        metadata: { oneTimeNonce: true },
        occurredAt: resumedAt,
      },
    );

    const resumed = await provider.resume(
      providerContext(current),
      sandboxId,
    );
    if (
      getFcServerConfig().failureMode === "resume_checkpoint_mismatch"
    ) {
      emitFcTelemetry("warn", {
        event: "failure_drill.resume_checkpoint_mismatch",
        runId: current.id,
        traceId: current.traceId,
        stage: current.status,
        provider: current.provider,
        outcome: "started",
        errorCode: "FAULT_INJECTED_CHECKPOINT_MISMATCH",
      });
      throw new FcFailureDrillError(
        "FAULT_INJECTED_CHECKPOINT_MISMATCH",
      );
    }
    if (resumed.checkpointHash !== current.checkpointHash) {
      throw new Error("Checkpoint continuity verification failed.");
    }
    current = await advance(
      current,
      "scoring",
      {
        sandboxState: resumed.state,
        wakeLatencyMs: resumed.wakeLatencyMs,
        activeMs: current.activeMs + resumed.durationMs,
      },
      {
        eventType: "sandbox.resumed",
        summary:
          "The sandbox resumed with the same checkpoint digest and entered scoring.",
        durationMs: resumed.durationMs,
        checkpointHash: resumed.checkpointHash,
        metadata: {
          state: resumed.state,
          continuityVerified: true,
          wakeLatencyMs: resumed.wakeLatencyMs,
          dynamicMountDigest: resumed.dynamicMountDigest ?? null,
        },
      },
    );

    const scored = await provider.score(
      providerContext(current),
      sandboxId,
    );
    const completedAt = new Date().toISOString();
    current = await advance(
      current,
      "completed",
      {
        result: scored.result,
        completedAt,
        sandboxState: "STOPPING",
        activeMs: current.activeMs + scored.durationMs,
      },
      {
        eventType: "score.completed",
        summary:
          scored.result.source === "tribe_v2"
            ? "TRIBE v2 returned a real prediction through the private scoring path."
            : "The local adapter returned a clearly labeled fixture result.",
        durationMs: scored.durationMs,
        checkpointHash: current.checkpointHash,
        metadata: { source: scored.result.source },
        occurredAt: completedAt,
      },
    );

    try {
      await provider.stop(providerContext(current), sandboxId);
      await appendRunEvent(
        current.id,
        makeEvent({
          sequence: await nextSequence(current.id),
          eventType: "sandbox.stopped",
          stage: "completed",
          summary: "The sandbox cleanup request completed.",
          evidenceClass: current.evidenceClass,
          checkpointHash: current.checkpointHash,
          metadata: { cleanup: true },
        }),
      );
      emitFcTelemetry("info", {
        event: "sandbox.stopped",
        runId: current.id,
        traceId: current.traceId,
        stage: current.status,
        provider: current.provider,
        outcome: "succeeded",
      });
    } catch {
      await recordCleanupFailure(current);
    }
  } catch (error) {
    const failureCode =
      error instanceof FcFailureDrillError
        ? error.code
        : current.status === "scoring"
          ? "SCORING_FAILED"
          : "RESUME_FAILED";
    emitFcTelemetry("error", {
      event: "run.approval_path_failed",
      runId: current.id,
      traceId: current.traceId,
      stage: current.status,
      provider: current.provider,
      outcome: "failed",
      errorCode: failureCode,
    });
    current = await failRun(current, failureCode);
    try {
      await provider.stop(providerContext(current), sandboxId);
    } catch {
      await recordCleanupFailure(current);
    }
  }

  return toPublicRun(current);
}

export async function appendProviderTrace(input: {
  runId: string;
  summary: string;
  durationMs: number | null;
  metadata: Record<string, string | number | boolean | null>;
}) {
  const run = await getRun(input.runId);
  if (!run) return false;
  return appendRunEvent(
    run.id,
    makeEvent({
      sequence: await nextSequence(run.id),
      eventType: "provider.trace",
      stage: run.status,
      summary: input.summary,
      evidenceClass: run.evidenceClass,
      checkpointHash: run.checkpointHash,
      durationMs: input.durationMs,
      metadata: input.metadata,
    }),
  );
}

export async function reapExpiredFcRuns() {
  const expiredRuns = await getExpiredRuns(new Date().toISOString());
  const provider = getFcSandboxProvider();
  let cleaned = 0;
  let followUpRequired = 0;

  for (const run of expiredRuns) {
    const claimed = await failRun(run, "RUN_EXPIRED");
    if (claimed.status !== "failed" || !claimed.sandboxId) continue;

    if (claimed.provider !== provider.mode) {
      followUpRequired += 1;
      await recordCleanupFailure(claimed);
      continue;
    }

    try {
      await provider.stop(
        cleanupProviderContext(claimed),
        claimed.sandboxId,
      );
      cleaned += 1;
      await appendRunEvent(
        claimed.id,
        makeEvent({
          sequence: await nextSequence(claimed.id),
          eventType: "sandbox.expired_cleanup",
          stage: "failed",
          summary: "The expired sandbox was stopped by the bounded reaper.",
          evidenceClass: claimed.evidenceClass,
          checkpointHash: claimed.checkpointHash,
          metadata: { cleanup: true, reason: "RUN_EXPIRED" },
        }),
      );
      emitFcTelemetry("info", {
        event: "sandbox.expired_cleanup",
        runId: claimed.id,
        traceId: claimed.traceId,
        stage: claimed.status,
        provider: claimed.provider,
        outcome: "succeeded",
      });
    } catch {
      followUpRequired += 1;
      await recordCleanupFailure(claimed);
    }
  }

  return {
    inspected: expiredRuns.length,
    cleaned,
    followUpRequired,
  };
}

export async function getFcProof(): Promise<{
  readiness: FcReadiness;
  capabilities: FcCapabilityEvidence[];
}> {
  const readiness = getFcReadiness();
  const config = getFcServerConfig();
  const configured = new Set<string>();
  if (readiness.liveProvider) {
    configured.add("sandbox_lifecycle");
    configured.add("hibernation_wakeup");
    configured.add("stateful_sessions");
    configured.add("observability");
  }
  if (config.alertWebhookUrl) {
    configured.add("observability");
  }
  if (
    readiness.liveProvider &&
    readiness.durableStore &&
    readiness.callbackVerification
  ) {
    configured.add("cost_efficiency");
  }
  const capabilities = await getCapabilityEvidence(configured);
  return {
    readiness,
    capabilities: capabilities.map((capability) => {
      if (capability.capability !== "observability" || !config.alertWebhookUrl) {
        return capability;
      }
      if (capability.status === "verified") {
        return {
          ...capability,
          metrics: {
            ...capability.metrics,
            alertWebhookConfigured: true,
          },
        };
      }
      return {
        ...capability,
        metrics: {
          ...capability.metrics,
          alertWebhookConfigured: true,
          alertRules: "RUN_FAILED,SLA_BREACH,CLEANUP_FAILED",
          wakeLatencySlaMs: 3_000,
        },
        note:
          "Alert webhook and RUN_FAILED/SLA_BREACH/CLEANUP_FAILED rules are configured; a live SLS failure drill is still required for verified evidence.",
      };
    }),
  };
}

export function getFcCallbackSecret() {
  return getFcServerConfig().webhookSecret;
}
