import { timeIdToSeconds } from "../../shell/clock.js";
import type { MocrMissionId } from "./urls.js";

/** BBC audiowaveform binary format, little-endian, min/max pairs per pixel. */
export interface WaveformData {
  sampleRate: number;
  samplesPerPixel: number;
  length: number;
  channels: number;
  maxAmplitude: number;
  samples: Int8Array | Int16Array;
}

export function parseWaveform(buffer: ArrayBuffer): WaveformData {
  if (buffer.byteLength < 20) throw new Error("Truncated waveform header");
  const view = new DataView(buffer);
  const version = view.getUint32(0, true);
  if (version !== 1 && version !== 2) throw new Error("Unsupported waveform version");
  const headerSize = version === 2 ? 24 : 20;
  if (buffer.byteLength < headerSize) throw new Error("Truncated waveform header");
  const bits = view.getUint32(4, true) === 1 ? 8 : 16;
  const sampleRate = view.getUint32(8, true);
  const samplesPerPixel = view.getUint32(12, true);
  const length = view.getUint32(16, true);
  const channels = version === 2 ? view.getUint32(20, true) : 1;
  const count = length * channels * 2;
  if (
    !sampleRate ||
    !samplesPerPixel ||
    !channels ||
    count * (bits / 8) > buffer.byteLength - headerSize
  ) {
    throw new Error("Invalid waveform data");
  }
  const samples = bits === 8 ? new Int8Array(count) : new Int16Array(count);
  for (let i = 0; i < count; i++) {
    samples[i] =
      bits === 8 ? view.getInt8(headerSize + i) : view.getInt16(headerSize + i * 2, true);
  }
  return {
    sampleRate,
    samplesPerPixel,
    length,
    channels,
    maxAmplitude: bits === 8 ? 128 : 32768,
    samples,
  };
}

/** Audio peaks covering an interval relative to the beginning of its physical tape. */
export function waveformPeak(
  data: WaveformData,
  start: number,
  end: number,
): [number, number] | null {
  const rate = data.sampleRate / data.samplesPerPixel;
  const first = Math.max(0, Math.floor(start * rate));
  const last = Math.min(data.length, Math.ceil(end * rate));
  if (first >= last) return null;
  let min = 0;
  let max = 0;
  for (let i = first; i < last; i++) {
    for (let ch = 0; ch < data.channels; ch++) {
      const index = (i * data.channels + ch) * 2;
      min = Math.min(min, data.samples[index] ?? 0);
      max = Math.max(max, data.samples[index + 1] ?? 0);
    }
  }
  return [min / data.maxAmplitude, max / data.maxAmplitude];
}

export interface ActivityChunk {
  start: number;
  end: number;
  filename: string;
}

/** Legacy activity files are indexed from tape-recording start, not launch. */
export function activityChunks(
  mission: MocrMissionId,
  get: number,
  halfWindow = 300,
): ActivityChunk[] {
  const countdown = mission === "13" ? 127048 : 74768;
  const count = mission === "13" ? 645438 : 784140;
  const first = Math.max(0, Math.floor((get + countdown - halfWindow) / 1000) * 1000);
  const last = Math.min(count - 1, get + countdown + halfWindow);
  const chunks: ActivityChunk[] = [];
  for (let start = first; start <= last; start += 1000) {
    const end = Math.min(count - 1, start + 999);
    chunks.push({ start, end, filename: `tape_activity_${String(start)}-${String(end)}.json` });
  }
  return chunks;
}

export function parseActivity(value: unknown): readonly (readonly number[])[] {
  if (!Array.isArray(value)) throw new Error("Invalid activity data");
  return value.map((row: unknown) => {
    if (
      !Array.isArray(row) ||
      !row.every((n: unknown) => typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 60)
    ) {
      throw new Error("Invalid activity row");
    }
    return row as number[];
  });
}

export interface ChannelUtterance {
  seconds: number;
  text: string;
}

export function parseChannelTranscript(text: string): ChannelUtterance[] {
  const entries: ChannelUtterance[] = [];
  for (const line of text.split(/\r?\n/)) {
    const separator = line.indexOf("|");
    if (separator < 0) continue;
    const time = line.slice(0, separator).trim();
    if (!/^(?:\d{3}|-\d{2})[0-5]\d[0-5]\d$/.test(time)) continue;
    const words = line.slice(separator + 1).trim();
    if (words) entries.push({ seconds: timeIdToSeconds(time), text: words });
  }
  // Some historical files contain out-of-order or duplicate timestamps.
  return entries.sort((a, b) => a.seconds - b.seconds);
}

export function closestChannelUtterance(
  entries: readonly ChannelUtterance[],
  seconds: number,
): number {
  let low = 0;
  let high = entries.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if ((entries[mid]?.seconds ?? Infinity) <= seconds) low = mid + 1;
    else high = mid;
  }
  return low - 1;
}
