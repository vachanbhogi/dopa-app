"use client";

import { useState, useRef, useCallback } from "react";
import { useDropzone } from "react-dropzone";

/* ═══════════════════════════════════════════════════════════
   Mock dopa-model output — mirrors show_full_test_ad_output.py
   ═══════════════════════════════════════════════════════════ */

type ScoredResult = {
  fileName: string;
  fileSize: string;
  fileType: string;
  metrics: { roi: number; cvr: number; mean_ictr: number; max_ictr: number };
  tier: number;
  tierLabel: string;
  timeline: { second: number; ctr: number; phase: string }[];
  peakSecond: number;
  dropOffSeconds: number[];
  recommendations: string[];
  topBrainRegions: { region: string; hemisphere: string; importance: number; modality: string }[];
};

function generateMockScore(file: File): ScoredResult {
  const seed = file.name.length + file.size;
  const r = (min: number, max: number) => min + ((seed * 9301 + 49297) % 233280) / 233280 * (max - min);

  const roi = +(r(0.8, 3.2)).toFixed(2);
  const cvr = +(r(1.5, 6.0)).toFixed(1);
  const mean_ictr = +(r(0.8, 3.5)).toFixed(2);
  const max_ictr = +(r(2.0, 8.0)).toFixed(2);
  const tier = Math.min(5, Math.max(1, Math.round(roi * 1.6)));
  const tierLabels: Record<number, string> = {
    1: "Flop — Bottom 20%",
    2: "Below Average",
    3: "Average Performer",
    4: "Strong Performer",
    5: "Viral Winner — Top 20%",
  };

  const duration = 15;
  const peakSecond = Math.max(2, Math.min(12, Math.round(r(3, 8))));
  const sigma = duration * 0.2;
  const timeline = Array.from({ length: duration }, (_, i) => {
    const sec = i + 1;
    const curve = Math.exp(-0.5 * ((sec - peakSecond) / sigma) ** 2);
    const ctr = +(mean_ictr * 0.3 + (max_ictr - mean_ictr * 0.3) * curve).toFixed(2);
    const phase = sec <= 3 ? "Hook (0–3s)" : sec <= 12 ? "Core Pitch" : "CTA";
    return { second: sec, ctr, phase };
  });

  const dropOffs = timeline.filter((t) => t.second > peakSecond && (max_ictr - t.ctr) / max_ictr > 0.4).map((t) => t.second);

  const recommendations: string[] = [];
  if (peakSecond > 5) recommendations.push(`Slow hook — peak brain attention at second ${peakSecond}. Move the visual hook to seconds 1–3.`);
  else recommendations.push(`Strong hook — fast peak brain attention at second ${peakSecond}.`);
  if (dropOffs.length) recommendations.push(`Attention drop at second ${dropOffs[0]}. Consider trimming seconds ${dropOffs[0]}–${duration}.`);
  if (tier >= 4) recommendations.push("This creative is predicted to perform strongly. Prioritize ad spend here.");
  else recommendations.push("Consider A/B testing with a stronger hook or shorter cut.");

  const topBrainRegions = [
    { region: "G_front_sup", hemisphere: "lh", importance: +(r(0.03, 0.08)).toFixed(4), modality: "video" },
    { region: "S_intrapariet_and_P_trans", hemisphere: "rh", importance: +(r(0.025, 0.06)).toFixed(4), modality: "video" },
    { region: "G_temp_sup-Lateral", hemisphere: "lh", importance: +(r(0.02, 0.05)).toFixed(4), modality: "text-audio" },
    { region: "G_insular_short", hemisphere: "rh", importance: +(r(0.015, 0.04)).toFixed(4), modality: "text-audio" },
    { region: "S_calcarine", hemisphere: "lh", importance: +(r(0.01, 0.035)).toFixed(4), modality: "video" },
  ];

  return {
    fileName: file.name,
    fileSize: (file.size / (1024 * 1024)).toFixed(2) + " MB",
    fileType: file.type || "video/mp4",
    metrics: { roi, cvr, mean_ictr, max_ictr },
    tier,
    tierLabel: tierLabels[tier] ?? `Tier ${tier}`,
    timeline,
    peakSecond,
    dropOffSeconds: dropOffs,
    recommendations,
    topBrainRegions,
  };
}

