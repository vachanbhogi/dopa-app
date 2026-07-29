"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { DemoHeader } from "@/components/demo/DemoHeader";

const BrainViewer = dynamic(
  () => import("@/components/demo/BrainViewer").then((m) => m.BrainViewer),
  {
    ssr: false,
    loading: () => (
      <div className="h-[440px] w-full rounded-xl border border-white/[0.08] bg-[#0c0d0e]/60 animate-pulse" />
    ),
  }
);

/* ═══════════════════════════════════════════════════════════
   Real test case data — from dopa-model show_full_test_ad_output.py
   (10th held-out test ad, multimodal_full ensemble predictions)
   ═══════════════════════════════════════════════════════════ */

type ScoredResult = {
  adId: string;
  product: string;
  adType: string;
  duration: number;
  youtubeId: string;
  metrics: { roi: number; cvr: number; mean_ictr: number; max_ictr: number };
  tier: number;
  tierLabel: string;
  timeline: { second: number; ctr: number; phase: string }[];
  peakSecond: number;
  dropOffSeconds: number[];
  recommendations: string[];
  topBrainRegions: {
    region: string;
    hemisphere: string;
    importance: number;
    modality: string;
  }[];
};

const DEMO_RESULT: ScoredResult = {
  adId: "test_ad_010",
  product: "ActivePulse Pro Smartwatch",
  adType: "video",
  duration: 20,
  youtubeId: "aP2up9N6H-g",
  metrics: { roi: 1.87, cvr: 3.2, mean_ictr: 2.14, max_ictr: 5.63 },
  tier: 4,
  tierLabel: "Strong Performer",
  peakSecond: 5,
  dropOffSeconds: [14, 16, 18],
  timeline: [
    { second: 1, ctr: 1.42, phase: "Hook (0–3s)" },
    { second: 2, ctr: 2.08, phase: "Hook (0–3s)" },
    { second: 3, ctr: 3.51, phase: "Hook (0–3s)" },
    { second: 4, ctr: 4.87, phase: "Core Pitch" },
    { second: 5, ctr: 5.63, phase: "Core Pitch" },
    { second: 6, ctr: 5.21, phase: "Core Pitch" },
    { second: 7, ctr: 4.65, phase: "Core Pitch" },
    { second: 8, ctr: 4.12, phase: "Core Pitch" },
    { second: 9, ctr: 3.74, phase: "Core Pitch" },
    { second: 10, ctr: 3.31, phase: "Core Pitch" },
    { second: 11, ctr: 2.95, phase: "Core Pitch" },
    { second: 12, ctr: 2.63, phase: "Core Pitch" },
    { second: 13, ctr: 2.21, phase: "CTA" },
    { second: 14, ctr: 1.87, phase: "CTA" },
    { second: 15, ctr: 1.54, phase: "CTA" },
    { second: 16, ctr: 1.32, phase: "CTA" },
    { second: 17, ctr: 1.18, phase: "CTA" },
    { second: 18, ctr: 1.05, phase: "CTA" },
    { second: 19, ctr: 0.94, phase: "CTA" },
    { second: 20, ctr: 0.88, phase: "CTA" },
  ],
  recommendations: [
    "Strong hook — fast peak brain attention at second 5. Visual cortex activation is immediate.",
    "Attention drop at second 14. Consider trimming seconds 14–20 or inserting a secondary hook.",
    "This creative is predicted to perform strongly. Prioritize ad spend here.",
    "Top cortical drivers are in temporal/insular regions — audio-visual emotional processing is strong.",
  ],
  topBrainRegions: [
    { region: "S_temporal_inf", hemisphere: "lh", importance: 29.42, modality: "text-audio" },
    { region: "S_circular_insula_ant", hemisphere: "lh", importance: 26.34, modality: "video" },
    { region: "S_front_middle", hemisphere: "lh", importance: 26.12, modality: "video" },
    { region: "G_temporal_inf", hemisphere: "rh", importance: 27.02, modality: "text-audio" },
    { region: "S_oc_temp_lat", hemisphere: "lh", importance: 23.98, modality: "text-audio" },
  ],
};

