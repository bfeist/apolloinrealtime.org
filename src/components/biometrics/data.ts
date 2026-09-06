import { loadCsv } from "../../data/csvLoader.js";
import { timeStrToSeconds } from "../../shell/clock.js";

export interface BiometricSample {
  seconds: number;
  value: number;
}

export interface BiometricsData {
  cdrHeart: readonly BiometricSample[];
  lmpHeart: readonly BiometricSample[];
  cdrMetabolic: readonly BiometricSample[];
  lmpMetabolic: readonly BiometricSample[];
  unavailableStreams: number;
}

/** Apollo 17 indexes contain mission GET and bpm or btu/hr, without a header. */
export function parseBiometrics(rows: readonly (readonly string[])[]): BiometricSample[] {
  const samples = new Map<number, number>();
  for (const [time, rawValue] of rows) {
    if (!time || !/^\d{3}:[0-5]\d:[0-5]\d$/.test(time) || !rawValue?.trim()) continue;
    const seconds = timeStrToSeconds(time);
    const value = Number(rawValue);
    if (Number.isFinite(seconds) && Number.isFinite(value) && value >= 0)
      samples.set(seconds, value);
  }
  return [...samples]
    .map(([seconds, value]) => ({ seconds, value }))
    .sort((a, b) => a.seconds - b.seconds);
}

/** Interpolate nearby recorded samples; never invent readings across recording gaps. */
export function biometricValueAt(
  samples: readonly BiometricSample[],
  seconds: number,
): number | null {
  if (!Number.isFinite(seconds)) return null;
  let low = 0;
  let high = samples.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const sample = samples[mid];
    if (!sample) return null;
    if (sample.seconds === seconds) return sample.value;
    if (sample.seconds < seconds) low = mid + 1;
    else high = mid - 1;
  }
  const before = samples[high];
  const after = samples[low];
  if (!before || !after) return null;
  const gap = after.seconds - before.seconds;
  if (gap <= 0 || gap > 3600) return null;
  const value = before.value + ((seconds - before.seconds) / gap) * (after.value - before.value);
  return Math.round(value * 10) / 10;
}

/** Load independently so a missing metabolic file cannot hide available heart rates. */
export async function loadBiometrics(
  baseUrl = "/17/",
  options: LoadCsvOptions = {},
): Promise<BiometricsData> {
  const base = baseUrl.replace(/\/$/, "");
  const results = await Promise.allSettled(
    ["heartrates_CDR", "heartrates_LMP", "metrates_CDR", "metrates_LMP"].map(async (name) =>
      parseBiometrics(await loadCsv(`${base}/indexes/${name}.csv`, options)),
    ),
  );
  const stream = (index: number): readonly BiometricSample[] => {
    const result = results[index];
    return result?.status === "fulfilled" ? result.value : [];
  };
  return {
    cdrHeart: stream(0),
    lmpHeart: stream(1),
    cdrMetabolic: stream(2),
    lmpMetabolic: stream(3),
    unavailableStreams: results.filter(
      (result) => result.status === "rejected" || result.value.length === 0,
    ).length,
  };
}
