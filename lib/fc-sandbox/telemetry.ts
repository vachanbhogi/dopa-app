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

function shipTelemetryToSls(
  level: FcTelemetryLevel,
  input: FcTelemetryInput,
  observedAt: string,
) {
  void import("@/lib/fc-sandbox/sls")
    .then(({ postLogsToSls, telemetryFieldsToSlsContents }) => {
      const contents = telemetryFieldsToSlsContents(
        level,
        input as Record<string, unknown>,
        observedAt,
      );
      const time = Math.floor(Date.parse(observedAt) / 1000) || Math.floor(Date.now() / 1000);
      return postLogsToSls([{ time, contents }]);
    })
    .catch(() => {
      // SLS shipping must never surface into callers.
    });
}

export function emitFcTelemetry(
  level: FcTelemetryLevel,
  input: FcTelemetryInput,
) {
  const observedAt = new Date().toISOString();
  const line = formatFcTelemetry(level, input, observedAt);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.info(line);
  }
  shipTelemetryToSls(level, input, observedAt);
}
