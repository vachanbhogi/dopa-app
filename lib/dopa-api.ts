const DEFAULT_API_BASE_URL = "http://localhost:8000";

export const DOPA_API_BASE_URL = (
  process.env.NEXT_PUBLIC_DOPA_API_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

export type BrainRegionResponse = {
  region_id: string;
  name: string;
  hemisphere: "left" | "right";
  relative_response: number;
  peak_second: number;
  description: string;
};

export type BrainResponse = {
  status: "ready" | "unavailable";
  animation_path: string | null;
  expires_at: string | null;
  duration_seconds: number;
  hemodynamic_lag_seconds: number;
  top_regions: BrainRegionResponse[];
};

export type ScoreResponse = {
  metric: "predicted_average_ctr";
  score_percent: number;
  raw_mean_ictr: number;
  processing_seconds: number;
  model_load_seconds: number;
  peak_vram_mib: number;
  model_version: string;
  brain_response: BrainResponse;
};

export class DopaApiError extends Error {
  status: number;
  retryAfter: number | null;

  constructor(message: string, status = 0, retryAfter: number | null = null) {
    super(message);
    this.name = "DopaApiError";
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

function apiUrl(path: string): string {
  return path.startsWith("http://") || path.startsWith("https://")
    ? path
    : `${DOPA_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

function responseDetail(body: string, fallback: string): string {
  try {
    const parsed = JSON.parse(body) as { detail?: unknown };
    return typeof parsed.detail === "string" ? parsed.detail : fallback;
  } catch {
    return fallback;
  }
}

export function scoreAd({
  file,
  accessToken,
  signal,
  onUploadProgress,
}: {
  file: File;
  accessToken: string;
  signal: AbortSignal;
  onUploadProgress: (percentage: number) => void;
}): Promise<ScoreResponse> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    const abortRequest = () => request.abort();

    request.open("POST", apiUrl("/v1/score"));
    request.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    request.timeout = 10 * 60 * 1000;
    request.upload.onprogress = (event) => {
      if (event.lengthComputable && event.total > 0) {
        onUploadProgress(Math.min(100, (event.loaded / event.total) * 100));
      }
    };
    request.onload = () => {
      signal.removeEventListener("abort", abortRequest);
      if (request.status >= 200 && request.status < 300) {
        try {
          resolve(JSON.parse(request.responseText) as ScoreResponse);
        } catch {
          reject(new DopaApiError("The scoring API returned an invalid response."));
        }
        return;
      }
      const retryHeader = request.getResponseHeader("Retry-After");
      reject(
        new DopaApiError(
          responseDetail(request.responseText, "The ad could not be scored."),
          request.status,
          retryHeader ? Number.parseInt(retryHeader, 10) : null,
        ),
      );
    };
    request.onerror = () => {
      signal.removeEventListener("abort", abortRequest);
      reject(
        new DopaApiError(
          `Could not reach the Dopa API at ${DOPA_API_BASE_URL}.`,
        ),
      );
    };
    request.ontimeout = () => {
      signal.removeEventListener("abort", abortRequest);
      reject(new DopaApiError("Analysis took too long. Try a shorter ad."));
    };
    request.onabort = () => {
      signal.removeEventListener("abort", abortRequest);
      reject(new DOMException("Analysis cancelled.", "AbortError"));
    };

    signal.addEventListener("abort", abortRequest, { once: true });
    const body = new FormData();
    body.append("file", file);
    request.send(body);
  });
}

export async function fetchBrainAnimation({
  path,
  accessToken,
  signal,
}: {
  path: string;
  accessToken: string;
  signal: AbortSignal;
}): Promise<Blob> {
  const response = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal,
  });
  if (!response.ok) {
    const body = await response.text();
    throw new DopaApiError(
      responseDetail(body, "The cortical response could not be loaded."),
      response.status,
    );
  }
  return response.blob();
}
