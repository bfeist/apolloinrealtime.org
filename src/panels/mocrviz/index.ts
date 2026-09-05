/** Native Mission Control audio explorer. Real tape activity, waveform and
 * channel transcripts share the app's canonical clock; no iframe or globals. */
import "../../styles/panels/mocrviz.css";
import { findTapeForGet, loadTapeRangesData } from "../../data/tapeRangesData.js";
import { secondsToTimeStr } from "../../shell/clock.js";
import { channelsFor, type MissionChannels } from "./channels.js";
import { MocrvizAudioController } from "./audio.js";
import { waveformDataUrl, type MocrMissionId } from "./urls.js";
import {
  activityChunks,
  closestChannelUtterance,
  parseActivity,
  parseChannelTranscript,
  parseWaveform,
  type ChannelUtterance,
  type WaveformData,
} from "./data.js";
import { CONSOLES } from "./consoles.js";
import { drawTimeline, timelineSeek, TIMELINE } from "./timeline.js";

export interface MocrvizPanelOptions {
  container: HTMLElement;
  mission: MocrMissionId;
  /** Local mission assets, e.g. /13/. */
  mediaRoot: string;
  /** Media CDN's A11/MOCR_audio or A13/MOCR_audio directory. */
  audioRoot: string;
  countdownSeconds?: number;
  onSeek?: (seconds: number) => void;
  onChannelChange?: (channel: number) => void;
  onPlayingChange?: (playing: boolean) => void;
}

export interface MocrvizPanel {
  setClock(currentGetSeconds: number, isPlaying: boolean): void;
  setChannel(channel: number): void;
  getChannel(): number;
  setMuted(muted: boolean): void;
  destroy(): void;
}

