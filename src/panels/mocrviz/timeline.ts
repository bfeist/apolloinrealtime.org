import { secondsToTimeStr } from "../../shell/clock.js";
import { waveformPeak, type WaveformData } from "./data.js";

/** Geometry from the original Paper.js MOCRviz canvas. */
export const TIMELINE = {
  height: 350,
  rowHeight: 5,
  channelStroke: 4,
  waveformCenter: 235,
  waveformHeight: 100,
};

export interface TimelineHover {
  x: number;
  channel: number;
  seconds: number;
}

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
  hoveredChannel: number | null;
  hover: TimelineHover | null;
}

/** The legacy activity plot uses one horizontal CSS pixel per mission second. */
export function activityTimeAtX(x: number, width: number, seconds: number): number {
  return seconds + x - width / 2;
}

/** The waveform retains its native audiowaveform scale, as the original did. */
export function waveformTimeAtX(
  x: number,
  width: number,
  seconds: number,
  waveform: WaveformData | null,
): number {
  if (!waveform) return activityTimeAtX(x, width, seconds);
  return seconds + (x - width / 2) * (waveform.samplesPerPixel / waveform.sampleRate);
}

export function drawTimeline(canvas: HTMLCanvasElement, state: TimelineState): void {
  const width = Math.round(canvas.getBoundingClientRect().width);
  if (width === 0) return;
  const height = TIMELINE.height;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  canvas.style.height = `${String(height)}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(ratio, ratio);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const start = state.seconds - width / 2;
  for (let row = 0; row < state.channels.length; row++) {
    const channel = state.channels[row];
    const y = row * TIMELINE.rowHeight;
    ctx.fillStyle = channel === state.channel ? "#214557" : "#292929";
    ctx.fillRect(0, y, width, TIMELINE.channelStroke);
  }

  // An empty array is known silence; undefined means no recording data loaded.
  for (let second = Math.floor(start); second <= start + width; second++) {
    const active = state.activityAt(second);
    if (!active) continue;
    const x = second - start;
    for (let row = 0; row < state.channels.length; row++) {
      const channel = state.channels[row];
      if (channel !== undefined && active.includes(channel)) {
        ctx.fillStyle = channel === state.channel ? "#7cb7e0" : "#636363";
        ctx.fillRect(x, row * TIMELINE.rowHeight, 1.25, TIMELINE.channelStroke);
      }
    }
  }

  const waveRate = state.waveform ? state.waveform.sampleRate / state.waveform.samplesPerPixel : 0;
  const middleY = TIMELINE.waveformCenter;
  if (state.waveform && waveRate > 0) {
    ctx.strokeStyle = "#7cb7e0";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    for (let x = 0; x < width; x++) {
      const tapeSecond = state.seconds - state.tapeStart + (x - width / 2) / waveRate;
      const peak = waveformPeak(state.waveform, tapeSecond, tapeSecond + 1 / waveRate);
      if (!peak) continue;
      ctx.moveTo(x, middleY - peak[1] * (TIMELINE.waveformHeight / 2));
      ctx.lineTo(x, middleY - peak[0] * (TIMELINE.waveformHeight / 2));
    }
    ctx.stroke();
  } else if (state.waveformMessage) {
    ctx.fillStyle = "#777";
    ctx.font = '10px "Roboto Mono", monospace';
    ctx.fillText(state.waveformMessage, 10, middleY + 4, width - 20);
  }

  ctx.font = 'bold 12px "Roboto Mono", monospace';
  ctx.fillStyle = "#ddd";
  ctx.fillText(state.labels.get(state.channel) ?? String(state.channel), 10, height - 75);

  if (state.activityMessage) {
    ctx.font = '10px "Roboto Mono", monospace';
    ctx.fillStyle = "#777";
    ctx.fillText(state.activityMessage, 10, height - 48, width - 20);
  }

  // The real playhead remains centered while the recording moves beneath it.
  const center = Math.round(width / 2) + 0.5;
  ctx.strokeStyle = "#e45a51";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(center, 0);
  ctx.lineTo(center, height - 10);
  ctx.stroke();

  const currentLabel = secondsToTimeStr(state.seconds);
  ctx.font = 'bold 12px "Roboto Mono", monospace';
  const currentWidth = ctx.measureText(currentLabel).width;
  const currentX = center - currentWidth / 2;
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#e45a51";
  ctx.fillRect(currentX - 4, height - 25, currentWidth + 8, 19);
  ctx.strokeRect(currentX - 4, height - 25, currentWidth + 8, 19);
  ctx.fillStyle = "#e45a51";
  ctx.fillText(currentLabel, currentX, height - 10);

  if (state.hoveredChannel !== null) drawHover(ctx, width, state);
}

function drawHover(ctx: CanvasRenderingContext2D, width: number, state: TimelineState): void {
  const channel = state.hoveredChannel;
  if (channel === null) return;
  const row = state.channels.indexOf(channel);
  if (row < 0) return;
  const y = row * TIMELINE.rowHeight;
  ctx.fillStyle = "rgba(146, 211, 255, 0.6)";
  ctx.fillRect(0, y, width, TIMELINE.channelStroke);

  const hover = state.hover;
  if (!hover) return;
  const title = `ch${String(channel)} ${state.labels.get(channel) ?? ""}`.trim();
  const time = secondsToTimeStr(hover.seconds);
  ctx.font = 'bold 11px "Roboto Mono", monospace';
  const boxWidth = Math.max(ctx.measureText(title).width, ctx.measureText(time).width) + 10;
  const boxHeight = 34;
  const boxX = Math.max(2, Math.min(width - boxWidth - 2, hover.x + 20));
  const boxY = Math.max(2, Math.min(TIMELINE.height - boxHeight - 2, y + 8));
  ctx.fillStyle = "#000";
  ctx.strokeStyle = "#ddd";
  ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
  ctx.fillStyle = "#ddd";
  ctx.fillText(title, boxX + 5, boxY + 13);
  ctx.fillText(time, boxX + 5, boxY + 27);
}
