import { activityChunks, parseActivity } from "./data.js";

/** The always-visible channel strip loads only the current 1,000-second chunk.
 * Silence is a visual state, not a disabled control: every channel stays selectable. */
export function createChannelActivity(
  mission: "11" | "13",
  onActivity: (channels: readonly number[]) => void,
  audioRoot: string,
): { update: (seconds: number) => void } {
  const countdown = mission === "13" ? 127048 : 74768;
  let seconds = 0;
  let start: number | undefined;
  let rows: readonly (readonly number[])[] | undefined;
  let pending: AbortController | undefined;
  let retryAfter = 0;

  const render = (): void => {
    onActivity(rows?.[Math.floor(seconds + countdown) - (start ?? 0)] ?? []);
  };

  return {
    update(nextSeconds) {
      seconds = nextSeconds;
      const chunk = activityChunks(mission, seconds, 0)[0];
      if (chunk?.start !== start) {
        pending?.abort();
        pending = undefined;
        start = chunk?.start;
        rows = undefined;
        retryAfter = 0;
      }
      render();
      if (!chunk || rows || pending || Date.now() < retryAfter) return;
      const request = new AbortController();
      pending = request;
      void (async (): Promise<void> => {
        try {
          const response = await fetch(`${audioRoot}/tape_activity/${chunk.filename}`, {
            signal: request.signal,
          });
          if (!response.ok) throw new Error(String(response.status));
          const json: unknown = await response.json();
          if (request.signal.aborted) return;
          rows = parseActivity(json);
          render();
        } catch {
          if (!request.signal.aborted) retryAfter = Date.now() + 60_000;
        } finally {
          if (pending === request) pending = undefined;
        }
      })();
    },
  };
}