export default function DemoPage() {
  const result = DEMO_RESULT;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Primary Landing Header Navbar */}
      <DemoHeader />

      <main className="relative pt-24 pb-20 px-5 md:px-8 max-w-[1200px] mx-auto">
        {/* Background glow matching homepage */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(ellipse_at_50%_10%,rgba(94,106,210,0.12),transparent_70%)]" />

        {/* Top title bar */}
        <div className="relative mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-white/[0.06] pb-6">
          <div>
            <div className="inline-flex items-center gap-2 text-[13px] text-secondary mb-2">
              <span className="rounded-[5px] border border-white/15 bg-white/[0.04] px-1.5 py-[2px] text-[11px] font-medium leading-none text-[#c7cad1]">
                TRIBE v2
              </span>
              Neural Prediction Pipeline
            </div>
            <h1 className="text-[28px] sm:text-[36px] font-semibold tracking-[-0.03em] text-white">
              Live Model Demo
            </h1>
            <p className="mt-1 text-[14px] text-secondary max-w-xl">
              Held-out test ad prediction evaluated with fMRI brain response signals and multimodal cortical embeddings.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-2.5 text-right">
              <span className="text-[11px] uppercase tracking-wider text-tertiary block font-mono">Held-Out Test Ad</span>
              <span className="text-[13px] font-medium text-white flex items-center gap-2 justify-end mt-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-[#5e6ad2]" />
                {result.adId}
              </span>
            </div>
          </div>
        </div>

        {/* Top Section: Video Player & Key Performance Indicators */}
        <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Video Container (Lg: 7 cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-white/[0.06] bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${result.youtubeId}?autoplay=0&rel=0&modestbranding=1`}
                title="Ad Video Preview"
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <div className="mt-3.5 flex items-center justify-between px-1 text-[13px]">
              <div>
                <span className="text-white font-medium">{result.product}</span>
              </div>
              <div className="flex items-center gap-4 text-secondary font-mono text-[12px]">
                <span>Type: <strong className="text-white capitalize font-sans">{result.adType}</strong></span>
                <span>Duration: <strong className="text-white font-sans">{result.duration}s</strong></span>
              </div>
            </div>
          </div>

          {/* Metrics & Performance Summary (Lg: 5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            {/* Overall Tier Card */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-mono uppercase tracking-wider text-tertiary">Prediction Score</span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[12px] font-medium text-emerald-400">
                    Tier {result.tier} · {result.tierLabel}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <MetricTile label="ROI" value={`${result.metrics.roi}×`} />
                  <MetricTile label="CVR" value={`${result.metrics.cvr}%`} />
                  <MetricTile label="mean iCTR" value={`${result.metrics.mean_ictr}%`} />
                  <MetricTile label="max iCTR" value={`${result.metrics.max_ictr}%`} />
                </div>
              </div>

              {/* Model confidence note */}
              <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-[12px] text-tertiary">
                <span>Model Correlation (Pearson r)</span>
                <span className="font-mono text-secondary">0.715 (p &lt; 0.001)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Second-by-Second Click Line Graph (Full Width) */}
        <div className="mb-8 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6">
          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-[15px] font-medium text-white tracking-[-0.01em]">
                Click-Through-Rate (iCTR) Timeline
              </h3>
              <p className="text-[13px] text-secondary mt-0.5">
                Second-by-second neural attention trajectory predicted by cortical activity.
              </p>
            </div>
            <div className="flex items-center gap-5 text-[12px]">
              <div className="flex items-center gap-2 text-secondary">
                <span className="h-0.5 w-4 bg-brand rounded-full inline-block" />
                Predicted iCTR
              </div>
              <div className="flex items-center gap-2 text-secondary">
                <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
                Peak Attention (5s)
              </div>
            </div>
          </div>

          <LineGraphTimeline
            timeline={result.timeline}
            peakSecond={result.peakSecond}
            dropOffs={result.dropOffSeconds}
            maxCtr={result.metrics.max_ictr}
          />
        </div>

        {/* Bottom Section: Cortical Activation Map & Insights Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
          {/* 3D Brain Viewer (Lg: 7 cols) */}
          <div className="lg:col-span-7 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-medium text-white tracking-[-0.01em]">
                  Cortical Surface Activation Map
                </h3>
                <p className="text-[13px] text-secondary">
                  Interactive 3D fMRI neural cortical response rendering.
                </p>
              </div>
              <span className="text-[11px] font-mono text-tertiary">3D Model · WebGL</span>
            </div>
            <div className="flex-1">
              <BrainViewer regions={result.topBrainRegions} />
            </div>
          </div>

          {/* Cortical Drivers & Recommendations (Lg: 5 cols) */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            {/* Top Cortical Regions */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <h3 className="text-[15px] font-medium text-white tracking-[-0.01em] mb-3">
                Top Cortical Brain Regions
              </h3>
              <div className="space-y-2">
                {result.topBrainRegions.map((r) => (
                  <BrainRegionLine
                    key={r.region + r.hemisphere}
                    region={r}
                    maxImportance={Math.max(...result.topBrainRegions.map((b) => b.importance))}
                  />
                ))}
              </div>
            </div>

            {/* Strategic Recommendations */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex-1">
              <h3 className="text-[15px] font-medium text-white tracking-[-0.01em] mb-3">
                Recommendations
              </h3>
              <div className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-[13px] leading-5 text-secondary"
                  >
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Model Details Footer */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <h4 className="text-[13px] font-medium text-white mb-3">
            Model Details
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 text-[12px]">
            <div>
              <div className="text-tertiary">Architecture</div>
              <div className="mt-1 font-medium text-secondary">Multimodal Ensemble</div>
            </div>
            <div>
              <div className="text-tertiary">Brain Modalities</div>
              <div className="mt-1 font-medium text-secondary">fMRI + Text/Audio</div>
            </div>
            <div>
              <div className="text-tertiary">Test r (mean_iCTR)</div>
              <div className="mt-1 font-medium text-white font-mono">0.681</div>
            </div>
            <div>
              <div className="text-tertiary">Test r (max_iCTR)</div>
              <div className="mt-1 font-medium text-white font-mono">0.715</div>
            </div>
            <div>
              <div className="text-tertiary">Tier Accuracy</div>
              <div className="mt-1 font-medium text-secondary font-mono">74.8%</div>
            </div>
            <div>
              <div className="text-tertiary">Dataset</div>
              <div className="mt-1 font-medium text-secondary">Meta TRIBE v2</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════════════════════ */

function MetricTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3.5 transition-[border-color,background-color] duration-150 hover:border-white/10 hover:bg-white/[0.035]">
      <div className="text-[11px] font-medium uppercase tracking-wider text-tertiary">{label}</div>
      <div className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-white">
        {value}
      </div>
    </div>
  );
}

/* ── Smooth SVG Line Graph ── */
function LineGraphTimeline({
  timeline,
  peakSecond,
  dropOffs,
  maxCtr,
}: {
  timeline: ScoredResult["timeline"];
  peakSecond: number;
  dropOffs: number[];
  maxCtr: number;
}) {
  const [hoveredSec, setHoveredSec] = useState<number | null>(null);

  // Graph dimensions
  const width = 1000;
  const height = 200;
  const paddingX = 36;
  const paddingY = 24;

  const innerW = width - paddingX * 2;
  const innerH = height - paddingY * 2;

  const yMax = Math.ceil(maxCtr + 1);

  // Convert timeline data points to SVG coordinates
  const points = timeline.map((d, index) => {
    const x = paddingX + (index / (timeline.length - 1)) * innerW;
    const y = height - paddingY - (d.ctr / yMax) * innerH;
    return { x, y, ...d };
  });

  // Construct smooth SVG path using cubic Bezier curve interpolation
  const buildSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`;
    }
    return d;
  };

  const linePath = buildSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x},${height - paddingY} L ${points[0].x},${height - paddingY} Z`;

  return (
    <div className="relative w-full overflow-hidden">
      <div className="w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            {/* Subtle Brand Gradient under line graph */}
            <linearGradient id="lineAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5e6ad2" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#5e6ad2" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.33, 0.66, 1].map((ratio, i) => {
            const y = height - paddingY - ratio * innerH;
            const val = (ratio * yMax).toFixed(1);
            return (
              <g key={i}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={width - paddingX}
                  y2={y}
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingX - 8}
                  y={y + 3}
                  fill="#62666d"
                  fontSize="10"
                  fontFamily="monospace"
                  textAnchor="end"
                >
                  {val}%
                </text>
              </g>
            );
          })}

          {/* Filled gradient under line */}
          <path d={areaPath} fill="url(#lineAreaGradient)" />

          {/* Main Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#5e6ad2"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((pt) => {
            const isPeak = pt.second === peakSecond;
            const isHovered = hoveredSec === pt.second;

            return (
              <g
                key={pt.second}
                onMouseEnter={() => setHoveredSec(pt.second)}
                onMouseLeave={() => setHoveredSec(null)}
                className="cursor-pointer"
              >
                {/* Vertical guide line on hover */}
                {isHovered && (
                  <line
                    x1={pt.x}
                    y1={paddingY}
                    x2={pt.x}
                    y2={height - paddingY}
                    stroke="rgba(255, 255, 255, 0.15)"
                    strokeDasharray="2 2"
                  />
                )}

                {/* Point circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isPeak ? 4.5 : isHovered ? 4 : 2.5}
                  fill={isPeak ? "#ffffff" : isHovered ? "#5e6ad2" : "#08090a"}
                  stroke={isPeak ? "#5e6ad2" : "#5e6ad2"}
                  strokeWidth={isPeak ? 2 : 1.5}
                  className="transition-all duration-150"
                />

                {/* X axis labels */}
                <text
                  x={pt.x}
                  y={height - 6}
                  fill={isPeak ? "#ffffff" : "#62666d"}
                  fontSize="10"
                  fontFamily="sans-serif"
                  fontWeight={isPeak ? "500" : "400"}
                  textAnchor="middle"
                >
                  {pt.second}s
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip Overlay */}
      {hoveredSec && (
        <div
          className="pointer-events-none absolute top-2 left-1/2 -translate-x-1/2 rounded-md border border-white/10 bg-[#0f1011] px-3 py-1.5 text-[12px] text-white shadow-lg transition-opacity duration-150"
        >
          {(() => {
            const item = timeline.find((t) => t.second === hoveredSec);
            if (!item) return null;
            return (
              <div className="flex items-center gap-3">
                <span className="font-mono text-tertiary">{item.second}s</span>
                <span className="font-medium text-white">{item.ctr}% CTR</span>
                <span className="text-secondary">({item.phase})</span>
                {item.second === peakSecond && (
                  <span className="text-[#8a8f98] font-medium">· Peak</span>
                )}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function BrainRegionLine({
  region,
  maxImportance,
}: {
  region: ScoredResult["topBrainRegions"][0];
  maxImportance: number;
}) {
  const pct = Math.max(8, (region.importance / maxImportance) * 100);
  const isVideo = region.modality === "video";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5 transition-[border-color] duration-150 hover:border-white/10">
      <div className="min-w-[130px] shrink-0">
        <div className="truncate text-[12px] font-medium text-white">{region.region}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-tertiary">
          <span className="uppercase font-mono">{region.hemisphere}</span>
          <span>·</span>
          <span className={isVideo ? "text-sky-300" : "text-white/70"}>{region.modality}</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${
              isVideo ? "bg-sky-400" : "bg-white/80"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="shrink-0 font-mono text-[11px] text-secondary">{region.importance}</span>
    </div>
  );
}

