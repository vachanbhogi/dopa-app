import { makeEvent } from "@/lib/fc-sandbox/lifecycle";
import { emitFcTelemetry } from "@/lib/fc-sandbox/telemetry";
import type {
  FcProviderMode,
  FcRunEvent,
  FcRunRecord,
  FcRunStatus,
} from "@/lib/fc-sandbox/types";

export const WAKE_LATENCY_SLA_MS = 3_000;

export const FC_ALERT_RULES = [
  "RUN_FAILED",
  "SLA_BREACH",
  "CLEANUP_FAILED",
] as const;

export type FcAlertRule = (typeof FC_ALERT_RULES)[number];

export type FcAlertSeverity = "error" | "warn";

export type FcAlertEventInput = Pick<
  FcRunEvent,
  "eventType" | "stage" | "metadata"
> & {
  durationMs?: number | null;
};

export type FcAlert = {
  schema: "dopa.fc-sandbox.alert.v1";
  rule: FcAlertRule;
  severity: FcAlertSeverity;
  runId: string;
  traceId: string;
  stage: FcRunStatus;
  provider: FcProviderMode;
  code: string;
  message: string;
  observedAt: string;
  wakeLatencyMs: number | null;
};

function codeFrom(run: FcRunRecord, event: FcAlertEventInput) {
  const fromMetadata = event.metadata?.code;
  if (typeof fromMetadata === "string" && fromMetadata.trim()) {
    return fromMetadata.trim();
  }
  if (run.safeErrorCode?.trim()) return run.safeErrorCode.trim();
  return event.eventType;
}

function mentionsCheckpointMismatch(code: string) {
  return code.includes("CHECKPOINT_MISMATCH");
}

function wakeLatencyMsFrom(run: FcRunRecord, event: FcAlertEventInput) {
  const fromMetadata = event.metadata?.wakeLatencyMs;
  if (typeof fromMetadata === "number" && Number.isFinite(fromMetadata)) {
    return fromMetadata;
  }
  return run.wakeLatencyMs;
}

export function matchAlertRules(
  run: FcRunRecord,
  event: FcAlertEventInput,
): FcAlertRule[] {
  const matched: FcAlertRule[] = [];
  const code = codeFrom(run, event);
  const wakeLatencyMs = wakeLatencyMsFrom(run, event);

  if (
    run.status === "failed" ||
    mentionsCheckpointMismatch(code) ||
    event.eventType === "run.failed"
  ) {
    matched.push("RUN_FAILED");
  }

  if (
    typeof wakeLatencyMs === "number" &&
    wakeLatencyMs > WAKE_LATENCY_SLA_MS
  ) {
    matched.push("SLA_BREACH");
  }

  if (
    event.eventType === "sandbox.cleanup_failed" ||
    code === "CLEANUP_FAILED"
  ) {
    matched.push("CLEANUP_FAILED");
  }

  return matched;
}

function severityFor(rule: FcAlertRule): FcAlertSeverity {
  return rule === "RUN_FAILED" ? "error" : "warn";
}

function messageFor(
  rule: FcAlertRule,
  code: string,
  wakeLatencyMs: number | null,
) {
  switch (rule) {
    case "RUN_FAILED":
      return mentionsCheckpointMismatch(code)
        ? "Checkpoint continuity failed; the run stopped safely."
        : "An FC sandbox run entered the failed state.";
    case "SLA_BREACH":
      return `Wake latency ${wakeLatencyMs ?? "unknown"}ms exceeded the ${WAKE_LATENCY_SLA_MS}ms SLA.`;
    case "CLEANUP_FAILED":
      return "Sandbox cleanup failed and needs operator follow-up.";
  }
}

export function buildAlert(
  run: FcRunRecord,
  event: FcAlertEventInput,
  rule: FcAlertRule,
  observedAt = new Date().toISOString(),
): FcAlert {
  const code = codeFrom(run, event);
  const wakeLatencyMs = wakeLatencyMsFrom(run, event);
  return {
    schema: "dopa.fc-sandbox.alert.v1",
    rule,
    severity: severityFor(rule),
    runId: run.id,
    traceId: run.traceId,
    stage: run.status,
    provider: run.provider,
    code,
    message: messageFor(rule, code, wakeLatencyMs),
    observedAt,
    wakeLatencyMs,
  };
}

function postAlertWebhook(alert: FcAlert, webhookUrl: string) {
  void fetch(webhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(alert),
  }).catch(() => {
    emitFcTelemetry("warn", {
      event: "alert.webhook_failed",
      runId: alert.runId,
      traceId: alert.traceId,
      stage: alert.stage,
      provider: alert.provider,
      outcome: "failed",
      errorCode: "ALERT_WEBHOOK_FAILED",
    });
  });
}

async function recordAlertLedger(run: FcRunRecord, alert: FcAlert) {
  try {
    const { appendRunEvent, getEvents } = await import(
      "@/lib/fc-sandbox/repository"
    );
    const events = await getEvents(run.id);
    const sequence = (events.at(-1)?.sequence ?? 0) + 1;
    await appendRunEvent(
      run.id,
      makeEvent({
        sequence,
        eventType: "alert.fired",
        stage: run.status,
        summary: `Alert ${alert.rule} recorded for operator follow-up.`,
        evidenceClass: run.evidenceClass,
        checkpointHash: run.checkpointHash,
        occurredAt: alert.observedAt,
        metadata: {
          rule: alert.rule,
          code: alert.code,
          severity: alert.severity,
          wakeLatencyMs: alert.wakeLatencyMs,
        },
      }),
    );
  } catch {
    emitFcTelemetry("warn", {
      event: "alert.ledger_failed",
      runId: run.id,
      traceId: run.traceId,
      stage: run.status,
      provider: run.provider,
      outcome: "failed",
      errorCode: "ALERT_LEDGER_FAILED",
    });
  }
}

/**
 * Evaluate alert rules for a lifecycle event. Telemetry and ledger writes are
 * awaited; webhook delivery is fire-and-forget. Never throws into callers.
 */
export async function evaluateAlertRules(
  run: FcRunRecord,
  event: FcAlertEventInput,
): Promise<FcAlert[]> {
  try {
    const rules = matchAlertRules(run, event);
    if (rules.length === 0) return [];

    const observedAt = new Date().toISOString();
    const alerts = rules.map((rule) =>
      buildAlert(run, event, rule, observedAt),
    );
    const { getFcServerConfig } = await import("@/lib/fc-sandbox/config");
    const webhookUrl = getFcServerConfig().alertWebhookUrl;

    for (const alert of alerts) {
      emitFcTelemetry(alert.severity, {
        event: `alert.${alert.rule.toLowerCase()}`,
        runId: alert.runId,
        traceId: alert.traceId,
        stage: alert.stage,
        provider: alert.provider,
        outcome: "failed",
        errorCode: alert.rule,
        ...(typeof alert.wakeLatencyMs === "number"
          ? { durationMs: alert.wakeLatencyMs }
          : {}),
      });
      if (webhookUrl) {
        postAlertWebhook(alert, webhookUrl);
      }
      await recordAlertLedger(run, alert);
    }

    return alerts;
  } catch {
    emitFcTelemetry("warn", {
      event: "alert.evaluation_failed",
      runId: run.id,
      traceId: run.traceId,
      stage: run.status,
      provider: run.provider,
      outcome: "failed",
      errorCode: "ALERT_EVALUATION_FAILED",
    });
    return [];
  }
}
