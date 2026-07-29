"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useDropzone, type FileRejection } from "react-dropzone";
import {
  DopaApiError,
  enqueueScoreAd,
  fetchBrainModel,
  fetchScoreJob,
  type BrainModelPayload,
  type ScoreJobResponse,
  type ScoreResponse,
} from "@/lib/dopa-api";
import { createClient } from "@/utils/supabase/client";
import { RetentionGraph } from "@/components/dashboard/RetentionGraph";
import {
  queueAutoStartCopy,
  queuePositionLabel,
} from "@/lib/queue-position";

const CorticalModelViewer = dynamic(
  () =>
    import("@/components/dashboard/CorticalModelViewer").then(
      (module) => module.CorticalModelViewer,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video items-center justify-center gap-2 bg-background text-[12px] text-secondary">
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
  | "queued"
  | "analyzing"
  | "loading-model";

function waitForQueuePoll(
  milliseconds: number,
  signal: AbortSignal,
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("Analysis cancelled.", "AbortError"));
      return;
    }
    const timeout = window.setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, milliseconds);
    const abort = () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Analysis cancelled.", "AbortError"));
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}

async function readVideoDuration(file: File): Promise<number | null> {
  const source = URL.createObjectURL(file);
  try {
    return await new Promise((resolve) => {
      const video = document.createElement("video");
      let settled = false;
      const finish = (value: number | null) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeout);
        video.removeAttribute("src");
        video.load();
        resolve(value);
      };
      const timeout = window.setTimeout(() => finish(null), 10_000);
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        finish(Number.isFinite(video.duration) ? video.duration : null);
      };
      video.onerror = () => finish(null);
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
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
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
    setQueuePosition(null);
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

      setPhase("validating");
      const nextDuration = await readVideoDuration(next);
      if (nextDuration !== null && nextDuration > MAX_VIDEO_SECONDS) {
        setError("Upload an ad that is 60 seconds or shorter.");
        setPhase("idle");
        return;
      }
      resetResult();
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
    setQueuePosition(null);
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
        enqueueScoreAd({
          file,
          accessToken,
          signal: controller.signal,
          onUploadProgress: setUploadProgress,
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
      let job: ScoreJobResponse;
      try {
        job = await submit(accessToken);
      } catch (requestError) {
        if (
          requestError instanceof DopaApiError &&
          requestError.status === 401
        ) {
          accessToken = await refreshAccessToken();
          setUploadProgress(0);
          analysisStartedAtRef.current = null;
          setPhase("uploading");
          job = await submit(accessToken);
        } else {
          throw requestError;
        }
      }

      const applyQueueState = (current: ScoreJobResponse) => {
        if (current.status === "queued") {
          analysisStartedAtRef.current = null;
          setAnalysisElapsedSeconds(0);
          setQueuePosition(current.position);
          setPhase("queued");
          return;
        }
        if (current.status === "processing") {
          setQueuePosition(null);
          if (analysisStartedAtRef.current === null) {
            const startedAt = current.started_at
              ? Date.parse(current.started_at)
              : Number.NaN;
            const elapsedBeforePoll = Number.isFinite(startedAt)
              ? Math.max(0, Date.now() - startedAt)
              : 0;
            analysisStartedAtRef.current =
              performance.now() - elapsedBeforePoll;
          }
          setPhase("analyzing");
        }
      };
      const loadJob = async () => {
        try {
          return await fetchScoreJob({
            jobId: job.job_id,
            accessToken,
            signal: controller.signal,
          });
        } catch (pollError) {
          if (
            pollError instanceof DopaApiError &&
            pollError.status === 401
          ) {
            accessToken = await refreshAccessToken();
            return fetchScoreJob({
              jobId: job.job_id,
              accessToken,
              signal: controller.signal,
            });
          }
          throw pollError;
        }
      };

      applyQueueState(job);
      while (job.status === "queued" || job.status === "processing") {
        await waitForQueuePoll(
          job.poll_after_seconds * 1_000,
          controller.signal,
        );
        try {
          job = await loadJob();
        } catch (pollError) {
          if (
            pollError instanceof DopaApiError &&
            (pollError.status === 0 || pollError.status >= 500)
          ) {
            await waitForQueuePoll(
              (pollError.retryAfter ?? 2) * 1_000,
              controller.signal,
            );
            continue;
          }
          throw pollError;
        }
        applyQueueState(job);
      }
      if (job.status === "failed") {
        throw new DopaApiError(
          job.error ?? "The ad could not be scored.",
          500,
        );
      }
      if (!job.result) {
        throw new DopaApiError(
          "The analysis queue finished without a score.",
        );
      }

      const score = job.result;
      setQueuePosition(null);
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
    <div className="animate-[stagger-in_400ms_cubic-bezier(0.23,1,0.32,1)_both] space-y-4">
      <input {...getInputProps()} />

      <p className="max-w-2xl text-[14px] leading-6 text-secondary">
        Upload an ad to predict its average click-through rate and see the
        cortical response TRIBE v2 models for the clip.
      </p>

      <AnalysisDesk
        file={file}
        fileDuration={duration}
        previewUrl={previewUrl}
        result={result}
        brainModel={brainModel}
        modelError={modelError}
        busy={busy}
        phase={phase}
        uploadProgress={uploadProgress}
        modelDownloadProgress={modelDownloadProgress}
        analysisElapsedSeconds={analysisElapsedSeconds}
        queuePosition={queuePosition}
        isDragActive={isDragActive}
        dropzoneProps={getRootProps()}
        onReplace={open}
        onAnalyze={analyze}
      />

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
    </div>
  );
}

function phaseLabel(
  phase: AnalysisPhase,
  queuePosition: number | null = null,
): string {
  switch (phase) {
    case "validating":
      return "Checking video…";
    case "uploading":
      return "Uploading…";
    case "queued":
      return queuePositionLabel(queuePosition);
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
  queuePosition,
}: {
  phase: AnalysisPhase;
  uploadProgress: number;
  modelDownloadProgress: number | null;
  analysisElapsedSeconds: number;
  queuePosition: number | null;
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
        : phase === "queued"
          ? queueAutoStartCopy("GPU")
          : phase === "analyzing"
            ? `Cortical inference · ${formatElapsed(analysisElapsedSeconds)} elapsed`
            : modelDownloadProgress === null
              ? "Downloading the cortical surface"
              : `${Math.round(modelDownloadProgress)}% downloaded`;
  const activeStep =
    phase === "validating" || phase === "uploading"
      ? 0
      : phase === "queued"
        ? 1
        : phase === "analyzing"
          ? 2
          : 3;

  return (
    <div
      className="rounded-lg border border-white/8 bg-white/2 px-3.5 py-3"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-[11px] font-medium text-white">
          {phaseLabel(phase, queuePosition)}
        </p>
        <p className="font-mono text-[9px] tabular-nums text-tertiary">
          {detail}
        </p>
      </div>

      <div
        className="relative mt-3 h-1 overflow-hidden rounded-full bg-white/6"
        role="progressbar"
        aria-label={phaseLabel(phase, queuePosition)}
        aria-valuemin={determinateProgress === null ? undefined : 0}
        aria-valuemax={determinateProgress === null ? undefined : 100}
        aria-valuenow={
          determinateProgress === null
            ? undefined
            : Math.round(determinateProgress)
        }
      >
        {determinateProgress === null ? (
          <div className="absolute inset-0 animate-[pulse_1.35s_ease-in-out_infinite] bg-[linear-gradient(90deg,transparent_0%,rgba(94,106,210,0.35)_26%,rgba(113,112,255,0.9)_52%,rgba(94,106,210,0.35)_74%,transparent_100%)]" />
        ) : (
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]"
            style={{ width: `${Math.max(0, determinateProgress)}%` }}
          />
        )}
      </div>

      <div className="mt-2.5 grid grid-cols-4 gap-2">
        {["Upload", "Queue", "Inference", "3D model"].map((label, index) => (
          <div
            key={label}
            className={`flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.11em] ${
              index < activeStep
                ? "text-brand"
                : index === activeStep
                  ? "text-white/75"
                  : "text-white/25"
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                index < activeStep
                  ? "bg-brand"
                  : index === activeStep
                    ? "animate-pulse bg-accent"
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

function AnalysisDesk({
  file,
  fileDuration,
  previewUrl,
  result,
  brainModel,
  modelError,
  busy,
  phase,
  uploadProgress,
  modelDownloadProgress,
  analysisElapsedSeconds,
  queuePosition,
  isDragActive,
  dropzoneProps,
  onReplace,
  onAnalyze,
}: {
  file: File | null;
  fileDuration: number | null;
  previewUrl: string | null;
  result: ScoreResponse | null;
  brainModel: BrainModelPayload | null;
  modelError: string | null;
  busy: boolean;
  phase: AnalysisPhase;
  uploadProgress: number;
  modelDownloadProgress: number | null;
  analysisElapsedSeconds: number;
  queuePosition: number | null;
  isDragActive: boolean;
  dropzoneProps: Record<string, unknown>;
  onReplace: () => void;
  onAnalyze: () => void;
}) {
  const response = result?.brain_response ?? null;
  const dominant = response?.top_regions[0] ?? null;
  const regions = response?.top_regions ?? [];
  const regionSlots = Array.from({ length: 5 }, (_, index) => regions[index] ?? null);
  const clipDuration = Math.max(
    response?.duration_seconds ?? fileDuration ?? 30,
    0.001,
  );

  return (
    <section aria-labelledby="analysis-result" className="space-y-4">
      <div className="dopa-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-tertiary">
            Neural desk {result ? "· live" : "· ready"}
          </p>
          <h2
            id="analysis-result"
            className="mt-1 truncate text-[14px] font-medium text-white"
          >
            {file?.name ?? "No creative selected"}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-[5px] border border-brand/25 bg-brand/10 px-2 py-1 font-mono text-[11px] text-brand">
            CTR{" "}
            {result ? `${result.score_percent.toFixed(2)}%` : "—"}
          </span>
          <span className="rounded-[5px] border border-white/10 px-2 py-1 text-[10px] text-tertiary">
            {result
              ? `${regions.length} regions`
              : "0 regions"}
          </span>
          <span className="rounded-[5px] border border-white/10 px-2 py-1 text-[10px] text-tertiary">
            {result
              ? `${response!.duration_seconds.toFixed(1)}s clip`
              : fileDuration !== null
                ? `${fileDuration.toFixed(1)}s clip`
                : "— clip"}
          </span>
          <button
            type="button"
            onClick={onAnalyze}
            disabled={busy || !file}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-medium text-white shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.16)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55"
          >
            {busy ? <Spinner /> : <BrainIcon />}
            {busy
              ? phaseLabel(phase, queuePosition)
              : result
                ? "Re-run"
                : "Analyze"}
          </button>
          <button
            type="button"
            onClick={onReplace}
            disabled={busy}
            className="rounded-lg border border-white/10 px-3 py-1.5 text-[12px] text-secondary transition-[border-color,color,transform] duration-150 hover:border-white/20 hover:text-white active:scale-[0.97] disabled:opacity-40"
          >
            {file ? "Replace" : "Upload"}
          </button>
        </div>
      </div>

      <div className="min-h-21">
        {busy ? (
          <AnalysisProgress
            phase={phase}
            uploadProgress={uploadProgress}
            modelDownloadProgress={modelDownloadProgress}
            analysisElapsedSeconds={analysisElapsedSeconds}
            queuePosition={queuePosition}
          />
        ) : (
          <div className="rounded-lg border border-white/8 bg-white/2 px-3.5 py-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-[11px] font-medium text-tertiary">
                {result ? "Analysis complete" : file ? "Ready to analyze" : "Waiting for creative"}
              </p>
              <p className="font-mono text-[9px] tabular-nums text-tertiary">
                Upload · Queue · Inference · 3D model
              </p>
            </div>
            <div className="relative mt-3 h-1 overflow-hidden rounded-full bg-white/6">
              <div
                className="h-full rounded-full bg-brand/40 transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ width: result ? "100%" : "0%" }}
              />
            </div>
            <div className="mt-2.5 grid grid-cols-4 gap-2">
              {["Upload", "Queue", "Inference", "3D model"].map((label) => (
                <div
                  key={label}
                  className={`flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-[0.11em] ${
                    result ? "text-brand" : "text-white/25"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      result ? "bg-brand" : "bg-white/15"
                    }`}
                  />
                  {label}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(20rem,0.95fr)]">
        <div className="space-y-4">
          <div className="dopa-panel overflow-hidden">
            <div className="relative bg-background">
              {!file ? (
                <div
                  {...dropzoneProps}
                  role="button"
                  aria-label="Choose an ad video"
                  className={`group flex aspect-video cursor-pointer flex-col items-center justify-center gap-3 border-b border-dashed px-6 text-center transition-[border-color,background-color] duration-200 ${
                    isDragActive
                      ? "border-brand bg-brand/8"
                      : "border-transparent hover:bg-white/3"
                  }`}
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-xl border transition-[border-color,background-color,box-shadow,transform] duration-200 ${
                      isDragActive
                        ? "scale-[0.97] border-brand/40 bg-brand/15 shadow-[0_0_28px_rgba(94,106,210,0.35)]"
                        : "border-white/8 bg-white/4 group-hover:border-brand/30 group-hover:bg-brand/10"
                    }`}
                  >
                    <UploadIcon active={isDragActive} />
                  </div>
                  <div>
                    <p className="text-[14px] font-medium text-white">
                      {isDragActive ? "Drop the ad here" : "Choose an ad video"}
                    </p>
                    <p className="mt-1 text-[12px] text-secondary">
                      MP4 or MOV · up to 60 seconds · 250 MB maximum
                    </p>
                  </div>
                </div>
              ) : (
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
              )}

              <div
                className={`pointer-events-none absolute bottom-3 right-3 max-w-[min(100%-1.5rem,18rem)] rounded-lg border border-white/10 bg-surface/90 px-3 py-2.5 backdrop-blur-md transition-opacity duration-200 ${
                  dominant ? "opacity-100" : "opacity-0"
                }`}
              >
                <p className="text-[9px] font-medium uppercase tracking-[0.08em] text-brand">
                  Peak · {dominant ? `${dominant.peak_second.toFixed(1)}s` : "—"}
                </p>
                <p className="mt-1 text-[13px] font-medium leading-snug text-white">
                  {dominant?.name ?? "Dominant region"}
                </p>
                <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-secondary">
                  {dominant?.description ??
                    "Peak cortical response will appear after analysis."}
                </p>
              </div>
            </div>

            <div className="border-t border-white/6 px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-tertiary">
                  Peak response track ·{" "}
                  {result ? `${regions.length} marks` : "awaiting"}
                </p>
                <p className="font-mono text-[10px] text-tertiary">
                  0s → {clipDuration.toFixed(1)}s
                </p>
              </div>
              <div className="relative h-9 overflow-hidden rounded-lg border border-white/8 bg-[#0c0d0e]">
                <div
                  className="absolute inset-0 opacity-40"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, transparent 0%, rgba(94,106,210,0.18) 50%, transparent 100%)",
                  }}
                />
                {regions.map((region, index) => {
                  const left = Math.min(
                    96,
                    Math.max(2, (region.peak_second / clipDuration) * 100),
                  );
                  const width = Math.max(
                    4,
                    Math.min(18, region.relative_response / 8),
                  );
                  return (
                    <div
                      key={region.region_id}
                      title={`${region.name} · ${region.peak_second.toFixed(1)}s`}
                      className="absolute top-1/2 h-5 -translate-y-1/2 rounded-sm border border-brand/40 bg-brand/35"
                      style={{
                        left: `${left}%`,
                        width: `${width}%`,
                        opacity: 0.55 + index * 0.08,
                      }}
                    />
                  );
                })}
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, index) => {
                  const region = regions[index];
                  return (
                    <div
                      key={region?.region_id ?? `placeholder-note-${index}`}
                      className="rounded-lg border border-white/8 bg-white/2 px-3 py-2"
                    >
                      <p className="font-mono text-[9px] text-brand">
                        {region
                          ? `${region.peak_second.toFixed(1)}s · ${Math.round(region.relative_response)}`
                          : "— · —"}
                      </p>
                      <p
                        className={`mt-0.5 truncate text-[12px] font-medium ${
                          region ? "text-white" : "text-tertiary"
                        }`}
                      >
                        {region?.name ?? "Region pending"}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile
              label="Predicted CTR"
              value={
                result ? `${result.score_percent.toFixed(2)}%` : "—"
              }
            />
            <MetricTile
              label="Analysis time"
              value={
                result ? `${result.processing_seconds.toFixed(1)}s` : "—"
              }
            />
            <MetricTile
              label="Hemodynamic lag"
              value={
                response
                  ? `${response.hemodynamic_lag_seconds.toFixed(0)}s`
                  : "—"
              }
            />
          </div>

          <RetentionGraph
            curve={result?.timeline_curve}
            fileDuration={fileDuration}
          />
        </div>

        <aside className="space-y-4">
          <div className="dopa-panel overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/6 px-4 py-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-tertiary">
                  Brain sync
                </p>
                <p className="mt-0.5 text-[12px] text-secondary">
                  Average-subject cortical model
                </p>
              </div>
              <a
                href="https://github.com/facebookresearch/tribev2"
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-brand/25 bg-brand/10 px-2 py-1 text-[9px] font-medium text-brand transition-colors hover:text-white"
              >
                TRIBE v2
              </a>
            </div>

            {brainModel ? (
              <CorticalModelViewer model={brainModel} compact />
            ) : (
              <div className="flex aspect-5/4 flex-col items-center justify-center gap-2 bg-[radial-gradient(ellipse_at_50%_45%,rgba(94,106,210,0.18),transparent_58%)] px-6 text-center">
                {modelError ? (
                  <p className="max-w-70 text-[12px] leading-5 text-secondary">
                    {modelError}
                  </p>
                ) : busy &&
                  (phase === "analyzing" || phase === "loading-model") ? (
                  <div className="flex items-center gap-2 text-[12px] text-secondary">
                    <Spinner />
                    Building cortex…
                  </div>
                ) : (
                  <>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-white/4 text-tertiary">
                      <BrainIcon />
                    </span>
                    <p className="text-[12px] text-secondary">
                      Cortex appears after analysis
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="border-t border-white/6 px-4 py-4">
              <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-tertiary">
                Dominant ROI
              </p>
              <div className="mt-2 flex items-end justify-between gap-3">
                <h3
                  className={`min-w-0 text-[18px] font-medium leading-tight tracking-[-0.02em] ${
                    dominant ? "text-white" : "text-tertiary"
                  }`}
                >
                  {dominant?.name ?? "Awaiting response"}
                </h3>
                <span className="shrink-0 font-mono text-[28px] font-medium leading-none tracking-[-0.04em] text-white">
                  {dominant
                    ? Math.round(dominant.relative_response)
                    : "—"}
                </span>
              </div>
              <p className="mt-2 text-[12px] leading-5 text-secondary">
                {dominant?.description ??
                  "The strongest modeled cortical region will land here."}
              </p>
            </div>

            <div className="space-y-2.5 border-t border-white/6 px-4 py-4">
              {regionSlots.map((region, index) => (
                <div key={region?.region_id ?? `placeholder-bar-${index}`}>
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <p
                      className={`truncate text-[12px] ${
                        region ? "text-white" : "text-tertiary"
                      }`}
                    >
                      {region?.name ?? `Region ${index + 1}`}
                    </p>
                    <span className="shrink-0 font-mono text-[10px] text-tertiary">
                      {region
                        ? (region.relative_response / 100).toFixed(2)
                        : "0.00"}
                    </span>
                  </div>
                  <div className="h-1 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full bg-brand transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
                      style={{
                        width: region ? `${region.relative_response}%` : "0%",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="dopa-panel px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-tertiary">
        {label}
      </p>
      <p className="mt-1.5 font-mono text-[18px] font-medium tracking-[-0.03em] text-white">
        {value}
      </p>
    </div>
  );
}

function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/25 border-t-white" />
  );
}

function UploadIcon({ active = false }: { active?: boolean }) {
  return (
    <svg
      className={`h-5 w-5 transition-colors duration-200 ${
        active ? "text-brand" : "text-secondary group-hover:text-brand"
      }`}
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
