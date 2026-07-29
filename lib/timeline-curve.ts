/**
 * Port of dopa-model `build_timeline_curve` / `timeline_curve_for_api`.
 * Used when /v1/score omits `timeline_curve` so the Brain retention graph
 * still reflects the model hazard curve instead of a flat synthetic fade.
 */

import type { TimelineCurve } from "@/lib/dopa-api";

export function buildTimelineCurve({
  durationSeconds,
  attentionScore = 55,
  loadScore = 45,
}: {
  durationSeconds: number;
  attentionScore?: number;
  loadScore?: number;
}): TimelineCurve {
  const duration = Math.max(1, Math.round(durationSeconds));
  const attScore = clamp(attentionScore, 0, 100) / 100;
  const loadNorm = clamp(loadScore, 0, 100) / 100;

  const dt = 0.1;
  const seconds: number[] = [];
  const y: number[] = [];
  let hazardAcc = 0;

  const drop1 = Number((duration * 0.35).toFixed(1));
  const drop2 = Number((duration * 0.7).toFixed(1));
  const dropOffSeconds = [Math.round(drop1), Math.round(drop2)];

  for (let t = 0; t <= duration + 1e-9; t = Number((t + dt).toFixed(1))) {
    seconds.push(t);
    if (t <= 0) {
      y.push(1);
      continue;
    }

    let loadT: number;
    let attT: number;
    let earlyStress: number;
    if (t <= 3) {
      loadT = loadNorm * (0.6 + 0.4 * Math.sin((t * Math.PI) / 3));
      attT = attScore * (0.9 + 0.1 * Math.cos((t * Math.PI) / 3));
      earlyStress = 0.08 + 0.12 * Math.max(0, 1 - t / 3.5);
    } else {
      loadT = loadNorm * (0.8 + 0.3 * Math.sin(t * 1.2));
      attT = attScore * (0.7 + 0.3 * Math.cos(t * 0.8));
      earlyStress = 0;
    }

    let dipEvent = 0;
    if (Math.abs(t - drop1) < 0.3) dipEvent = 0.22;
    else if (Math.abs(t - drop2) < 0.3) dipEvent = 0.16;

    const attentionRelief = 0.025 * Math.max(0, attT - 0.45);
    const loadPressure = 0.03 * Math.max(0, loadT - attT);
    const instantHazard = clamp(
      0.04 + earlyStress + loadPressure + dipEvent - attentionRelief,
      0.008,
      0.55,
    );
    hazardAcc += instantHazard * dt;
    y.push(Number(clamp(Math.exp(-hazardAcc), 0.12, 1).toFixed(4)));
  }

  return { seconds, y, drop_off_seconds: dropOffSeconds };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
