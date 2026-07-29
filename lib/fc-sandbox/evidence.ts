export type FcProbeResult = {
  passed: boolean;
  metrics: Record<string, string | number | boolean | null>;
  evidence?: Record<string, string | number | boolean | null>;
  note: string;
};

export type FcCostCalculation = {
  keptActiveCostCny: number;
  hibernatedCostCny: number;
  savedCny: number;
  savingsPercent: number;
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function primitiveRecord(
  value: unknown,
  field: string,
): Record<string, string | number | boolean | null> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error(`Evidence ${field} must be an object.`);
  }
  const result: Record<string, string | number | boolean | null> = {};
  const entries = Object.entries(value);
  if (entries.length > 50) {
    throw new Error(`Evidence ${field} has too many fields.`);
  }
  for (const [key, item] of entries) {
    if (
      !key ||
      key.length > 80 ||
      !(
        item === null ||
        typeof item === "string" ||
        typeof item === "number" ||
        typeof item === "boolean"
      ) ||
      (typeof item === "string" && item.length > 2_048) ||
      (typeof item === "number" && !Number.isFinite(item))
    ) {
      throw new Error(`Evidence ${field} contains an invalid field.`);
    }
    result[key] = item;
  }
  return result;
}

export function parseProbeResult(value: unknown): FcProbeResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Evidence gateway returned an invalid result.");
  }
  const record = value as Record<string, unknown>;
  if (
    typeof record.passed !== "boolean" ||
    typeof record.note !== "string" ||
    !record.note.trim() ||
    record.note.length > 500
  ) {
    throw new Error("Evidence gateway returned an invalid result.");
  }
  return {
    passed: record.passed,
    metrics: primitiveRecord(record.metrics, "metrics"),
    ...(record.evidence === undefined
      ? {}
      : { evidence: primitiveRecord(record.evidence, "evidence") }),
    note: record.note,
  };
}

function finiteNumber(
  value: string | number | boolean | null | undefined,
): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nonEmptyString(
  value: string | number | boolean | null | undefined,
): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function roundCurrency(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function proveIsolation(result: FcProbeResult) {
  const evidence = result.evidence ?? {};
  return (
    result.passed &&
    evidence.isolationLevel === "virtual_machine" &&
    evidence.computeDenied === true &&
    evidence.networkDenied === true &&
    evidence.storageDenied === true &&
    evidence.separateSessionIds === true &&
    evidence.cleanupVerified === true
  );
}

export function proveElasticity(
  result: FcProbeResult,
  requestedCreates: number,
) {
  const attempted = finiteNumber(result.metrics.attempted);
  const successful = finiteNumber(result.metrics.successful);
  const failed = finiteNumber(result.metrics.failed);
  const creationRate = finiteNumber(result.metrics.creationRatePerMinute);
  const peak = finiteNumber(result.metrics.peakPerSecond);
  const successRate = finiteNumber(result.metrics.successRatePercent);
  const p50 = finiteNumber(result.metrics.p50CreationLatencyMs);
  const p95 = finiteNumber(result.metrics.p95CreationLatencyMs);
  return (
    result.passed &&
    requestedCreates >= 100_000 &&
    attempted !== null &&
    attempted >= requestedCreates &&
    successful !== null &&
    successful >= 0 &&
    failed !== null &&
    failed >= 0 &&
    successful + failed === attempted &&
    creationRate !== null &&
    creationRate >= 100_000 &&
    peak !== null &&
    peak >= 5_000 &&
    successRate !== null &&
    successRate >= 99 &&
    p50 !== null &&
    p50 >= 0 &&
    p95 !== null &&
    p95 >= p50
  );
}

export function proveCompatibility(result: FcProbeResult) {
  const evidence = result.evidence ?? {};
  const sourceDigest = nonEmptyString(evidence.sourceDigest);
  const agentRunDigest = nonEmptyString(evidence.agentRunOutputDigest);
  const e2bDigest = nonEmptyString(evidence.e2bOutputDigest);
  return (
    result.passed &&
    sourceDigest !== null &&
    SHA256_PATTERN.test(sourceDigest) &&
    agentRunDigest !== null &&
    SHA256_PATTERN.test(agentRunDigest) &&
    agentRunDigest === e2bDigest &&
    nonEmptyString(evidence.runtimeVersion) !== null &&
    nonEmptyString(evidence.e2bSdkVersion) !== null &&
    nonEmptyString(evidence.agentRunEndpoint) !== null &&
    nonEmptyString(evidence.e2bEndpoint) !== null &&
    evidence.separateEndpoints === true &&
    evidence.normalizedOutput === true
  );
}

export function proveObservability(result: FcProbeResult) {
  const evidence = result.evidence ?? {};
  const traceId = nonEmptyString(evidence.traceId);
  const recoveryMs = finiteNumber(result.metrics.recoveryMs);
  const traceSpans = finiteNumber(result.metrics.traceSpans);
  return (
    result.passed &&
    traceId !== null &&
    UUID_PATTERN.test(traceId) &&
    nonEmptyString(evidence.slsProject) !== null &&
    nonEmptyString(evidence.slsLogstore) !== null &&
    nonEmptyString(evidence.slsQuery) !== null &&
    nonEmptyString(evidence.alertRuleId) !== null &&
    nonEmptyString(evidence.metricName) !== null &&
    nonEmptyString(evidence.failureEventId) !== null &&
    nonEmptyString(evidence.rootCause) !== null &&
    evidence.alertFired === true &&
    recoveryMs !== null &&
    recoveryMs >= 0 &&
    traceSpans !== null &&
    traceSpans >= 4
  );
}

export function calculateHibernationSavings(input: {
  waitHours: number;
  activeHourlyCny: number;
  hibernatedHourlyCny: number;
  requestAndSnapshotCny: number;
}): FcCostCalculation {
  for (const [name, value] of Object.entries(input)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(`${name} must be a non-negative finite number.`);
    }
  }
  if (input.waitHours <= 0 || input.activeHourlyCny <= 0) {
    throw new Error("Wait time and active hourly price must be greater than zero.");
  }

  const keptActiveCostCny = input.waitHours * input.activeHourlyCny;
  const hibernatedCostCny =
    input.waitHours * input.hibernatedHourlyCny +
    input.requestAndSnapshotCny;
  const savedCny = keptActiveCostCny - hibernatedCostCny;
  return {
    keptActiveCostCny: roundCurrency(keptActiveCostCny),
    hibernatedCostCny: roundCurrency(hibernatedCostCny),
    savedCny: roundCurrency(savedCny),
    savingsPercent:
      Math.round((savedCny / keptActiveCostCny) * 10_000) / 100,
  };
}

