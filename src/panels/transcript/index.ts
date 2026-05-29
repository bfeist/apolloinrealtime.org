/**
 * Transcript (utterance) panel.
 *
 * Phase 5 Track C — typed, jQuery-free replacement for the legacy
 * `#utteranceTable` + `scrollTranscriptToTimeId` / `repopulateTranscript`
 * / `prependTranscript` / `appendUtterances` / `trimUtterances` chain in
 * `legacy-src/{N}/index.js`.
 *
 * As with the commentary panel, the legacy sliding-window machinery is
 * dropped: we render all utterances and use native `scrollIntoView`.
 * DOM shape mirrors the legacy `#utteranceTemplate`:
 *   `<tr class="utterance utt_{type} uttid{id}" id="uttid{id}">`
 * so the existing `.utterance`, `.utt_pao`, `.utt_capcom`, `.utt_mocr`,
 * `.utt_crew`, `.spokenwords` CSS continues to apply.
 */

import { delegate } from "../../dom/index.js";

/** Legacy speaker-type CSS class name. */
export type UtteranceTypeClass = "utt_pao" | "utt_capcom" | "utt_mocr" | "utt_crew";

/** Options for {@link createTranscriptPanel}. */
export interface TranscriptPanelOptions {
  container: HTMLElement;
  data: UtteranceData;
  onSeek: (timeId: string) => void;
  activeBackground?: string;
}

export interface TranscriptPanelHandle {
  setActiveTimeId: (timeId: string | null) => void;
  destroy: () => void;
}

const DEFAULT_ACTIVE_BG = "#3b3b6e";

/** DOM id for the utterance row representing `timeId`. */
export function utteranceItemId(timeId: string): string {
  return `uttid${timeId}`;
}

/**
 * Map a row's speaker code (legacy `utteranceObject[3]`) and speaker
 * label to the legacy CSS class. Pure helper, exported for testing.
 *
 * Legacy logic (`getUtteranceObjectHTML`):
 *   code === "P" || who === ""  -> utt_pao
 *   code === "C"                 -> utt_capcom
 *   code === "F"                 -> utt_mocr
 *   else                          -> utt_crew
 */
export function utteranceTypeClass(speakerCode: string, speaker: string): UtteranceTypeClass {
  if (speakerCode === "P" || speaker === "") return "utt_pao";
  if (speakerCode === "C") return "utt_capcom";
  if (speakerCode === "F") return "utt_mocr";
  return "utt_crew";
}

export function createTranscriptPanel(options: TranscriptPanelOptions): TranscriptPanelHandle {
  const { container, data, onSeek } = options;
  const activeBg = options.activeBackground ?? DEFAULT_ACTIVE_BG;

  container.textContent = "";

  const wrap = document.createElement("div");
  wrap.className = "transcript_container";
  const table = document.createElement("table");
  table.id = "utteranceTable";

  for (const entry of data.entries) {
    const type = utteranceTypeClass(entry.extra, entry.speaker);
    const id = utteranceItemId(entry.timeId);
    const tr = document.createElement("tr");
    tr.id = id;
    tr.className = `utterance ${type} ${id}`;
    tr.dataset.timeid = entry.timeId;

    const tsTd = document.createElement("td");
    tsTd.className = "timestamp";
    tsTd.textContent = entry.timeStr;
    tr.appendChild(tsTd);

    const whoTd = document.createElement("td");
    whoTd.className = `who ${type}`;
    whoTd.textContent = entry.speaker;
    tr.appendChild(whoTd);

    const wordsTd = document.createElement("td");
    wordsTd.className = `spokenwords ${type}`;
    wordsTd.textContent = entry.words;
    tr.appendChild(wordsTd);

    table.appendChild(tr);
  }

  wrap.appendChild(table);
  container.appendChild(wrap);

  const off = delegate(wrap, "click", "tr.utterance", (_ev, tr) => {
    const timeId = tr.dataset.timeid;
    if (timeId !== undefined && timeId !== "") onSeek(timeId);
  });

  let activeEl: HTMLElement | null = null;

  const setActiveTimeId = (timeId: string | null): void => {
    if (timeId === null || !data.byTimeId.has(timeId)) {
      if (activeEl !== null) {
        activeEl.style.backgroundColor = "";
        activeEl = null;
      }
      return;
    }
    const el = wrap.querySelector<HTMLElement>(`#${CSS.escape(utteranceItemId(timeId))}`);
    if (el === null || el === activeEl) return;
    if (activeEl !== null) activeEl.style.backgroundColor = "";
    el.style.backgroundColor = activeBg;
    el.scrollIntoView({ block: "nearest" });
    activeEl = el;
  };

  const destroy = (): void => {
    off();
    container.textContent = "";
    activeEl = null;
  };

  return { setActiveTimeId, destroy };
}
