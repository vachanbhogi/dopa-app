import type {
  FcProviderMode,
  FcRunStatus,
} from "@/lib/fc-sandbox/types";

export type FcTelemetryLevel = "info" | "warn" | "error";

export type FcTelemetryInput = {
  event: string;
  runId?: string;
  traceId?: string;
  stage?: FcRunStatus;
  provider?: FcProviderMode;
  outcome?: "started" | "succeeded" | "failed";
  durationMs?: number;
  errorCode?: string;
  providerRequestId?: string;
};

export function formatFcTelemetry(
  level: FcTelemetryLevel,
  input: FcTelemetryInput,
  observedAt = new Date().toISOString(),
) {
  return JSON.stringify({
    schema: "dopa.fc-sandbox.telemetry.v1",
    observedAt,
    level,
    ...input,
  });
}

export function emitFcTelemetry(
  level: FcTelemetryLevel,
  input: FcTelemetryInput,
) {
  const line = formatFcTelemetry(level, input);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
}