export function proveCostEfficiency(result: FcProbeResult) {
  const evidence = result.evidence ?? {};
  const waitHours = finiteNumber(result.metrics.waitHours);
  const activeHourlyCny = finiteNumber(result.metrics.activeHourlyCny);
  const hibernatedHourlyCny = finiteNumber(
    result.metrics.hibernatedHourlyCny,
  );
  const requestAndSnapshotCny = finiteNumber(
    result.metrics.requestAndSnapshotCny,
  );
  const reportedSavings = finiteNumber(result.metrics.savingsPercent);
  const billDigest = nonEmptyString(evidence.billExportDigest);
  if (
    !result.passed ||
    waitHours === null ||
    activeHourlyCny === null ||
    hibernatedHourlyCny === null ||
    requestAndSnapshotCny === null ||
    reportedSavings === null ||
    billDigest === null ||
    !SHA256_PATTERN.test(billDigest) ||
    evidence.currency !== "CNY" ||
    nonEmptyString(evidence.billingPeriod) === null ||
    nonEmptyString(evidence.pricingSource) === null
  ) {
    return false;
  }

  try {
    const calculated = calculateHibernationSavings({
      waitHours,
      activeHourlyCny,
      hibernatedHourlyCny,
      requestAndSnapshotCny,
    });
    return (
      calculated.savedCny > 0 &&
      Math.abs(calculated.savingsPercent - reportedSavings) <= 0.01
    );
  } catch {
    return false;
  }
}

export function validateStressAuthorization(input: {
  requested: boolean;
  targetCreates: number;
  acknowledgement: string | undefined;
  maximumSpendCny: number;
}) {
  if (!input.requested) {
    return {
      authorized: false,
      reason: "Elasticity probe skipped because --stress was not supplied.",
    };
  }
  if (
    !Number.isSafeInteger(input.targetCreates) ||
    input.targetCreates < 100_000 ||
    input.targetCreates > 100_000
  ) {
    return {
      authorized: false,
      reason: "FC_ELASTICITY_TARGET must be exactly 100000 for the scored run.",
    };
  }
  if (input.acknowledgement !== "I_ACCEPT_ALIBABA_CLOUD_CHARGES") {
    return {
      authorized: false,
      reason: "FC_STRESS_ACK does not authorize Alibaba Cloud charges.",
    };
  }
  if (
    !Number.isFinite(input.maximumSpendCny) ||
    input.maximumSpendCny <= 0
  ) {
    return {
      authorized: false,
      reason: "FC_STRESS_MAX_SPEND_CNY must be a positive approved cap.",
    };
  }
  return {
    authorized: true,
    reason: "The scored elasticity probe has an explicit target and spend cap.",
  };
}
