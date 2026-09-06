/**
 * One contiguous run of TOC entries at the same level — what becomes
 * a single `<ul class="TOCli TOC{level}">` block in the rendered DOM.
 */
export interface TocGroup {
  readonly level: TocLevel;
  readonly items: readonly TocEntry[];
}

/**
 * Group consecutive TOC entries by level. Pure helper — exported so the
 * grouping logic can be unit-tested in Node without a DOM.
 *
 * Matches the legacy `TOC.html` layout, which emitted one `<ul class="TOC1">`
 * for each run of level-1 chapter rows, with `<ul class="TOC2">` blocks
 * between them for the level-2 sub-items.
 */
export function groupTocEntries(entries: readonly TocEntry[]): TocGroup[] {
  const groups: TocGroup[] = [];
  let current: { level: TocLevel; items: TocEntry[] } | null = null;
  for (const entry of entries) {
    // TS doesn't narrow `current` to non-null through an optional-chain
    // equality check, so this stays as an explicit null guard.
    // eslint-disable-next-line @typescript-eslint/prefer-optional-chain
    if (current === null || current.level !== entry.level) {
      current = { level: entry.level, items: [entry] };
      groups.push(current);
      continue;
    }
    current.items.push(entry);
  }
  return groups;
}

/** DOM id for the `<li>` that represents `timeId`. */
export function tocItemId(timeId: string): string {
  return `tocid${timeId}`;
}
