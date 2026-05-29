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
import { describe, it, expect, beforeEach } from "vitest";
import { loadYouTubeIframeApi, _resetForTests } from "../../src/engines/ytplayer/index";

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
