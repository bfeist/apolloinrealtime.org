import { secondsToTimeStr } from "../../shell/clock.js";
import { waveformPeak, type WaveformData } from "./data.js";

export const TIMELINE = {
  labelWidth: 74,
  top: 22,
  rowHeight: 4,
  halfWindow: 180,
  waveformHeight: 78,
};

export interface TimelineState {
  seconds: number;
  channel: number;
  channels: readonly number[];
  labels: ReadonlyMap<number, string>;
  activityAt: (seconds: number) => readonly number[] | undefined;
  waveform: WaveformData | null;
  tapeStart: number;
  activityMessage: string;
  waveformMessage: string;
}

export function drawTimeline(canvas: HTMLCanvasElement, state: TimelineState): void {
  const width = Math.round(canvas.getBoundingClientRect().width);
  if (width === 0) return; // Hidden tab: ResizeObserver draws when it opens.
  const height =
    TIMELINE.top + state.channels.length * TIMELINE.rowHeight + TIMELINE.waveformHeight + 26;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.height = `${String(height)}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, width, height);
  const startX = TIMELINE.labelWidth;
  const plotWidth = Math.max(1, width - startX - 8);
  const span = TIMELINE.halfWindow * 2;
  const start = state.seconds - TIMELINE.halfWindow;
  const scale = plotWidth / span;
  ctx.font = '10px "Roboto Mono", monospace';
  ctx.textBaseline = "middle";
  const waveY = TIMELINE.top + state.channels.length * TIMELINE.rowHeight + 16;
  for (let row = 0; row < state.channels.length; row++) {
    const channel = state.channels[row];
    const y = TIMELINE.top + row * TIMELINE.rowHeight;
    ctx.fillStyle = channel === state.channel ? "#214557" : "#242424";
    ctx.fillRect(startX, y, plotWidth, 3);
  }
  // An empty array is known silence; undefined means no recording data loaded.
  for (let second = Math.floor(start); second <= start + span; second++) {
    const active = state.activityAt(second);
    if (!active) continue;
    const x = startX + (second - start) * scale;
    for (let row = 0; row < state.channels.length; row++) {
      const ch = state.channels[row];
      if (ch !== undefined && active.includes(ch)) {
        ctx.fillStyle = ch === state.channel ? "#7cb7e0" : "#737373";
        ctx.fillRect(x, TIMELINE.top + row * TIMELINE.rowHeight, Math.max(1, scale), 3);
      }
    }
  }
  const selectedRow = state.channels.indexOf(state.channel);
  const selectedY = TIMELINE.top + selectedRow * TIMELINE.rowHeight;
  ctx.fillStyle = "#7cb7e0";
  ctx.fillText(
    state.labels.get(state.channel) ?? String(state.channel),
    3,
    selectedY + 2,
    startX - 6,
  );
  ctx.fillStyle = "#909090";
  ctx.fillText("CHANNELS", 3, 10);
  ctx.fillText("WAVEFORM", 3, waveY + TIMELINE.waveformHeight / 2);
  const middleY = waveY + TIMELINE.waveformHeight / 2;
  ctx.fillStyle = "#252525";
  ctx.fillRect(startX, middleY, plotWidth, 1);
  if (state.waveform) {
    ctx.strokeStyle = "#7cb7e0";
    ctx.beginPath();
    for (let x = 0; x < plotWidth; x++) {
      const t = start + x / scale - state.tapeStart;
      const peak = waveformPeak(state.waveform, t, t + 1 / scale);
      if (!peak) continue;
      ctx.moveTo(startX + x, middleY - peak[1] * 34);
      ctx.lineTo(startX + x, middleY - peak[0] * 34);
    }
    ctx.stroke();
  } else {
    ctx.fillStyle = "#969696";
    ctx.fillText(state.waveformMessage, startX + 8, middleY - 12, plotWidth - 16);
  }
  for (const fraction of [0, 0.5, 1]) {
    const x = startX + plotWidth * fraction;
    ctx.textAlign = fraction === 0 ? "left" : fraction === 1 ? "right" : "center";
    ctx.fillStyle = fraction === 0.5 ? "#f29b92" : "#aaa";
    ctx.fillText(secondsToTimeStr(start + span * fraction), x, 10);
  }
  ctx.textAlign = "left";
  ctx.fillStyle = "#aaa";
  if (state.activityMessage)
    ctx.fillText(state.activityMessage, startX + 8, waveY - 7, plotWidth - 16);
  ctx.strokeStyle = "#e45a51";
  ctx.beginPath();
  ctx.moveTo(startX + plotWidth / 2, 19);
  ctx.lineTo(startX + plotWidth / 2, height - 4);
  ctx.stroke();
}

export function timelineSeek(x: number, width: number, seconds: number): number {
  const plotWidth = Math.max(1, width - TIMELINE.labelWidth - 8);
  const fraction = Math.max(0, Math.min(1, (x - TIMELINE.labelWidth) / plotWidth));
  return seconds + (fraction - 0.5) * TIMELINE.halfWindow * 2;
}
