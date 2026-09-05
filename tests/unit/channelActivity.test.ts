import { afterEach, expect, it, vi } from "vitest";
import { createChannelActivity } from "../../src/panels/mocrviz/channelActivity.js";

afterEach(() => vi.unstubAllGlobals());

it("updates speaking buttons from tape-relative seconds without reloading the chunk", async () => {
  const rows = Array.from({ length: 1000 }, () => [] as number[]);
  rows[48] = [14, 50];
  rows[49] = [17];
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify(rows)));
  vi.stubGlobal("fetch", fetcher);
  const render = vi.fn();
  const activity = createChannelActivity("13", render, "https://media.test/MOCR_audio");
  activity.update(0);
  await vi.waitFor(() => {
    expect(render).toHaveBeenLastCalledWith([14, 50]);
  });
  activity.update(1);
  expect(render).toHaveBeenLastCalledWith([17]);
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher.mock.calls[0]?.[0]).toBe(
    "https://media.test/MOCR_audio/tape_activity/tape_activity_127000-127999.json",
  );
});

it("clears old activity on seek and ignores an aborted late response", async () => {
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
  const render = vi.fn();
  const activity = createChannelActivity("11", render, "https://media.test");
  activity.update(-74768);
  activity.update(-73768);
  await vi.waitFor(() => {
    expect(render).toHaveBeenLastCalledWith([50]);
  });
  finish?.(new Response(JSON.stringify([[14]])));
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(render).toHaveBeenLastCalledWith([50]);
});

it("keeps silence selectable and backs off after an unavailable recording", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
  vi.stubGlobal("fetch", fetcher);
  const render = vi.fn();
  const activity = createChannelActivity("13", render, "https://media.test");
  activity.update(0);
  await new Promise((resolve) => setTimeout(resolve, 0));
  activity.update(1);
  expect(render).toHaveBeenLastCalledWith([]);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
