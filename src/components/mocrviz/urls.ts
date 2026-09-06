/**
 * MOCR audio URL builders.
 *
 * Phase 4.5 — typed replacement for the `loadChannelSoundfile()` URL
 * concatenation in the legacy `public/{11,13}/MOCRviz/MOCRviz.js`.
 *
 * Pure functions; no DOM, no fetch. Mission "11" and "13" use
 * different filename conventions (see legacy lines ~732-755):
 *
 *   A13: `{audioRoot}/DA13_{tape}_{bank}_16khz_mp3_16/DA13_{tape}_{bank}_CH{ch}.mp3`
 *   A11: `{audioRoot}/{tape}_defluttered_mp3_16/defluttered_A11_{tape}_{bank}_CH{ch}.mp3`
 *
 * "Sub-channel" rule (legacy): the channel id stored in the URL is
 * `channel > 30 ? channel - 30 : channel` (HR2 is the second 30 channels
 * recorded onto the same set of physical tapes, so the per-tape channel
 * index is mod-30).
 *
 * `.dat` (waveform-data) files live in an `audiowaveform_512/` subfolder
 * of the same tape folder, with the same basename.
 */

export type MocrMissionId = "11" | "13";

/**
 * Convert a 1..60 logical channel id to the per-tape 1..30 index used in
 * the audio filename. Channels 31..60 are recorded on the HR2 set with
 * the same physical numbering as 1..30.
 */
export function subChannelId(channel: number): number {
  return channel > 30 ? channel - 30 : channel;
}

/** Build the bare filename (no extension) for a tape × channel pair. */
export function audioFilename(
  mission: MocrMissionId,
  tapeId: string,
  channelBank: string,
  channel: number,
): string {
  const ch = subChannelId(channel);
  if (mission === "13") return `DA13_${tapeId}_${channelBank}_CH${String(ch)}`;
  return `defluttered_A11_${tapeId}_${channelBank}_CH${String(ch)}`;
}

/**
 * Build the tape folder URL (no trailing slash). Audio + waveform-data
 * both live under this folder.
 *
 *   A13: `{audioRoot}/DA13_{tape}_{bank}_16khz_mp3_16`
 *   A11: `{audioRoot}/{tape}_defluttered_mp3_16`
 */
export function tapeFolderUrl(
  audioRoot: string,
  mission: MocrMissionId,
  tapeId: string,
  channelBank: string,
): string {
  const root = audioRoot.replace(/\/+$/, "");
  if (mission === "13") return `${root}/DA13_${tapeId}_${channelBank}_16khz_mp3_16`;
  return `${root}/${tapeId}_defluttered_mp3_16`;
}

/** Absolute URL of the MP3 for a tape × channel pair. */
export function audioUrl(
  audioRoot: string,
  mission: MocrMissionId,
  tapeId: string,
  channelBank: string,
  channel: number,
): string {
  const folder = tapeFolderUrl(audioRoot, mission, tapeId, channelBank);
  const filename = audioFilename(mission, tapeId, channelBank, channel);
  return `${folder}/${filename}.mp3`;
}

/** Absolute URL of the waveform-data `.dat` file for a tape × channel pair. */
export function waveformDataUrl(
  audioRoot: string,
  mission: MocrMissionId,
  tapeId: string,
  channelBank: string,
  channel: number,
): string {
  const folder = tapeFolderUrl(audioRoot, mission, tapeId, channelBank);
  const filename = audioFilename(mission, tapeId, channelBank, channel);
  return `${folder}/audiowaveform_512/${filename}.dat`;
}