export async function createMocrvizPanel(
  options: MocrvizPanelOptions,
): Promise<MocrvizPanel | null> {
  const catalog = channelsFor(options.mission);
  if (!catalog) return null;
  const tapes = await loadTapeRangesData(options.mediaRoot);
  return mountMocrvizPanel(options, catalog, tapes);
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function mountMocrvizPanel(
  options: MocrvizPanelOptions,
  catalog: MissionChannels,
  tapes: TapeRangesData,
): MocrvizPanel {
  const { container } = options;
  container.replaceChildren();
  container.classList.add("mocrviz-panel");
  const abort = new AbortController();
  const root = options.audioRoot.replace(/\/+$/, "");
  const countdown = options.countdownSeconds ?? (options.mission === "13" ? 127048 : 74768);
  const labels = new Map(catalog.all.map((ch) => [ch.id, ch.label]));
  const orderedChannels = [...catalog.available].sort((a, b) => a - b);
  let currentChannel = catalog.defaultChannel;
  let seconds = 0;
  let playing = false;
  let destroyed = false;
  let wave: WaveformData | null = null;
  let waveKey = "";
  let waveAbort: AbortController | null = null;
  let transcriptAbort: AbortController | null = null;
  let waveMessage = "Select a channel to explore the recording";
  let tapeStart = 0;
  let transcript: ChannelUtterance[] = [];
  let transcriptRequest = 0;
  let transcriptIndex = -2;
  let transcriptStart = -1;
  let transcriptEnd = -1;
  let activityMessage = "Loading recorded channel activity…";
  const activity = new Map<number, readonly (readonly number[])[]>();
  const requestedActivity = new Set<number>();
  const failedActivity = new Map<number, number>();
  let audioError = "";

  const toolbar = element("div", "mocrviz-toolbar");
  const heading = element("strong", "mocrviz-heading", "MISSION CONTROL AUDIO");
  const playButton = element("button", "mocrviz-play", "▶ Play");
  playButton.type = "button";
  playButton.addEventListener("click", () => {
    playing = !playing;
    options.onPlayingChange?.(playing);
    controller.tick(seconds, playing);
    render();
  });
  const clock = element("span", "mocrviz-clock");
  toolbar.append(heading, clock, playButton);
  const canvas = element("canvas", "mocrviz-timeline");
  canvas.setAttribute(
    "aria-label",
    "Recorded channel activity and audio waveform. Click to select a channel and seek in mission time.",
  );
  canvas.setAttribute("role", "img");
  const instruction = element(
    "p",
    "mocrviz-instruction",
    "Click the activity timeline to seek. Select a controller in the room or a channel below.",
  );
  const bottom = element("div", "mocrviz-bottom");
  const controls = element("section", "mocrviz-controls");
  const room = element("div", "mocrviz-room");
  const roomImage = element("img", "mocrviz-room-image");
  roomImage.src = `${options.mediaRoot.replace(/\/+$/, "")}/MOCRviz/img/MOCR_consoles_dark_faded.png`;
  roomImage.alt = "Isometric layout of the Apollo Mission Operations Control Room";
  roomImage.width = 746;
  roomImage.height = 419;
  room.append(roomImage);
  const buttons: HTMLButtonElement[] = [];
  function channelButton(channel: number, label: string, className: string): HTMLButtonElement {
    const button = element("button", className, label);
    button.type = "button";
    button.dataset.channelId = String(channel);
    const info = catalog.all.find((entry) => entry.id === channel);
    button.title = `${info?.label ?? label}: ${info?.description ?? ""}`;
    button.setAttribute("aria-label", `Channel ${String(channel)}, ${info?.label ?? label}`);
    button.addEventListener("click", () => {
      setChannel(channel);
    });
    buttons.push(button);
    return button;
  }
  for (const [positionChannel, x, y, label, small] of CONSOLES) {
    // A11's far-right console is FLIGHT [R], not A13's INCO position.
    const channel = options.mission === "11" && positionChannel === 53 ? 8 : positionChannel;
    const missionLabels: Readonly<Record<number, string>> =
      options.mission === "11"
        ? { 16: "I", 17: "E", 18: "G", 5: "O", 57: "C", 53: "FR" }
        : { 16: "CE", 17: "PE", 18: "CG", 57: "LG" };
    const dotLabel = missionLabels[positionChannel] ?? label;
    const button = channelButton(channel, dotLabel, "mocrviz-console");
    const size = small ? 30 : 44;
    button.style.left = `${String((x / 746) * 100)}%`;
    button.style.top = `${String(((y - 68) / 419) * 100)}%`;
    button.style.width = `${String((size / 746) * 100)}%`;
    room.append(button);
  }
  const channelName = element("h3", "mocrviz-channel-name");
  const channelDescription = element("p", "mocrviz-channel-description");
  const grid = element("div", "mocrviz-channel-grid");
  for (const id of catalog.available)
    grid.append(channelButton(id, labels.get(id) ?? String(id), "mocrviz-channel"));
  const details = element("details", "mocrviz-channel-details");
  details.append(element("summary", "", "All recorded channels"), grid);
  details.open = false;
  controls.append(room, channelName, channelDescription, details);

  const transcriptPanel = element("section", "mocrviz-transcript-panel");
  const transcriptTitle = element("h3", "mocrviz-transcript-title", "CHANNEL TRANSCRIPT");
  const search = element("input", "mocrviz-transcript-search");
  search.type = "search";
  search.placeholder = "Search this channel";
  search.setAttribute("aria-label", "Search this channel transcript");
  const transcriptList = element("div", "mocrviz-transcript", "Loading channel transcript…");
  const transcriptNote = element(
    "p",
    "mocrviz-transcript-note",
    "Machine transcription · may contain errors",
  );
  transcriptPanel.append(transcriptTitle, search, transcriptList, transcriptNote);
  bottom.append(controls, transcriptPanel);
  const audio = element("audio", "mocrviz-audio");
  audio.preload = "metadata";
  const status = element("p", "mocrviz-status");
  container.append(toolbar, canvas, instruction, bottom, status, audio);

  const controller = new MocrvizAudioController(
    { mission: options.mission, audioRoot: root, tapes, createAudio: () => audio },
    currentChannel,
  );
  audio.addEventListener("error", () => {
    audioError = audio.src;
    status.textContent = "Audio could not be loaded. Select another channel or mission time.";
  });
  audio.addEventListener("loadedmetadata", () => {
    audioError = "";
    if (!destroyed) controller.tick(seconds, playing);
  });
  canvas.addEventListener("click", (event) => {
    const rect = canvas.getBoundingClientRect();
    const row = Math.floor((event.clientY - rect.top - TIMELINE.top) / TIMELINE.rowHeight);
    const channel = orderedChannels[row];
    if (channel !== undefined && row >= 0) setChannel(channel);
    if (event.clientX - rect.left >= TIMELINE.labelWidth)
      seek(timelineSeek(event.clientX - rect.left, rect.width, seconds));
  });
  function seek(next: number): void {
    options.onSeek?.(Math.round(next));
    seconds = Math.round(next);
    update();
  }
  function activityAt(get: number): readonly number[] | undefined {
    const index = Math.floor(get + countdown);
    const start = Math.floor(index / 1000) * 1000;
    return activity.get(start)?.[index - start];
  }
  function draw(): void {
    if (destroyed) return;
    const currentChunks = activityChunks(options.mission, seconds, TIMELINE.halfWindow);
    activityMessage =
      currentChunks.length === 0
        ? "No activity recording at this mission time"
        : currentChunks.some((chunk) => failedActivity.has(chunk.start))
          ? "Some channel activity is unavailable"
          : currentChunks.every((chunk) => activity.has(chunk.start))
            ? ""
            : "Loading recorded channel activity?";
    drawTimeline(canvas, {
      seconds,
      channel: currentChannel,
      channels: orderedChannels,
      labels,
      activityAt,
      waveform: wave,
      tapeStart,
      activityMessage,
      waveformMessage: waveMessage,
    });
  }
  async function fetchActivity(): Promise<void> {
    const chunks = activityChunks(options.mission, seconds, TIMELINE.halfWindow);
    await Promise.all(
      chunks.map(async (chunk) => {
        if (requestedActivity.has(chunk.start)) return;
        const failedAt = failedActivity.get(chunk.start);
        if (failedAt !== undefined && Date.now() - failedAt < 60000) return;
        requestedActivity.add(chunk.start);
        try {
          const response = await fetch(`${root}/tape_activity/${chunk.filename}`, {
            signal: abort.signal,
          });
          if (!response.ok) throw new Error(String(response.status));
          const json: unknown = await response.json();
          if (destroyed) return;
          activity.set(chunk.start, parseActivity(json));
          failedActivity.delete(chunk.start);
          // Keep nearby chunks; long exploratory sessions must not retain a mission's entire dataset.
          if (activity.size > 8) {
            const farthest = [...activity.keys()].sort(
              (a, b) => Math.abs(b - seconds - countdown) - Math.abs(a - seconds - countdown),
            )[0];
            if (farthest !== undefined) {
              activity.delete(farthest);
              requestedActivity.delete(farthest);
            }
          }
        } catch {
          requestedActivity.delete(chunk.start);
          failedActivity.set(chunk.start, Date.now());
        }
      }),
    );
    render();
  }
  async function fetchWaveform(tape: TapeRange | null): Promise<void> {
    const key =
      tape === null || tape.tapeId === "T999"
        ? "gap"
        : `${tape.tapeId}/${tape.channelBank}/${String(currentChannel)}`;
    if (key === waveKey) return;
    waveKey = key;
    waveAbort?.abort();
    waveAbort = new AbortController();
    const signal = waveAbort.signal;
    wave = null;
    if (tape === null || tape.tapeId === "T999") {
      waveMessage = "No recording at this mission time";
      return;
    }
    tapeStart = tape.startSeconds;
    waveMessage = "Loading recorded waveform…";
    try {
      const response = await fetch(
        waveformDataUrl(root, options.mission, tape.tapeId, tape.channelBank, currentChannel),
        { signal },
      );
      if (!response.ok) throw new Error(String(response.status));
      const parsed = parseWaveform(await response.arrayBuffer());
      if (waveKey === key) {
        wave = parsed;
        waveMessage = "";
      }
    } catch {
      if (waveKey === key) waveMessage = "Waveform unavailable for this recording";
    }
    draw();
  }
  async function fetchTranscript(): Promise<void> {
    const request = ++transcriptRequest;
    transcriptAbort?.abort();
    transcriptAbort = new AbortController();
    const signal = transcriptAbort.signal;
    transcript = [];
    transcriptIndex = -2;
    transcriptStart = -1;
    transcriptEnd = -1;
    search.value = "";
    transcriptTitle.textContent = `${labels.get(currentChannel) ?? "CHANNEL"} TRANSCRIPT`;
    transcriptList.textContent = "Loading channel transcript…";
    try {
      const response = await fetch(
        `${root}/transcripts/CH${String(currentChannel)}_transcript.txt`,
        { signal },
      );
      if (!response.ok) throw new Error(String(response.status));
      const entries = parseChannelTranscript(await response.text());
      if (request !== transcriptRequest || destroyed) return;
      transcript = entries;
      transcriptList.textContent = entries.length ? "" : "No transcript for this channel.";
      renderTranscript(true);
    } catch {
      if (request === transcriptRequest && !destroyed)
        transcriptList.textContent = "Transcript unavailable for this channel.";
    }
  }
  function appendTranscriptRow(entry: ChannelUtterance, index: number): void {
    const row = element("button", "mocrviz-utterance");
    row.type = "button";
    row.dataset.index = String(index);
    row.classList.toggle("is-active", index === transcriptIndex);
    row.append(
      element("time", "", secondsToTimeStr(entry.seconds)),
      element("span", "", entry.text),
    );
    row.addEventListener("click", () => {
      search.value = "";
      seek(entry.seconds);
      renderTranscript(true);
    });
    transcriptList.append(row);
  }
  function renderTranscript(force = false): void {
    if (transcript.length === 0) return;
    const query = search.value.trim().toLowerCase();
    const index = closestChannelUtterance(transcript, seconds);
    if (!force && (query || index === transcriptIndex)) return;
    transcriptIndex = index;
    if (query) {
      transcriptList.replaceChildren();
      let count = 0;
      transcript.forEach((entry, i) => {
        if (count < 200 && entry.text.toLowerCase().includes(query)) {
          appendTranscriptRow(entry, i);
          count++;
        }
      });
      if (!count) transcriptList.textContent = "No matching transcript lines.";
      transcriptStart = -1;
      return;
    }
    if (force || index < transcriptStart || index >= transcriptEnd - 10) {
      transcriptList.replaceChildren();
      transcriptStart = Math.max(0, index - 20);
      transcriptEnd = Math.min(transcript.length, Math.max(0, index) + 60);
      for (let i = transcriptStart; i < transcriptEnd; i++) {
        const entry = transcript[i];
        if (entry) appendTranscriptRow(entry, i);
      }
    } else {
      for (const row of transcriptList.querySelectorAll<HTMLElement>("[data-index]"))
        row.classList.toggle("is-active", Number(row.dataset.index) === index);
    }
    const active = transcriptList.querySelector<HTMLElement>(".is-active");
    if (active)
      transcriptList.scrollTop +=
        active.getBoundingClientRect().top - transcriptList.getBoundingClientRect().top - 30;
  }
  search.addEventListener("input", () => {
    renderTranscript(true);
  });
  transcriptList.addEventListener("scroll", () => {
    if (
      search.value.trim() ||
      transcriptList.scrollTop + transcriptList.clientHeight < transcriptList.scrollHeight - 80
    )
      return;
    const end = Math.min(transcript.length, transcriptEnd + 30);
    for (let i = transcriptEnd; i < end; i++) {
      const entry = transcript[i];
      if (entry) appendTranscriptRow(entry, i);
    }
    transcriptEnd = end;
  });
  function setChannel(channel: number): void {
    if (!catalog.available.includes(channel) || channel === currentChannel) return;
    currentChannel = channel;
    controller.setChannel(channel);
    options.onChannelChange?.(channel);
    void fetchTranscript();
    update();
  }
  function render(): void {
    if (destroyed) return;
    const info = catalog.all.find((entry) => entry.id === currentChannel);
    channelName.textContent = `CH ${String(currentChannel)} · ${info?.label ?? ""}`;
    channelDescription.textContent = info?.description ?? "";
    clock.textContent = secondsToTimeStr(seconds);
    playButton.textContent = playing ? "Ⅱ Pause" : "▶ Play";
    const active = activityAt(seconds);
    for (const button of buttons) {
      const id = Number(button.dataset.channelId);
      button.classList.toggle("is-active", id === currentChannel);
      button.classList.toggle("is-speaking", active?.includes(id) ?? false);
      button.setAttribute("aria-pressed", String(id === currentChannel));
    }
    draw();
    renderTranscript();
  }
  function update(): void {
    controller.tick(seconds, playing);
    const tape = findTapeForGet(tapes, currentChannel, seconds);
    status.textContent =
      audioError && audioError === audio.src
        ? "Audio could not be loaded. Select another channel or mission time."
        : tape === null || tape.tapeId === "T999"
          ? "No audio recording at this mission time."
          : `Tape ${tape.tapeId} · ${tape.channelBank} · CH ${String(currentChannel)}`;
    void fetchWaveform(tape);
    void fetchActivity();
    render();
  }
  const observer = new ResizeObserver(draw);
  observer.observe(canvas);
  void fetchTranscript();
  render();
  return {
    setClock(currentGetSeconds, isPlaying) {
      seconds = currentGetSeconds;
      playing = isPlaying;
      update();
    },
    setChannel,
    getChannel() {
      return currentChannel;
    },
    setMuted(muted) {
      audio.muted = muted;
    },
    destroy() {
      destroyed = true;
      abort.abort();
      waveAbort?.abort();
      transcriptAbort?.abort();
      observer.disconnect();
      controller.destroy();
      container.replaceChildren();
      container.classList.remove("mocrviz-panel");
    },
  };
}
