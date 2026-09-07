/**
 * @vitest-environment node
 *
 * The DOM-injection path of `loadYouTubeIframeApi` is exercised by manual
 * browser smoke + future Phase 5 browser tests. These unit tests cover only
 * the parts that work without a real `document`:
 *   - the already-loaded fast path
 *   - the cached-promise behavior
 *   - the `_resetForTests` seam
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  loadYouTubeIframeApi,
  syncYouTubePlayback,
  youtubePlayerVars,
  _resetForTests,
} from "../../src/engines/ytplayer/index";

function fakeYT(): YTNamespace {
  return {
    Player: function FakePlayer() {
      // empty
    } as unknown as YTNamespace["Player"],
    PlayerState: {
      UNSTARTED: -1,
      ENDED: 0,
      PLAYING: 1,
      PAUSED: 2,
      BUFFERING: 3,
      CUED: 5,
    },
  };
}

// Minimal `window` shim so the loader's `window.YT` lookup works in a Node
// environment. We're only exercising the already-loaded code path.
interface MinimalWindow {
  YT?: YTNamespace;
  onYouTubeIframeAPIReady?: () => void;
}
const g = globalThis as unknown as { window: MinimalWindow };

afterEach(() => vi.unstubAllGlobals());

describe("loadYouTubeIframeApi (already-loaded path)", () => {
  beforeEach(() => {
    _resetForTests();
    g.window = {};
  });

  it("resolves immediately when YT global is already present", async () => {
    const yt = fakeYT();
    g.window = { YT: yt };
    const result = await loadYouTubeIframeApi();
    expect(result).toBe(yt);
  });

  it("returns the same cached promise on repeated calls", () => {
    const yt = fakeYT();
    g.window = { YT: yt };
    const first = loadYouTubeIframeApi();
    const second = loadYouTubeIframeApi();
    expect(first).toBe(second);
  });

  it("_resetForTests forces a fresh promise", async () => {
    const yt1 = fakeYT();
    g.window = { YT: yt1 };
    const first = await loadYouTubeIframeApi();
    expect(first).toBe(yt1);

    _resetForTests();
    const yt2 = fakeYT();
    g.window = { YT: yt2 };
    const second = await loadYouTubeIframeApi();
    expect(second).toBe(yt2);
    expect(second).not.toBe(yt1);
  });
});

describe("loadYouTubeIframeApi failure recovery", () => {
  it("retries a failed script load on a later mission visit", async () => {
    _resetForTests();
    const previous = vi.fn();
    g.window = { onYouTubeIframeAPIReady: previous };
    const scripts: { onerror: (() => void) | null; remove: () => void }[] = [];
    vi.stubGlobal("document", {
      createElement: () => {
        const script = { onerror: null as (() => void) | null, remove: vi.fn() };
        scripts.push(script);
        return script;
      },
      getElementsByTagName: () => [],
      head: { appendChild: vi.fn() },
    });
    const first = loadYouTubeIframeApi();
    const rejected = expect(first).rejects.toThrow("Failed to load youtube.com/iframe_api");
    scripts[0]?.onerror?.();
    await rejected;
    expect(scripts[0]?.remove).toHaveBeenCalledOnce();
    expect(g.window.onYouTubeIframeAPIReady).toBe(previous);

    const retry = loadYouTubeIframeApi();
    expect(retry).not.toBe(first);
    expect(scripts).toHaveLength(2);
    const yt = fakeYT();
    g.window.YT = yt;
    g.window.onYouTubeIframeAPIReady?.();
    await expect(retry).resolves.toBe(yt);
    expect(previous).toHaveBeenCalledOnce();
    expect(g.window.onYouTubeIframeAPIReady).toBe(previous);
    expect(loadYouTubeIframeApi()).toBe(retry);
  });
});

describe("youtubePlayerVars", () => {
  it("disables YouTube captions, annotations, controls, keyboard and fullscreen UI", () => {
    expect(youtubePlayerVars("https://example.test")).toMatchObject({
      controls: 0,
      disablekb: 1,
      fs: 0,
      iv_load_policy: 3,
      cc_load_policy: 0,
      autohide: 1,
      modestbranding: 1,
      origin: "https://example.test",
    });
  });
});

describe("syncYouTubePlayback", () => {
  const states = fakeYT().PlayerState;

  it("corrects a late YouTube play transition after the mission was paused", () => {
    const player = { playVideo: vi.fn(), pauseVideo: vi.fn() };
    syncYouTubePlayback(player, states.PLAYING, false, states);
    expect(player.pauseVideo).toHaveBeenCalledOnce();
    expect(player.playVideo).not.toHaveBeenCalled();
  });

  it("restarts a paused iframe while mission playback remains active", () => {
    const player = { playVideo: vi.fn(), pauseVideo: vi.fn() };
    syncYouTubePlayback(player, states.PAUSED, true, states);
    expect(player.playVideo).toHaveBeenCalledOnce();
    expect(player.pauseVideo).not.toHaveBeenCalled();
  });

  it("leaves matching playing, buffering and paused states alone", () => {
    const player = { playVideo: vi.fn(), pauseVideo: vi.fn() };
    syncYouTubePlayback(player, states.PLAYING, true, states);
    syncYouTubePlayback(player, states.BUFFERING, true, states);
    syncYouTubePlayback(player, states.PAUSED, false, states);
    expect(player.playVideo).not.toHaveBeenCalled();
    expect(player.pauseVideo).not.toHaveBeenCalled();
  });
});