/* ═══════════════════════════════════════════════════════════
   Brain Tab
   ═══════════════════════════════════════════════════════════ */

export function BrainTab() {
  const [files, setFiles] = useState<File[]>([]);
  const [scoring, setScoring] = useState(false);
  const [result, setResult] = useState<ScoredResult | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length > 0) {
      setFiles(accepted);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "video/*": [".mp4", ".mov", ".webm", ".avi"], "image/*": [".jpg", ".jpeg", ".png", ".gif", ".webp"] },
    multiple: false,
    noClick: false,
  });

  const handleScore = async () => {
    if (!files[0]) return;
    setScoring(true);
    await new Promise((r) => setTimeout(r, 1800));
    setResult(generateMockScore(files[0]));
    setScoring(false);
  };

  const uploaded = files[0];

  return (
    <div className="space-y-8">
      {/* Intro */}
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]">
        <p className="text-[14px] leading-6 text-secondary">
          Upload an ad video. Dopa runs it through <span className="text-white">Meta TRIBE v2</span> neural encoding
          and predicts ROI, CVR, click timelines, and performance tier — before you spend a dollar.
        </p>
      </div>

      {/* Upload zone — always aspect-video */}
      <div
        className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]"
        style={{ animationDelay: "50ms" }}
      >
        {!uploaded ? (
          <div
            {...getRootProps()}
            className={`
              group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed
              transition-[border-color,background-color] duration-200 ease-out
              ${
                isDragActive
                  ? "border-brand bg-brand/[0.06]"
                  : "border-white/[0.08] bg-white/[0.015] hover:border-white/[0.15] hover:bg-white/[0.025]"
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex aspect-video flex-col items-center justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.06] transition-transform duration-200 ease-out group-hover:scale-105">
                <svg className="h-6 w-6 text-white/40" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
                  <path d="M8 10V3M5 5.5 8 3l3 2.5" />
                  <path d="M2 10v2.5a1 1 0 001 1h10a1 1 0 001-1V10" />
                </svg>
              </div>
              <p className="mt-4 text-[14px] font-medium text-white">
                {isDragActive ? "Drop your ad video here" : "Upload ad creative"}
              </p>
              <p className="mt-1.5 text-[13px] text-secondary">
                Drag & drop or click · MP4, MOV, WebM, or image
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Video preview */}
            {uploaded.type.startsWith("video") ? (
              <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black">
                <div className="relative aspect-video">
                  <video
                    ref={videoRef}
                    src={URL.createObjectURL(uploaded)}
                    className="h-full w-full object-contain"
                    controls
                    muted
                  />
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-black">
                <div className="relative aspect-video flex items-center justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={URL.createObjectURL(uploaded)}
                    alt="Ad preview"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* File info + actions */}
            <div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-white">{uploaded.name}</p>
                <p className="mt-0.5 text-[12px] text-secondary">
                  {(uploaded.size / (1024 * 1024)).toFixed(2)} MB · {uploaded.type || "video/mp4"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setFiles([]); setResult(null); }}
                  className="rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-secondary transition-[border-color,color] duration-150 hover:border-white/20 hover:text-white active:scale-[0.97]"
                >
                  Replace
                </button>
                {!result && (
                  <button
                    onClick={handleScore}
                    disabled={scoring}
                    className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-1.5 text-[13px] font-medium text-white transition-[opacity,transform] duration-150 ease-out hover:opacity-90 active:scale-[0.97] disabled:opacity-50"
                  >
                    {scoring ? (
                      <>
                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        Scoring…
                      </>
                    ) : (
                      <>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M8 2v12M8 4c-1.5-1.5-4-1-4 1.5S6 8 8 8c-2 0-4.5.5-4 3s2.5 3 4 1.5" />
                          <path d="M8 4c1.5-1.5 4-1 4 1.5S10 8 8 8c2 0 4.5.5 4 3s-2.5 3-4 1.5" />
                        </svg>
                        Score with TRIBE v2
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Results (skeleton when empty, real data when scored) ── */}
      {result ? <ScoreResults result={result} /> : <SkeletonResults />}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   Score Results
   ═══════════════════════════════════════════════════════════ */

function ScoreResults({ result }: { result: ScoredResult }) {
  const tierColors: Record<number, string> = {
    1: "text-red-400 border-red-400/20 bg-red-400/10",
    2: "text-orange-400 border-orange-400/20 bg-orange-400/10",
    3: "text-yellow-400 border-yellow-400/20 bg-yellow-400/10",
    4: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
    5: "text-green-400 border-green-400/20 bg-green-400/10",
  };

  return (
    <div className="space-y-6">
      {/* Tier badge */}
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]" style={{ animationDelay: "0ms" }}>
        <div className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[13px] font-medium ${tierColors[result.tier]}`}>
          <span className="text-[18px] font-bold">Tier {result.tier}</span>
          <span className="opacity-80">· {result.tierLabel}</span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both] grid gap-3 sm:grid-cols-4" style={{ animationDelay: "50ms" }}>
        <MetricCard label="ROI" value={`${result.metrics.roi}×`} />
        <MetricCard label="CVR" value={`${result.metrics.cvr}%`} />
        <MetricCard label="mean iCTR" value={`${result.metrics.mean_ictr}%`} />
        <MetricCard label="max iCTR" value={`${result.metrics.max_ictr}%`} />
      </div>

      {/* Click timeline chart */}
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]" style={{ animationDelay: "100ms" }}>
        <h3 className="mb-3 text-[13px] font-medium text-white">Click Timeline (second-by-second)</h3>
        <ClickTimeline
          timeline={result.timeline}
          peakSecond={result.peakSecond}
          dropOffs={result.dropOffSeconds}
          maxCtr={result.metrics.max_ictr}
        />
      </div>

      {/* Cortical drivers */}
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]" style={{ animationDelay: "150ms" }}>
        <h3 className="mb-3 text-[13px] font-medium text-white">Top Cortical Brain Regions</h3>
        <div className="space-y-2">
          {result.topBrainRegions.map((r) => (
            <BrainRegionBar key={r.region} region={r} maxImportance={result.topBrainRegions[0].importance} />
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]" style={{ animationDelay: "200ms" }}>
        <h3 className="mb-3 text-[13px] font-medium text-white">Recommendations</h3>
        <div className="space-y-2">
          {result.recommendations.map((rec, i) => (
            <div
              key={i}
              className="flex gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[13px] leading-5 text-secondary"
            >
              <span className="mt-0.5 shrink-0 text-brand">•</span>
              {rec}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Metric card ── */
function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition-[border-color,background-color] duration-150 hover:border-white/[0.1] hover:bg-white/[0.035]">
      <div className="text-[11px] font-medium uppercase tracking-wider text-tertiary">{label}</div>
      <div className="mt-1.5 text-[24px] font-semibold tracking-[-0.03em] text-white">{value}</div>
    </div>
  );
}

/* ── Click timeline bar chart ── */
function ClickTimeline({
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
  const phases = [
    { label: "Hook", color: "bg-brand" },
    { label: "Core", color: "bg-indigo-500" },
    { label: "CTA", color: "bg-violet-500" },
  ];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
      {/* Phase legend */}
      <div className="mb-4 flex items-center gap-4">
        {phases.map((p) => (
          <div key={p.label} className="flex items-center gap-1.5 text-[11px] text-secondary">
            <span className={`inline-block h-2 w-2 rounded-sm ${p.color}`} />
            {p.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-[11px] text-secondary">
          <span className="inline-block h-2 w-2 rounded-sm bg-amber-400" />
          Peak
        </div>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-[3px]" style={{ height: 160 }}>
        {timeline.map((t) => {
          const pct = Math.max(4, (t.ctr / maxCtr) * 100);
          const isPeak = t.second === peakSecond;
          const isDrop = dropOffs.includes(t.second);
          let color = "bg-brand/60";
          if (t.phase.includes("Core")) color = "bg-indigo-500/60";
          if (t.phase.includes("CTA")) color = "bg-violet-500/60";
          if (isPeak) color = "bg-amber-400";
          if (isDrop) color = "bg-red-400/50";

          return (
            <div
              key={t.second}
              className="group relative flex flex-1 flex-col items-center"
              style={{ height: "100%" }}
            >
              <div className="flex flex-1 items-end w-full">
                <div
                  className={`w-full rounded-t transition-[height] duration-500 ease-out ${color}`}
                  style={{ height: `${pct}%` }}
                />
              </div>
              <span className="mt-1.5 text-[10px] text-tertiary">{t.second}s</span>

              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-10 left-1/2 z-10 -translate-x-1/2 scale-95 rounded-md border border-white/10 bg-[#111] px-2.5 py-1.5 text-[11px] text-white opacity-0 shadow-lg transition-[opacity,transform] duration-150 ease-out group-hover:scale-100 group-hover:opacity-100">
                <div className="font-medium">{t.ctr}% CTR</div>
                <div className="text-tertiary">{t.phase}</div>
                {isPeak && <div className="text-amber-400">◄ Peak</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Skeleton placeholder ── */
function SkeletonResults() {
  const pulse = "animate-pulse rounded bg-white/[0.04]";
  return (
    <div className="space-y-6 opacity-60">
      {/* Tier skeleton */}
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]" style={{ animationDelay: "0ms" }}>
        <div className={`${pulse} h-8 w-52 rounded-full`} />
      </div>

      {/* Metrics grid skeleton */}
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both] grid gap-3 sm:grid-cols-4" style={{ animationDelay: "50ms" }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className={`${pulse} h-3 w-12`} />
            <div className={`${pulse} mt-3 h-7 w-20`} />
          </div>
        ))}
      </div>

      {/* Timeline skeleton */}
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]" style={{ animationDelay: "100ms" }}>
        <div className={`${pulse} mb-3 h-4 w-56`} />
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
          <div className="mb-4 flex gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`${pulse} h-3 w-12`} />
            ))}
          </div>
          <div className="flex items-end gap-[3px]" style={{ height: 160 }}>
            {Array.from({ length: 15 }).map((_, i) => (
              <div key={i} className="flex flex-1 flex-col items-center" style={{ height: "100%" }}>
                <div className="flex flex-1 items-end w-full">
                  <div
                    className={`w-full rounded-t ${pulse}`}
                    style={{ height: `${15 + Math.sin(i * 0.7) * 30 + 30}%` }}
                  />
                </div>
                <div className={`${pulse} mt-1.5 h-2.5 w-4`} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Brain regions skeleton */}
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]" style={{ animationDelay: "150ms" }}>
        <div className={`${pulse} mb-3 h-4 w-48`} />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className="min-w-[140px] shrink-0 space-y-1.5">
                <div className={`${pulse} h-3 w-24`} />
                <div className={`${pulse} h-2 w-16`} />
              </div>
              <div className="flex-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div className={`h-full rounded-full ${pulse}`} style={{ width: `${90 - i * 15}%` }} />
                </div>
              </div>
              <div className={`${pulse} h-3 w-10`} />
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations skeleton */}
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]" style={{ animationDelay: "200ms" }}>
        <div className={`${pulse} mb-3 h-4 w-36`} />
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <div className={`${pulse} h-3 w-full max-w-[${80 - i * 10}%]`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Brain region horizontal bar ── */
function BrainRegionBar({
  region,
  maxImportance,
}: {
  region: ScoredResult["topBrainRegions"][0];
  maxImportance: number;
}) {
  const pct = Math.max(8, (region.importance / maxImportance) * 100);
  const isVideo = region.modality === "video";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 transition-[border-color] duration-150 hover:border-white/[0.1]">
      <div className="min-w-[140px] shrink-0">
        <div className="truncate text-[12px] font-medium text-white">{region.region}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-tertiary">
          <span className="uppercase">{region.hemisphere}</span>
          <span>·</span>
          <span className={isVideo ? "text-indigo-400" : "text-amber-400"}>{region.modality}</span>
        </div>
      </div>
      <div className="flex-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ease-out ${isVideo ? "bg-indigo-500/70" : "bg-amber-400/70"}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="shrink-0 font-mono text-[11px] text-secondary">{region.importance}</span>
    </div>
  );
}
