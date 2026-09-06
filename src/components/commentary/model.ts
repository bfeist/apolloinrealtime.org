/** DOM id for the commentary row representing `timeId`. */
export function commentaryItemId(timeId: string): string {
  return `comid${timeId}`;
}

/** Format the source label without interpreting historical data as HTML. */
export function defaultAttribution(entry: CommentaryEntry): string {
  return entry.source === "" ? "" : `(${entry.source})`;
}
