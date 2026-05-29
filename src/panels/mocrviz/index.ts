/**
 * MOCRviz panel — typed mount (Phase 4.5, audio MVP).
 *
 * Renders a clickable channel grid and an embedded HTML5 `<audio>`
 * element controlled by {@link MocrvizAudioController}. The waveform
 * canvas, isometric MOCR console graphic, and transcript loader are
 * deferred to Phase 4.5b.
 *
 * The legacy MOCRviz lived in a sandboxed iframe and communicated with
 * the parent app through `window` globals. This typed panel mounts
 * directly into the host page — same process, same DOM, no iframe.
 *
 * Public surface returned by {@link createMocrvizPanel} matches the
 * other panels: a small command object the parent passes clock updates
 * to and tears down on unmount.
 */

import { findTapeForGet, loadTapeRangesData } from "../../data/tapeRangesData.js";
import { secondsToTimeStr } from "../../shell/clock.js";
import { channelsFor, type ChannelInfo, type MissionChannels } from "./channels.js";
import { MocrvizAudioController } from "./audio.js";
import type { MocrMissionId } from "./urls.js";

export interface MocrvizPanelOptions {
  /** Element the panel renders into. Contents are replaced. */
  container: HTMLElement;
  /** Mission id ("11" or "13"). */
  mission: MocrMissionId;
  /**
   * Mission media root, with trailing slash. Used to fetch
   * `MOCRviz/data/tape_ranges.csv`.
   */
  mediaRoot: string;
  /**
   * MOCR audio CDN root (no required trailing slash). e.g.
   * `https://media.../A13/MOCR_audio`.
   */
  audioRoot: string;
}

export interface MocrvizPanel {
  /** Forward a clock tick. */
  setClock(currentGetSeconds: number, isPlaying: boolean): void;
  /** Switch to a channel. No-op if not in the catalog or redacted. */
  setChannel(channel: number): void;
  /** Currently-selected channel. */
  getChannel(): number;
  /** Tear down DOM + audio. */
  destroy(): void;
}

/** Async mount: loads tape ranges, then renders. */
export async function createMocrvizPanel(
  options: MocrvizPanelOptions,
): Promise<MocrvizPanel | null> {
  const catalog = channelsFor(options.mission);
  if (catalog === null) return null;
  const tapes = await loadTapeRangesData(options.mediaRoot);
  return mountMocrvizPanel(options, catalog, tapes);
}

function mountMocrvizPanel(
  options: MocrvizPanelOptions,
  catalog: MissionChannels,
  tapes: TapeRangesData,
): MocrvizPanel {
  const { container } = options;
  container.replaceChildren();
  container.classList.add("mocrviz-panel");

  const status = document.createElement("div");
  status.className = "mocrviz-status";
  const statusChannel = document.createElement("div");
  const statusTape = document.createElement("div");
  const statusGet = document.createElement("div");
  status.append(statusChannel, statusTape, statusGet);

  const audioEl = document.createElement("audio");
  audioEl.preload = "auto";
  audioEl.controls = true;
  audioEl.className = "mocrviz-audio";

  const grid = document.createElement("div");
  grid.className = "mocrviz-channel-grid";

  const buttons = new Map<number, HTMLButtonElement>();
  const redacted = new Set(catalog.redacted);

  for (const info of catalog.all) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "mocrviz-channel";
    btn.dataset.channelId = String(info.id);
    btn.textContent = `${String(info.id)}. ${info.label}`;
    btn.title = info.description;
    if (redacted.has(info.id)) {
      btn.disabled = true;
      btn.classList.add("is-redacted");
    } else if (!catalog.available.includes(info.id)) {
      btn.disabled = true;
      btn.classList.add("is-unavailable");
    } else {
      btn.addEventListener("click", () => {
        setChannel(info.id);
      });
    }
    grid.append(btn);
    buttons.set(info.id, btn);
  }

  container.append(status, audioEl, grid);

  const controller = new MocrvizAudioController(
    {
      mission: options.mission,
      audioRoot: options.audioRoot,
      tapes,
      createAudio: () => audioEl,
      onTapeChange: (tape) => {
        statusTape.textContent =
          tape === null ? "tape: —" : `tape: ${tape.tapeId} (${tape.channelBank})`;
      },
    },
    catalog.defaultChannel,
  );

  let currentChannel = catalog.defaultChannel;
  let lastGetSeconds = 0;
  highlight(currentChannel);
  renderStatus(currentChannel, lastGetSeconds);

  function setChannel(channel: number): void {
    if (channel === currentChannel) return;
    if (redacted.has(channel)) return;
    if (!catalog.available.includes(channel)) return;
    currentChannel = channel;
    controller.setChannel(channel);
    highlight(channel);
    // Trigger tape resolution at the current time so the readout
    // updates without waiting for the next external tick.
    controller.tick(lastGetSeconds, !audioEl.paused);
    renderStatus(channel, lastGetSeconds);
  }

  function highlight(channel: number): void {
    for (const [id, btn] of buttons) btn.classList.toggle("is-active", id === channel);
  }

  function renderStatus(channel: number, getSeconds: number): void {
    const info: ChannelInfo | null = catalog.all.find((c) => c.id === channel) ?? null;
    statusChannel.textContent = `channel: ${String(channel)}${info === null ? "" : ` — ${info.label}`}`;
    statusGet.textContent = `GET: ${secondsToTimeStr(getSeconds)}`;
    const tape = findTapeForGet(tapes, channel, getSeconds);
    statusTape.textContent =
      tape === null || tape.tapeId === "T999"
        ? "tape: —"
        : `tape: ${tape.tapeId} (${tape.channelBank})`;
  }

  return {
    setClock(currentGetSeconds, isPlaying) {
      lastGetSeconds = currentGetSeconds;
      controller.tick(currentGetSeconds, isPlaying);
      renderStatus(currentChannel, currentGetSeconds);
    },
    setChannel,
    getChannel() {
      return currentChannel;
    },
    destroy() {
      controller.destroy();
      container.replaceChildren();
      container.classList.remove("mocrviz-panel");
    },
  };
}
