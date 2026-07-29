export function queuePositionLabel(position: number | null): string {
  if (position === 1) return "Next in line";
  if (position !== null && Number.isInteger(position) && position > 1) {
    return `#${position} in line`;
  }
  return "Waiting in line";
}

export function queueAutoStartCopy(resource: string): string {
  return `Starts automatically when the ${resource} is available`;
}

export function queuePositionFromAheadCounts(
  earlierJobs: number,
  tiedEarlierJobs: number,
): number {
  if (
    !Number.isInteger(earlierJobs) ||
    earlierJobs < 0 ||
    !Number.isInteger(tiedEarlierJobs) ||
    tiedEarlierJobs < 0
  ) {
    throw new RangeError("Queue counts must be non-negative integers.");
  }
  return earlierJobs + tiedEarlierJobs + 1;
}
