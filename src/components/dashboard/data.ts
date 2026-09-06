/** Mission day is one-based; the dashboard clamps pre-launch GET to day one. */
export function missionDay(currentSeconds: number): number {
  return Math.floor(currentSeconds / 86400) + 1;
}
