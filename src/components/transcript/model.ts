/** Legacy speaker-type CSS class name. */
export type UtteranceTypeClass = "utt_pao" | "utt_capcom" | "utt_mocr" | "utt_crew";

const SPEAKER_ROLE = /\b(CDR|CMP|LMP|PAO|CC)\b/g;

/** Replace transcript role codes with the mission's legacy display names. */
export function displaySpeakerLabel(
  speaker: string,
  labels: Readonly<Record<string, string>> = {},
): string {
  return speaker.replace(SPEAKER_ROLE, (role) => labels[role] ?? role);
}

/** DOM id for the utterance row representing `timeId`. */
export function utteranceItemId(timeId: string): string {
  return `uttid${timeId}`;
}

/**
 * Map a row's speaker code (legacy `utteranceObject[3]`) and speaker
 * label to the legacy CSS class. Pure helper, exported for testing.
 */
export function utteranceTypeClass(speakerCode: string, speaker: string): UtteranceTypeClass {
  if (speakerCode === "P" || speaker === "") return "utt_pao";
  if (speakerCode === "C") return "utt_capcom";
  if (speakerCode === "F") return "utt_mocr";
  return "utt_crew";
}
