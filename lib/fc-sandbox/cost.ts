import {
  calculateHibernationSavings,
  type FcCostCalculation,
} from "@/lib/fc-sandbox/evidence";

/** Active-state compute rate for a 2 vCPU + 4 GB FC sandbox shape (USD / sec). */
export const FC_ACTIVE_RATE_USD_PER_SEC = 0.000_031_6;

/** Hibernated snapshot / storage rate (USD / sec). */
export const FC_HIBERNATED_RATE_USD_PER_SEC = 0.000_002;

/**
 * Documented sample timing used when a proof run has not yet recorded metrics:
 * 120s active compute + 1h hibernated.
 */
export const FC_COST_SAMPLE_ACTIVE_MS = 120_000;
export const FC_COST_SAMPLE_HIBERNATED_MS = 3_600_000;

export type FcRunCost = {
  activeCostUsd: number;
  hibernatedCostUsd: number;
  totalCostUsd: number;
  baselineIdleCostUsd: number;
  savedUsd: number;
  savingsPercent: number;
};

function assertNonNegativeMs(name: string, value: number) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative finite number.`);
  }
}

function roundUsd(value: number) {
  return Math.round(value * 1_000_000) / 1_000_000;
}

/**
 * Quantify USD cost for measured active vs hibernated durations using FC rates.
 * Baseline assumes the sandbox stayed active for the full wall interval.
 */
export function calculateFcRunCost(
  activeMs: number,
  hibernatedMs: number,
): FcRunCost {
  assertNonNegativeMs("activeMs", activeMs);
  assertNonNegativeMs("hibernatedMs", hibernatedMs);

  const activeSec = activeMs / 1_000;
  const hibernatedSec = hibernatedMs / 1_000;
  const totalSec = activeSec + hibernatedSec;

  const activeCostUsd = roundUsd(activeSec * FC_ACTIVE_RATE_USD_PER_SEC);
  const hibernatedCostUsd = roundUsd(
    hibernatedSec * FC_HIBERNATED_RATE_USD_PER_SEC,
  );
  const totalCostUsd = roundUsd(activeCostUsd + hibernatedCostUsd);
  const baselineIdleCostUsd = roundUsd(totalSec * FC_ACTIVE_RATE_USD_PER_SEC);
  const savedUsd = roundUsd(baselineIdleCostUsd - totalCostUsd);
  const savingsPercent =
    baselineIdleCostUsd > 0
      ? Math.round((savedUsd / baselineIdleCostUsd) * 10_000) / 100
      : 0;

  return {
    activeCostUsd,
    hibernatedCostUsd,
    totalCostUsd,
    baselineIdleCostUsd,
    savedUsd,
    savingsPercent,
  };
}

/**
 * Thin CNY wrapper: maps wait hours + hourly rates into the bill-backed
 * `calculateHibernationSavings` validator used by cost-efficiency evidence.
 */
export function calculateFcHibernationSavingsFromCny(input: {
  waitHours: number;
  activeHourlyCny: number;
  hibernatedHourlyCny: number;
  requestAndSnapshotCny: number;
}): FcCostCalculation {
  return calculateHibernationSavings(input);
}
