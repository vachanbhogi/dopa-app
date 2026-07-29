"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  DopaApiError,
  fetchBrainAnimation,
  scoreAd,
  type BrainRegionResponse,
  type ScoreResponse,
} from "@/lib/dopa-api";
import { createClient } from "@/utils/supabase/client";

const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 60;

type AnalysisPhase =
  | "idle"
  | "validating"
  | "uploading"
  | "analyzing"
  | "loading-animation";

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
  const [animationUrl, setAnimationUrl] = useState<string | null>(null);
  const [result, setResult] = useState<ScoreResponse | null>(null);
  const [phase, setPhase] = useState<AnalysisPhase>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [animationError, setAnimationError] = useState<string | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  const previewUrlRef = useRef<string | null>(null);
  const animationUrlRef = useRef<string | null>(null);

  const busy = phase !== "idle";

  useEffect(
    () => () => {
      requestRef.current?.abort();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      if (animationUrlRef.current) {
        URL.revokeObjectURL(animationUrlRef.current);
      }
    },
    [],
  );

  const replacePreviewUrl = useCallback((next: string | null) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = next;
    setPreviewUrl(next);
  }, []);

  const replaceAnimationUrl = useCallback((next: string | null) => {
    if (animationUrlRef.current) {
      URL.revokeObjectURL(animationUrlRef.current);
    }
    animationUrlRef.current = next;
    setAnimationUrl(next);
  }, []);

  const resetResult = useCallback(() => {
    requestRef.current?.abort();
    requestRef.current = null;
    replaceAnimationUrl(null);
    setResult(null);
    setAnimationError(null);
    setUploadProgress(0);
    setPhase("idle");
  }, [replaceAnimationUrl]);

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
    setAnimationError(null);
    setUploadProgress(0);
    replaceAnimationUrl(null);
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
            if (percentage >= 100) setPhase("analyzing");
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
          setPhase("uploading");
          score = await submit(accessToken);
        } else {
          throw requestError;
        }
      }

      setResult(score);
      const animationPath = score.brain_response.animation_path;
      if (
        score.brain_response.status === "ready" &&
        animationPath
      ) {
        setPhase("loading-animation");
        try {
          const loadAnimation = (token: string) =>
            fetchBrainAnimation({
              path: animationPath,
              accessToken: token,
              signal: controller.signal,
            });
          let animation: Blob;
          try {
            animation = await loadAnimation(accessToken);
          } catch (animationRequestError) {
            if (
              animationRequestError instanceof DopaApiError &&
              animationRequestError.status === 401
            ) {
              accessToken = await refreshAccessToken();
              animation = await loadAnimation(accessToken);
            } else {
              throw animationRequestError;
            }
          }
          replaceAnimationUrl(URL.createObjectURL(animation));
        } catch (animationRequestError) {
          setAnimationError(
            animationRequestError instanceof Error
              ? animationRequestError.message
              : "The cortical response could not be loaded.",
          );
        }
      } else {
        setAnimationError(
          "The score is ready, but the cortical animation could not be rendered.",
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
        <p className="max-w-[720px] text-[14px] leading-6 text-secondary">
          Upload an ad to predict its average click-through rate and see the
          cortical response TRIBE v2 models for the clip.
        </p>
      </div>

      {!file ? (
        <div
          {...getRootProps()}
          className={`group cursor-pointer overflow-hidden rounded-xl border border-dashed transition-[border-color,background-color] duration-200 ${
            isDragActive
              ? "border-brand bg-brand/[0.07]"
              : "border-white/[0.1] bg-white/[0.018] hover:border-white/[0.2] hover:bg-white/[0.03]"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex aspect-video flex-col items-center justify-center px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04]">
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
          <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-black">
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

          <div className="flex flex-col gap-3 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
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
                className="inline-flex min-w-[146px] items-center justify-center gap-2 rounded-md bg-brand px-4 py-1.5 text-[12px] font-medium text-white transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-55"
              >
                {busy ? <Spinner /> : <BrainIcon />}
                {phaseLabel(phase)}
              </button>
            </div>
          </div>

          {busy ? (
            <div
              className="overflow-hidden rounded-full bg-white/[0.06]"
              aria-label={phaseLabel(phase)}
            >
              <div
                className={`h-1 bg-brand transition-[width] duration-300 ${
                  phase === "analyzing" || phase === "loading-animation"
                    ? "animate-pulse"
                    : ""
                }`}
                style={{
                  width:
                    phase === "uploading"
                      ? `${Math.max(uploadProgress, 4)}%`
                      : phase === "validating"
                        ? "12%"
                        : phase === "analyzing"
                          ? "72%"
                          : "92%",
                }}
              />
            </div>
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
          animationUrl={animationUrl}
          animationError={animationError}
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
    case "loading-animation":
      return "Loading response…";
    default:
      return "Analyze with TRIBE";
  }
}

function ScoreResults({
  result,
  animationUrl,
  animationError,
}: {
  result: ScoreResponse;
  animationUrl: string | null;
  animationError: string | null;
}) {
  const response = result.brain_response;
  return (
    <section
      aria-labelledby="analysis-result"
      className="animate-[stagger-in_500ms_cubic-bezier(0.23,1,0.32,1)_both] space-y-5 border-t border-white/[0.07] pt-7"
    >
      <div className="grid gap-5 rounded-xl border border-white/[0.08] bg-[linear-gradient(120deg,rgba(94,106,210,0.12),rgba(255,255,255,0.018)_55%)] p-5 sm:grid-cols-[1fr_auto] sm:items-end sm:p-6">
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
          <p className="mt-1 max-w-[520px] text-[12px] leading-5 text-secondary">
            Dopa&apos;s video-only model estimate for this creative—not a live
            campaign result.
          </p>
        </div>
        <div className="font-mono text-[48px] font-medium leading-none tracking-[-0.06em] text-white sm:text-[58px]">
          {result.score_percent.toFixed(2)}
          <span className="ml-1 text-[24px] text-[#9298d7]">%</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#050506]">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-4 py-3">
          <div>
            <h3 className="text-[13px] font-medium text-white">
              Predicted cortical response
            </h3>
            <p className="mt-0.5 text-[10px] text-tertiary">
              Average-subject fsaverage5 model · response changes over time
            </p>
          </div>
          <span className="rounded-full border border-[#f3a35b]/20 bg-[#f3a35b]/10 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.12em] text-[#f3b16f]">
            TRIBE v2
          </span>
        </div>

        <div className="aspect-video bg-[radial-gradient(circle_at_50%_45%,rgba(79,49,99,0.25),transparent_58%)]">
          {animationUrl ? (
            <video
              src={animationUrl}
              className="h-full w-full object-contain"
              controls
              loop
              muted
              playsInline
            />
          ) : (
            <div className="flex h-full items-center justify-center px-6 text-center">
              {animationError ? (
                <p className="max-w-[420px] text-[12px] leading-5 text-secondary">
                  {animationError}
                </p>
              ) : (
                <div className="flex items-center gap-2 text-[12px] text-secondary">
                  <Spinner />
                  Loading the cortical playback…
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid gap-px border-t border-white/[0.07] bg-white/[0.07] sm:grid-cols-4">
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

      <div className="rounded-lg border border-white/[0.07] bg-white/[0.018] px-4 py-3 text-[11px] leading-5 text-tertiary">
        <p>
          This is an in-silico prediction for an average subject. It is not an
          individual brain scan, a medical result, or evidence that the ad
          caused a behavior.
        </p>
        <p className="mt-2">
          Powered by{" "}
          <a
            href="https://github.com/facebookresearch/tribev2"
            target="_blank"
            rel="noreferrer"
            className="text-[#a9aff0] underline decoration-[#a9aff0]/30 underline-offset-2 hover:text-white"
          >
            Meta TRIBE v2
          </a>{" "}
          under{" "}
          <a
            href="https://github.com/facebookresearch/tribev2/blob/main/LICENSE"
            target="_blank"
            rel="noreferrer"
            className="text-[#a9aff0] underline decoration-[#a9aff0]/30 underline-offset-2 hover:text-white"
          >
            CC BY-NC 4.0
          </a>
          . Non-commercial demo.
        </p>
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
    <div className="grid gap-3 rounded-lg border border-white/[0.07] bg-white/[0.018] px-4 py-3 sm:grid-cols-[28px_180px_1fr_auto] sm:items-center">
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
      <div className="min-w-[92px]">
        <div className="mb-1 flex items-center justify-between font-mono text-[9px] text-tertiary">
          <span>Relative</span>
          <span>{Math.round(region.relative_response)}/100</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/[0.07]">
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
    <div className="border-t border-white/[0.07] pt-7">
      <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed border-white/[0.08] bg-white/[0.012] px-6 text-center">
        <div>
          <p className="text-[12px] font-medium text-white/70">
            Your analysis will appear here
          </p>
          <p className="mt-1.5 text-[11px] leading-5 text-tertiary">
            One real CTR prediction, cortical playback, and the strongest
            modeled regions.
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
