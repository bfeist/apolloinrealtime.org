/**
 * Returns the seconds-until-wake-up if `entries[currentIndex]` represents
 * the crew sleeping, otherwise `null`. Pure helper for testing.
 */
export function timeToWakeup(
  entries: readonly CrewStatusEntry[],
  currentIndex: number,
  currentSeconds: number,
): number | null {
  const current = entries[currentIndex];
  if (!current) return null;
  if (!/sleeping/i.test(current.statusHtml)) return null;
  const next = entries[currentIndex + 1];
  if (!next) return null;
  const remaining = next.startSeconds - currentSeconds;
  return remaining > 0 ? remaining : null;
}
