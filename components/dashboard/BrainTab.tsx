"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  DopaApiError,
  fetchBrainModel,
  scoreAd,
  type BrainModelPayload,
  type BrainRegionResponse,
  type ScoreResponse,
} from "@/lib/dopa-api";
import { createClient } from "@/utils/supabase/client";

const CorticalModelViewer = dynamic(
  () =>
    import("@/components/dashboard/CorticalModelViewer").then(
      (module) => module.CorticalModelViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-[16/9] items-center justify-center gap-2 text-[12px] text-secondary">
        <Spinner />
        Preparing the interactive cortex…
      </div>
    ),
  },
);

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 60;

type AnalysisPhase =
  | "idle"
  | "validating"
  | "uploading"
  | "analyzing"
  | "loading-model";

async function readVideoDuration(file: File): Promise<number | null> {
  const source = URL.createObjectURL(file);
  try {
    return await new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve(Number.isFinite(video.duration) ? video.duration : null);
      };
      video.onerror = () => resolve(null);
      video.src = source;
    });
  } finally {
    URL.revokeObjectURL(source);
  }
}

function fileError(rejections: FileRejection[]): string {
  const code = rejections[0]?.errors[0]?.code;
  if (code === "file-too-large") {
    return "Upload an ad smaller than 250 MB.";
  }
  return "Upload an MP4 or QuickTime video.";
}

