/** Build chronological lookup views without relying on source-file row order. */
export function createTimeIndex<T extends { timeId: string; seconds: number }>(
  source: readonly T[],
): { entries: T[]; timeIds: string[]; byTimeId: Map<string, number> } {
  const entries = source
    .filter((entry) => Number.isFinite(entry.seconds))
    .sort((a, b) => a.seconds - b.seconds);
  return {
    entries,
    timeIds: entries.map((entry) => entry.timeId),
    byTimeId: new Map(entries.map((entry, index) => [entry.timeId, index])),
  };
}
