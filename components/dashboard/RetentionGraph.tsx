"use client";

import { useMemo, useState } from "react";
import type { TimelineCurve } from "@/lib/dopa-api";

type RetentionPoint = {
  second: number;
  value: number;
  upper: number;
  lower: number;
  isDropOff: boolean;
};

/**
 * Presonance-style retention: steep early leave, then slower decline toward ~15%.
 * Cumulative hazard survival y(t)=exp(-Λ(t)), not a linear %/s fade.
 */
export function RetentionGraph({
  curve,
  fileDuration,
}: {
  curve?: TimelineCurve;
  fileDuration: number | null;
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const duration = fileDuration && fileDuration > 0 ? fileDuration : 28;

  const points = useMemo(
    () => buildRetentionPoints(curve, duration),
    [curve, duration],
  );

  const peakPoint = useMemo(
    () =>
      points.reduce(
        (prev, curr) => (curr.value > prev.value ? curr : prev),
        points[0],
      ),
    [points],
  );
  const dropOffs = useMemo(() => points.filter((p) => p.isDropOff), [points]);
  const hookRetention = useMemo(() => {
    const target = Math.min(3, duration);
    return nearestPoint(points, target)?.value ?? 0;
  }, [points, duration]);
  const endRetention = points[points.length - 1]?.value ?? 0;
  const percentileLabel = useMemo(() => {
    const pct = Math.round(Math.min(95, Math.max(5, endRetention * 0.9 + 2)));
    const ordinal =
      pct % 10 === 1 && pct !== 11
        ? "st"
        : pct % 10 === 2 && pct !== 12
          ? "nd"
          : pct % 10 === 3 && pct !== 13
            ? "rd"
            : "th";
    return `Around the ${pct}${ordinal} percentile in our modeled retention baseline.`;
  }, [endRetention]);

  const width = 640;
  const height = 220;
  const padL = 40;
  const padR = 16;
  const padT = 28;
  const padB = 30;
  const chartW = width - padL - padR;
  const chartH = height - padT - padB;

  const getX = (second: number) =>
    padL + (Math.min(duration, Math.max(0, second)) / duration) * chartW;
  const getY = (val: number) => padT + chartH - (val / 100) * chartH;

  const lineD = useMemo(
    () => buildSmoothPath(points.map((p) => [getX(p.second), getY(p.value)])),
    // getX/getY close over duration/layout constants
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, duration],
  );

  const bandD = useMemo(() => {
    if (points.length < 2) return "";
    const upper = points.map((p) => [getX(p.second), getY(p.upper)]);
    const lower = [...points]
      .reverse()
      .map((p) => [getX(p.second), getY(p.lower)]);
    return `${buildSmoothPath(upper)} ${buildSmoothPath(lower, true)} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, duration]);

  const hookX = getX(Math.min(3.0, duration));
  const focusPoint = nearestPoint(
    points,
    Math.min(duration * 0.25, Math.max(5, duration * 0.22)),
  );

  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let s = 0; s <= Math.round(duration); s += 1) ticks.push(s);
    return ticks;
  }, [duration]);

  return (
    <div className="dopa-panel space-y-3 overflow-hidden p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[14px] font-medium text-white">
              Retention prediction
            </h2>
            <span className="rounded-full border border-brand/25 bg-brand/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-brand">
              y(t) survival
            </span>
          </div>
          <p className="mt-0.5 text-[11px] text-secondary">
            Cumulative hazard retention across {duration.toFixed(1)}s · full
            0–100% scale
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11px] text-tertiary">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            0–3s Hook
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-[#e879f9]" />
            Retention
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            Drop-off
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-xl border border-white/8 bg-[#0c0d0e] p-2">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full overflow-visible"
        >
          <defs>
            <linearGradient id="retentionBandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e879f9" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#e879f9" stopOpacity="0.06" />
            </linearGradient>
            <linearGradient id="hookZoneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {[0, 25, 50, 75, 100].map((val) => (
            <g key={val}>
              <line
                x1={padL}
                y1={getY(val)}
                x2={width - padR}
                y2={getY(val)}
                stroke="rgba(255,255,255,0.05)"
              />
              <text
                x={padL - 8}
                y={getY(val) + 3}
                fill="rgba(255,255,255,0.35)"
                fontSize="9"
                fontFamily="monospace"
                textAnchor="end"
              >
                {val}%
              </text>
            </g>
          ))}

          <rect
            x={padL}
            y={padT}
            width={Math.max(0, hookX - padL)}
            height={chartH}
            fill="url(#hookZoneGrad)"
          />
          <line
            x1={hookX}
            y1={padT}
            x2={hookX}
            y2={padT + chartH}
            stroke="#22d3ee"
            strokeDasharray="4 3"
            strokeWidth="1.2"
          />
          <text
            x={padL + 6}
            y={padT + 14}
            fill="#22d3ee"
            fontSize="9"
            fontWeight="500"
          >
            0–3s Hook Zone
          </text>

          {bandD ? <path d={bandD} fill="url(#retentionBandGrad)" /> : null}
          <path
            d={lineD}
            fill="none"
            stroke="#e879f9"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {focusPoint ? (
            <g>
              <circle
                cx={getX(focusPoint.second)}
                cy={getY(focusPoint.upper)}
                r="3.5"
                fill="#0c0d0e"
                stroke="#e879f9"
                strokeWidth="1.5"
              />
              <circle
                cx={getX(focusPoint.second)}
                cy={getY(focusPoint.value)}
                r="3.5"
                fill="#e879f9"
                stroke="#fff"
                strokeWidth="1.2"
              />
              <circle
                cx={getX(focusPoint.second)}
                cy={getY(focusPoint.lower)}
                r="3.5"
                fill="#0c0d0e"
                stroke="#e879f9"
                strokeWidth="1.5"
              />
            </g>
          ) : null}

          {dropOffs.map((dp) => (
            <g key={`drop-${dp.second}`}>
              <line
                x1={getX(dp.second)}
                y1={padT}
                x2={getX(dp.second)}
                y2={padT + chartH}
                stroke="#f59e0b"
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <circle
                cx={getX(dp.second)}
                cy={getY(dp.value)}
                r="4"
                fill="#f59e0b"
                stroke="#0c0d0e"
                strokeWidth="2"
              />
            </g>
          ))}

          <line
            x1={padL}
            y1={padT + chartH}
            x2={width - padR}
            y2={padT + chartH}
            stroke="rgba(255,255,255,0.1)"
          />
          {xTicks
            .filter(
              (s, i) =>
                duration <= 20 ||
                i % 2 === 0 ||
                s === 0 ||
                s === Math.round(duration),
            )
            .map((s) => (
              <text
                key={s}
                x={getX(s)}
                y={height - 8}
                fill="rgba(255,255,255,0.35)"
                fontSize="8"
                fontFamily="monospace"
                textAnchor="middle"
              >
                {s}s
              </text>
            ))}

          {hoveredIdx !== null && points[hoveredIdx] ? (
            <g>
              <line
                x1={getX(points[hoveredIdx].second)}
                y1={padT}
                x2={getX(points[hoveredIdx].second)}
                y2={padT + chartH}
                stroke="rgba(255,255,255,0.45)"
                strokeWidth="1"
              />
              <circle
                cx={getX(points[hoveredIdx].second)}
                cy={getY(points[hoveredIdx].value)}
                r="4.5"
                fill="#e879f9"
                stroke="#fff"
                strokeWidth="1.5"
              />
            </g>
          ) : null}

          <rect
            x={padL}
            y={padT}
            width={chartW}
            height={chartH}
            fill="transparent"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = Math.max(
                0,
                Math.min(rect.width, e.clientX - rect.left),
              );
              const t = (relX / rect.width) * duration;
              let best = 0;
              let bestDist = Infinity;
              for (let i = 0; i < points.length; i += 1) {
                const dist = Math.abs(points[i].second - t);
                if (dist < bestDist) {
                  bestDist = dist;
                  best = i;
                }
              }
              setHoveredIdx(best);
            }}
            onMouseLeave={() => setHoveredIdx(null)}
          />
        </svg>

        {hoveredIdx !== null && points[hoveredIdx] ? (
          <div className="mt-2 flex items-center justify-between border-t border-white/6 px-2 pt-2 font-mono text-[11px]">
            <span className="text-tertiary">
              t={" "}
              <strong className="text-white">
                {points[hoveredIdx].second.toFixed(1)}s
              </strong>
            </span>
            <span className="text-[#f0abfc]">
              Retention{" "}
              <strong className="text-white">
                {points[hoveredIdx].value.toFixed(1)}%
              </strong>
              <span className="ml-2 text-tertiary">
                ({points[hoveredIdx].lower.toFixed(0)}–
                {points[hoveredIdx].upper.toFixed(0)}%)
              </span>
            </span>
          </div>
        ) : null}
      </div>

      <p className="text-[12px] text-secondary">{percentileLabel}</p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <div className="rounded-lg border border-white/6 bg-white/2 p-2.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-tertiary">
            Peak Retention
          </p>
          <p className="mt-0.5 font-mono text-[13px] font-semibold text-white">
            {peakPoint.value.toFixed(1)}%{" "}
            <span className="text-[10px] text-tertiary">
              at {peakPoint.second.toFixed(1)}s
            </span>
          </p>
        </div>
        <div className="rounded-lg border border-white/6 bg-white/2 p-2.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-tertiary">
            0–3s Hook Retention
          </p>
          <p className="mt-0.5 font-mono text-[13px] font-semibold text-cyan-300">
            {hookRetention.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-white/6 bg-white/2 p-2.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-tertiary">
            End Retention
          </p>
          <p className="mt-0.5 font-mono text-[13px] font-semibold text-white">
            {endRetention.toFixed(1)}%
          </p>
        </div>
        <div className="rounded-lg border border-white/6 bg-white/2 p-2.5">
          <p className="font-mono text-[9px] uppercase tracking-wider text-tertiary">
            Flagged Dips
          </p>
          <p className="mt-0.5 font-mono text-[13px] font-semibold text-amber-400">
            {dropOffs.length}{" "}
            {dropOffs.length === 1 ? "drop-off" : "drop-offs"}
          </p>
        </div>
      </div>
    </div>
  );
}

function buildRetentionPoints(
  curve: TimelineCurve | undefined,
  duration: number,
): RetentionPoint[] {
  const dropTargets =
    curve?.drop_off_seconds?.length && curve.drop_off_seconds.length > 0
      ? curve.drop_off_seconds
      : [duration * 0.35, duration * 0.7];

  let series: { second: number; value: number }[];

  if (curve && curve.seconds.length > 1) {
    series = curve.seconds.map((second, idx) => {
      let raw = curve.y[idx] ?? 0;
      if (raw <= 1.5) raw *= 100;
      return { second, value: clamp(raw, 0, 100) };
    });
  } else {
    series = synthesizeSurvivalCurve(duration, dropTargets);
  }

  if (series.length === 0 || series[0].second > 0.05) {
    series = [{ second: 0, value: 100 }, ...series];
  } else {
    series[0] = { ...series[0], second: 0, value: 100 };
  }

  return series.map((point, index) => {
    const band = retentionBand(point.value, point.second, duration);
    return {
      second: point.second,
      value: point.value,
      upper: clamp(point.value + band, point.value, 100),
      lower: clamp(point.value - band, 0, point.value),
      isDropOff:
        index > 0 &&
        dropTargets.some((drop) => Math.abs(point.second - drop) <= 0.15),
    };
  });
}

function synthesizeSurvivalCurve(
  duration: number,
  dropTargets: number[],
): { second: number; value: number }[] {
  const dt = 0.1;
  const points: { second: number; value: number }[] = [];
  let hazardAcc = 0;

  for (let t = 0; t <= duration + 1e-9; t = Number((t + dt).toFixed(1))) {
    if (t === 0) {
      points.push({ second: 0, value: 100 });
      continue;
    }

    const earlyStress =
      t <= 3.5 ? 0.08 + 0.12 * Math.max(0, 1 - t / 3.5) : 0;
    let dip = 0;
    for (const drop of dropTargets) {
      if (Math.abs(t - drop) < 0.3) {
        dip = Math.max(dip, drop === dropTargets[0] ? 0.22 : 0.16);
      }
    }
    const hazard = clamp(0.04 + earlyStress + dip, 0.008, 0.55);
    hazardAcc += hazard * dt;
    const retention = clamp(Math.exp(-hazardAcc) * 100, 12, 100);
    points.push({ second: t, value: Number(retention.toFixed(2)) });
  }

  return points;
}

function retentionBand(value: number, second: number, duration: number) {
  const mid = duration > 0 ? second / duration : 0;
  const shape = 6 + 10 * Math.sin(Math.PI * mid);
  return clamp(shape * (0.35 + (100 - value) / 120), 3, 14);
}

function nearestPoint(points: RetentionPoint[], second: number) {
  if (points.length === 0) return null;
  let best = points[0];
  let bestDist = Math.abs(best.second - second);
  for (const point of points) {
    const dist = Math.abs(point.second - second);
    if (dist < bestDist) {
      best = point;
      bestDist = dist;
    }
  }
  return best;
}

function buildSmoothPath(coords: number[][], continuePath = false): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) {
    return `${continuePath ? "L" : "M"} ${coords[0][0]} ${coords[0][1]}`;
  }

  let d = `${continuePath ? "L" : "M"} ${coords[0][0]} ${coords[0][1]}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[i === 0 ? i : i - 1];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[i + 2] ?? p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
