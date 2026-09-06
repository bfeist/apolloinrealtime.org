import { QueryClient } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import { channelActivityOptions } from "../../src/components/mocrviz/queries.js";
import { activityChunks } from "../../src/components/mocrviz/data.js";

const clients: QueryClient[] = [];
function client(): QueryClient {
  const result = new QueryClient();
  clients.push(result);
  return result;
}
afterEach(() => {
  clients.forEach((cache) => {
    cache.clear();
  });
  clients.length = 0;
  vi.unstubAllGlobals();
});

it("shares the current recording chunk between strip and timeline requests", async () => {
  const rows = Array.from({ length: 1000 }, () => [] as number[]);
  rows[48] = [14, 50];
  rows[49] = [17];
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(rows)));
  vi.stubGlobal("fetch", fetcher);
  const cache = client();
  const chunk = activityChunks("13", 0, 0)[0];
  if (!chunk) throw new Error("Missing chunk");
  const options = channelActivityOptions("13", "https://media.test/MOCR_audio", chunk);
  const [strip, timeline] = await Promise.all([cache.query(options), cache.query(options)]);
  expect(strip[48]).toEqual([14, 50]);
  expect(timeline[49]).toEqual([17]);
  expect(await cache.query(options)).toEqual(rows);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    "https://media.test/MOCR_audio/tape_activity/tape_activity_127000-127999.json",
  );
});

it("keeps mission and chunk data isolated when a seek completes out of order", async () => {
  let finish: ((response: Response) => void) | undefined;
  const fetcher = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise<Response>((resolve) => {
          finish = resolve;
        }),
    )
    .mockResolvedValue(new Response(JSON.stringify([[50]])));
  vi.stubGlobal("fetch", fetcher);
  const cache = client();
  const first = activityChunks("11", -74768, 0)[0];
  const second = activityChunks("11", -73768, 0)[0];
  if (!first || !second) throw new Error("Missing chunks");
  const old = channelActivityOptions("11", "https://media.test", first);
  const next = channelActivityOptions("11", "https://media.test", second);
  const pending = cache.query(old);
  expect(await cache.query(next)).toEqual([[50]]);
  finish?.(new Response(JSON.stringify([[14]])));
  await pending;
  expect(cache.getQueryData(next.queryKey)).toEqual([[50]]);
  expect(channelActivityOptions("13", "https://media.test", second).queryKey).not.toEqual(
    next.queryKey,
  );
});

it("reports unavailable activity without automatic retry bursts", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
  vi.stubGlobal("fetch", fetcher);
  const cache = client();
  const chunk = activityChunks("13", 0, 0)[0];
  if (!chunk) throw new Error("Missing chunk");
  await expect(
    cache.query(channelActivityOptions("13", "https://media.test", chunk)),
  ).rejects.toThrow("404");
  expect(fetcher).toHaveBeenCalledTimes(1);
});
