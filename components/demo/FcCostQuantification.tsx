"use client";

import {
  calculateFcRunCost,
  FC_COST_SAMPLE_ACTIVE_MS,
  FC_COST_SAMPLE_HIBERNATED_MS,
} from "@/lib/fc-sandbox/cost";

function formatUsd(value: number) {
  if (value >= 0.01) {
    return `$${value.toFixed(4)}`;
  }
  return `$${value.toFixed(6)}`;
}

function formatDuration(ms: number) {
  if (ms >= 3_600_000) {
    const hours = ms / 3_600_000;
    return `${Number(hours.toFixed(hours >= 10 ? 0 : 1))}h`;
  }
  if (ms >= 60_000) {
    return `${Math.round(ms / 60_000)}m`;
  }
  return `${Math.round(ms / 1_000)}s`;
}

export function FcCostQuantification({
  activeMs,
  hibernatedMs,
}: {
  activeMs?: number | null;
  hibernatedMs?: number | null;
}) {
  const hasMetrics =
    typeof activeMs === "number" &&
    Number.isFinite(activeMs) &&
    activeMs >= 0 &&
    typeof hibernatedMs === "number" &&
    Number.isFinite(hibernatedMs) &&
    hibernatedMs >= 0 &&
    (activeMs > 0 || hibernatedMs > 0);

  const resolvedActiveMs = hasMetrics
    ? activeMs
    : FC_COST_SAMPLE_ACTIVE_MS;
  const resolvedHibernatedMs = hasMetrics
    ? hibernatedMs
    : FC_COST_SAMPLE_HIBERNATED_MS;

  const cost = calculateFcRunCost(resolvedActiveMs, resolvedHibernatedMs);
  const baseline = Math.max(cost.baselineIdleCostUsd, Number.EPSILON);
  const hibernatedShare = Math.min(
    100,
    Math.max(0, (cost.totalCostUsd / baseline) * 100),
  );
  const savedShare = Math.min(100, Math.max(0, 100 - hibernatedShare));

  return (
    <div className="border-t border-white/8 bg-[#08090a]/80 px-5 py-5 md:px-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#747b89]">
            Cost quantification
          </p>
          <p className="mt-2 text-sm text-[#b6bbc5]">
            Active vs idle baseline · FC hibernation savings
          </p>
        </div>
        {!hasMetrics ? (
          <span className="inline-flex w-fit rounded-full border border-[#5e6ad2]/30 bg-[#5e6ad2]/10 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#9aa3ef]">
            Example · 120s active + 1h hibernated
          </span>
        ) : (
          <span className="inline-flex w-fit rounded-full border border-[#3fd1a4]/25 bg-[#3fd1a4]/8 px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#66deb9]">
            From proof run · {formatDuration(resolvedActiveMs)} active ·{" "}
            {formatDuration(resolvedHibernatedMs)} hibernated
          </span>
        )}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#666d78]">
            Active run
          </p>
          <p className="mt-1.5 text-xl tracking-[-0.03em] text-[#e8e9ec]">
            {formatUsd(cost.activeCostUsd)}
          </p>
          <p className="mt-1 text-[11px] text-[#777f8d]">
            + {formatUsd(cost.hibernatedCostUsd)} hibernated
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#666d78]">
            Idle baseline
          </p>
          <p className="mt-1.5 text-xl tracking-[-0.03em] text-[#e8e9ec]">
            {formatUsd(cost.baselineIdleCostUsd)}
          </p>
          <p className="mt-1 text-[11px] text-[#777f8d]">
            Kept active for full interval
          </p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#666d78]">
            Saved
          </p>
          <p className="mt-1.5 text-xl tracking-[-0.03em] text-[#9aa3ef]">
            {formatUsd(cost.savedUsd)}
          </p>
          <p className="mt-1 text-[11px] text-[#777f8d]">
            {cost.savingsPercent.toFixed(2)}% vs idle baseline
          </p>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.12em] text-[#666d78]">
          <span>Hibernated path</span>
          <span>Idle continuous</span>
        </div>
        <div
          className="relative h-2.5 overflow-hidden rounded-full bg-[#5e6ad2]/25"
          role="img"
          aria-label={`Hibernation uses ${hibernatedShare.toFixed(1)}% of idle baseline cost; saves ${savedShare.toFixed(1)}%`}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[#5e6ad2]"
            style={{ width: `${hibernatedShare}%` }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-[#8a919e]">
          <span>
            Total with pause {formatUsd(cost.totalCostUsd)}
          </span>
          <span>
            Savings {cost.savingsPercent.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