export function BrainTab() {
  const supabase = useMemo(() => createClient(), []);
  const [file, setFile] = useState<File | null>(null);
  const [duration, setDuration] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [brainModel, setBrainModel] = useState<BrainModelPayload | null>(null);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [modelDownloadProgress, setModelDownloadProgress] = useState<
    number | null
  >(null);
  const [analysisElapsedSeconds, setAnalysisElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const analysisStartedAtRef = useRef<number | null>(null);

  const busy = phase !== "idle";

  useEffect(
    () => () => {
      requestRef.current?.abort();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (phase !== "analyzing" || analysisStartedAtRef.current === null) return;
    const updateElapsed = () => {
      if (analysisStartedAtRef.current !== null) {
        setAnalysisElapsedSeconds(
          (performance.now() - analysisStartedAtRef.current) / 1000,
        );
      }
    };
    updateElapsed();
    const interval = window.setInterval(updateElapsed, 250);
    return () => window.clearInterval(interval);
  }, [phase]);

  const replacePreviewUrl = useCallback((next: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = next;
    setPreviewUrl(next);
  }, []);

  const resetResult = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    analysisStartedAtRef.current = null;
    setBrainModel(null);
    setResult(null);
    setModelError(null);
    setUploadProgress(0);
    setModelDownloadProgress(null);
    setAnalysisElapsedSeconds(0);
    setPhase("idle");
  }, []);

  const onDrop = useCallback(
    async (accepted: File[], rejections: FileRejection[]) => {
      setError(null);
      if (rejections.length > 0) {
        setError(fileError(rejections));
        return;
      }
      const next = accepted[0];
      if (!next) return;

      resetResult();
      setPhase("validating");
      const nextDuration = await readVideoDuration(next);
      if (nextDuration !== null && nextDuration > MAX_VIDEO_SECONDS) {
        setError("Upload an ad that is 60 seconds or shorter.");
        setPhase("idle");
        return;
      }
      setFile(next);
      replacePreviewUrl(URL.createObjectURL(next));
      setDuration(nextDuration);
      setPhase("idle");
    },
    [replacePreviewUrl, resetResult],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
    },
    maxSize: MAX_UPLOAD_BYTES,
    multiple: false,
    noClick: false,
    noKeyboard: false,
  });

  const analyze = async () => {
    if (!file || busy) return;
    setError(null);
    setModelError(null);
    setUploadProgress(0);
    setModelDownloadProgress(null);
    setAnalysisElapsedSeconds(0);
    analysisStartedAtRef.current = null;
    setBrainModel(null);
    setResult(null);

    const controller = new AbortController();
    requestRef.current = controller;
    setPhase("uploading");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new DopaApiError("Your session expired. Log in again.", 401);
      }

      const submit = (accessToken: string) =>
        scoreAd({
          file,
          accessToken,
          signal: controller.signal,
          onUploadProgress: (percentage) => {
            setUploadProgress(percentage);
            if (percentage >= 100) {
              if (analysisStartedAtRef.current === null) {
                analysisStartedAtRef.current = performance.now();
              }
              setPhase("analyzing");
            }
          },
        });

      let accessToken = session.access_token;
      const refreshAccessToken = async () => {
        const { data, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError || !data.session) {
          throw new DopaApiError("Your session expired. Log in again.", 401);
        }
        return data.session.access_token;
      };
      let score: ScoreResponse;
      try {
        score = await submit(accessToken);
      } catch (requestError) {
        if (
          requestError instanceof DopaApiError &&
          requestError.status === 401
        ) {
          accessToken = await refreshAccessToken();
          setUploadProgress(0);
          analysisStartedAtRef.current = null;
          setPhase("uploading");
          score = await submit(accessToken);
        } else {
          throw requestError;
        }
      }

      setResult(score);
      const modelPath = score.brain_response.model_path;
      if (score.brain_response.status === "ready" && modelPath) {
        setPhase("loading-model");
        try {
          const loadModel = (token: string) =>
            fetchBrainModel({
              path: modelPath,
              accessToken: token,
              signal: controller.signal,
              onDownloadProgress: setModelDownloadProgress,
            });
          let model: BrainModelPayload;
          try {
            model = await loadModel(accessToken);
          } catch (modelRequestError) {
            if (
              modelRequestError instanceof DopaApiError &&
              modelRequestError.status === 401
            ) {
              accessToken = await refreshAccessToken();
              model = await loadModel(accessToken);
            } else {
              throw modelRequestError;
            }
          }
          setModelDownloadProgress(100);
          setBrainModel(model);
        } catch (modelRequestError) {
          setModelError(
            modelRequestError instanceof Error
              ? modelRequestError.message
              : "The interactive cortical model could not be loaded.",
          );
        }
      } else {
        setModelError(
          "The score is ready, but the interactive cortical model could not be prepared.",
        );
      }
    } catch (requestError) {
      if (
        requestError instanceof DOMException &&
        requestError.name === "AbortError"
      ) {
        return;
      }
      const message =
        requestError instanceof Error
          ? requestError.message
          : "The ad could not be scored.";
      setError(message);
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      setPhase("idle");
    }
  };

  const clearFile = () => {
    resetResult();
    setFile(null);
    replacePreviewUrl(null);
    setDuration(null);
    setError(null);
  };

  return (
    <div className="space-y-7">
      <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both]">
        <p className="max-w-180 text-[14px] leading-6 text-secondary">
          Upload an ad to predict its average click-through rate and see the
          cortical response TRIBE v2 models for the clip.
        </p>
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={`group cursor-pointer overflow-hidden rounded-xl border border-dashed transition-[border-color,background-color] duration-200 ${
            isDragActive
              ? "border-brand bg-brand/6"
              : "border-white/8 bg-white/1.5 hover:border-white/15 hover:bg-white/2.5"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex aspect-video flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/8 bg-white/6">
              <UploadIcon />
            </div>
            <p className="mt-4 text-[14px] font-medium text-white">
              {isDragActive ? "Drop the ad here" : "Choose an ad video"}
            </p>
            <p className="mt-1.5 text-[12px] text-secondary">
              MP4 or MOV · up to 60 seconds · 250 MB maximum
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-white/8 bg-black">
            <div className="aspect-video">
              {previewUrl ? (
                <video
                  src={previewUrl}
                  className="h-full w-full object-contain"
                  controls
                  muted
                  playsInline
                />
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-lg border border-white/6 bg-white/2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-white">
                {file.name}
              </p>
              <p className="mt-0.5 text-[11px] text-secondary">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
                {duration !== null ? ` · ${duration.toFixed(1)} seconds` : ""}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={busy ? undefined : open}
                disabled={busy}
                className="rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-secondary transition-colors hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-40"
              >
                Replace
              </button>
              <button
                type="button"
                onClick={analyze}
                disabled={busy}
                className="inline-flex min-w-35 items-center justify-center gap-2 rounded-md bg-brand px-4 py-1.5 text-[12px] font-medium text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-55"
              >
                {busy ? <Spinner /> : <BrainIcon />}
                {phaseLabel(phase)}
              </button>
            </div>
          </div>

          {busy ? (
            <AnalysisProgress
              phase={phase}
              uploadProgress={uploadProgress}
              modelDownloadProgress={modelDownloadProgress}
              analysisElapsedSeconds={analysisElapsedSeconds}
            />
          ) : null}
        </div>
      )}

      {error ? (
        <div
          role="alert"
          className="flex items-start justify-between gap-4 rounded-lg border border-red-400/20 bg-red-400/[0.07] px-4 py-3 text-[12px] leading-5 text-red-200"
        >
          <span>{error}</span>
          {file ? (
            <button
              type="button"
              onClick={clearFile}
              className="shrink-0 text-red-200/70 underline underline-offset-2 hover:text-red-100"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <ScoreResults
          result={result}
          brainModel={brainModel}
          modelError={modelError}
        />
      ) : (
        <EmptyResult />
      )}
    </div>
  );
}

function phaseLabel(phase: AnalysisPhase): string {
  switch (phase) {
    case "validating":
      return "Checking video…";
    case "uploading":
      return "Uploading…";
    case "analyzing":
      return "Analyzing…";
    case "loading-model":
      return "Building 3D model…";
    default:
      return "Analyze";
  }
}

function formatElapsed(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  return `${minutes}:${String(wholeSeconds % 60).padStart(2, "0")}`;
}

function AnalysisProgress({
  phase,
  uploadProgress,
  modelDownloadProgress,
  analysisElapsedSeconds,
}: {
  phase: AnalysisPhase;
  uploadProgress: number;
  modelDownloadProgress: number | null;
  analysisElapsedSeconds: number;
}) {
  const determinateProgress =
    phase === "uploading"
      ? uploadProgress
      : phase === "loading-model"
        ? modelDownloadProgress
        : null;
  const detail =
    phase === "validating"
      ? "Reading the video metadata"
      : phase === "uploading"
        ? `${Math.round(uploadProgress)}% sent`
        : phase === "analyzing"
          ? `Cortical inference · ${formatElapsed(analysisElapsedSeconds)} elapsed`
          : modelDownloadProgress === null
            ? "Downloading the cortical surface"
            : `${Math.round(modelDownloadProgress)}% downloaded`;
  const activeStep =
    phase === "validating" || phase === "uploading"
      ? 0
      : phase === "analyzing"
        ? 1
        : 2;

  return (
    <div
      className="rounded-lg border border-white/[0.07] bg-white/[0.018] px-4 py-3"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-medium text-white">
          {phaseLabel(phase)}
        </p>
        <p className="font-mono text-[9px] tabular-nums text-tertiary">
          {detail}
        </p>
      </div>

      <div
        className="relative mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]"
        role="progressbar"
        aria-label={phaseLabel(phase)}
        aria-valuemin={determinateProgress === null ? undefined : 0}
        aria-valuemax={determinateProgress === null ? undefined : 100}
        aria-valuenow={
          determinateProgress === null
            ? undefined
            : Math.round(determinateProgress)
        }
      >
        {determinateProgress === null ? (
          <div className="absolute inset-0 animate-[pulse_1.35s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent_0%,rgba(127,115,255,0.35)_26%,rgba(46,220,255,0.9)_52%,rgba(127,115,255,0.35)_74%,transparent_100%)]" />
        ) : (
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#6e63e8,#2edcff)] transition-[width] duration-200"
            style={{ width: `${Math.max(0, determinateProgress)}%` }}
          />
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {["Upload", "Inference", "3D model"].map((label, index) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.11em] ${
              index < activeStep
                ? "text-[#73dfef]"
                : index === activeStep
                  ? "text-white/75"
                  : "text-white/25"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                index < activeStep
                  ? "bg-[#2edcff]"
                  : index === activeStep
                    ? "animate-pulse bg-[#8176ff]"
                    : "bg-white/15"
              }`}
            />
            {label}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScoreResults({
  result,
  brainModel,
  modelError,
}: {
  result: ScoreResponse;
  brainModel: BrainModelPayload | null;
  modelError: string | null;
}) {
  const response = result.brain_response;
  return (
    <section
      aria-labelledby="analysis-result"
      className="animate-[stagger-in_500ms_cubic-bezier(0.23,1,0.32,1)_both] space-y-5 border-t border-white/6 pt-7"
    >
      <div className="grid gap-5 rounded-xl border border-white/8 bg-[linear-gradient(120deg,rgba(94,106,210,0.12),rgba(255,255,255,0.018)_55%)] p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-6">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#9298d7]">
            Model output
          </p>
          <h2
            id="analysis-result"
            className="mt-3 text-[15px] font-medium text-white"
          >
            Predicted average CTR
          </h2>
          <p className="mt-1 max-w-130 text-[12px] leading-5 text-secondary">
            Dopa&apos;s video-only model estimate for this creative—not a live
            campaign result.
          </p>
        </div>
        <div className="font-mono text-[48px] font-medium leading-none tracking-[-0.06em] text-white sm:text-[58px]">
          {result.score_percent.toFixed(2)}
          <span className="ml-1 text-[24px] text-[#9298d7]">%</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/8 bg-[#050506]">
        <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
          <div>
            <h3 className="text-[13px] font-medium text-white">
              Predicted cortical response
            </h3>
            <p className="mt-0.5 text-[10px] text-tertiary">
              Average-subject fsaverage5 model · response changes over time
            </p>
          </div>
          <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.11em]">
            <a
              href="https://github.com/facebookresearch/tribev2"
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-[#7781ff]/20 bg-[#7781ff]/10 px-2 py-1 text-[#aeb4ff] transition-colors hover:border-[#7781ff]/35 hover:text-white"
            >
              TRIBE v2
            </a>
            <a
              href="https://github.com/facebookresearch/tribev2/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer"
              className="text-white/35 transition-colors hover:text-white/65"
            >
              CC BY-NC 4.0
            </a>
          </div>
        </div>

        <div>
          {brainModel ? (
            <CorticalModelViewer model={brainModel} />
          ) : (
            <div className="flex aspect-video items-center justify-center bg-[radial-gradient(circle_at_50%_45%,rgba(79,49,99,0.25),transparent_58%)] px-6 text-center">
              {modelError ? (
                <p className="max-w-105 text-[12px] leading-5 text-secondary">
                  {modelError}
                </p>
              ) : (
                <div className="flex items-center gap-2 text-[12px] text-secondary">
                  <Spinner />
                  Loading the interactive cortex…
                </div>
              )}
            </div>
          )}
        </div>

        <p className="border-t border-white/6 bg-[#09090b] px-4 py-2.5 text-[10px] leading-4 text-tertiary">
          Predicted average-subject cortical surface—not a scan or measured
          nerve map. Animated signal traces are a visual guide to the strongest
          modeled responses.
        </p>

        <div className="grid gap-px border-t border-white/6 bg-white/6 sm:grid-cols-4">
          <DataPoint
            label="Clip"
            value={`${response.duration_seconds.toFixed(1)}s`}
          />
          <DataPoint
            label="Analysis"
            value={`${result.processing_seconds.toFixed(1)}s`}
          />
          <DataPoint
            label="Hemodynamic adjustment"
            value={`${response.hemodynamic_lag_seconds.toFixed(0)}s`}
          />
          <DataPoint
            label="Server copy expires"
            value={
              response.expires_at
                ? new Date(response.expires_at).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "Unavailable"
            }
          />
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-[13px] font-medium text-white">
              Most responsive cortical regions
            </h3>
            <p className="mt-1 text-[11px] text-tertiary">
              Ranked within this clip; the scale is relative, not a probability.
            </p>
          </div>
        </div>
        <div className="grid gap-2">
          {response.top_regions.map((region, index) => (
            <RegionCard key={region.region_id} region={region} rank={index + 1} />
          ))}
        </div>
      </div>

    </section>
  );
}

function RegionCard({
  region,
  rank,
}: {
  region: BrainRegionResponse;
  rank: number;
}) {
  return (
    <div className="grid gap-3 rounded-lg border border-white/6 bg-white/1.5 px-4 py-3 sm:grid-cols-[28px_180px_1fr_auto] sm:items-center">
      <span className="font-mono text-[11px] text-tertiary">
        {String(rank).padStart(2, "0")}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-white">
          {region.name}
        </p>
        <p className="mt-0.5 text-[9px] uppercase tracking-[0.12em] text-tertiary">
          {region.hemisphere} hemisphere · peak {region.peak_second.toFixed(0)}s
        </p>
      </div>
      <p className="text-[11px] leading-5 text-secondary">
        {region.description}
      </p>
      <div className="min-w-23">
        <div className="mb-1 flex items-center justify-between font-mono text-[9px] text-tertiary">
          <span>Relative</span>
          <span>{Math.round(region.relative_response)}/100</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/6">
          <div
            className="h-full rounded-full bg-[linear-gradient(90deg,#6f64bb,#f3a35b)]"
            style={{ width: `${region.relative_response}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DataPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#09090b] px-4 py-3">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-tertiary">
        {label}
      </p>
      <p className="mt-1 text-[12px] text-white">{value}</p>
    </div>
  );
}

function EmptyResult() {
  return (
    <div className="border-t border-white/6 pt-7">
      <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-white/8 bg-white/1 px-6 text-center">
        <div>
          <p className="text-[12px] font-medium text-white/70">
            Your analysis will appear here
          </p>
          <p className="mt-1.5 text-[11px] leading-5 text-tertiary">
            One real CTR prediction, an interactive cortical model, and the
            strongest modeled regions.
          </p>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
  );
}

function UploadIcon() {
  return (
    <svg
      className="h-5 w-5 text-white/45"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 10V3M5 5.5 8 3l3 2.5" />
      <path d="M2 10v2.5a1 1 0 001 1h10a1 1 0 001-1V10" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M8 2v12" />
      <path d="M8 4c-1.5-1.5-4-1-4 1.5S6 8 8 8c-2 0-4.5.5-4 3s2.5 3 4 1.5" />
      <path d="M8 4c1.5-1.5 4-1 4 1.5S10 8 8 8c2 0 4.5.5 4 3s-2.5 3-4 1.5" />
    </svg>
  );
}
