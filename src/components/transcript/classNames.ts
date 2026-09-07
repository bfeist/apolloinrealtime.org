import type { UtteranceTypeClass } from "./model.js";
import styles from "./TranscriptPanel.module.css";
import { cx } from "../../styles/classNames.js";

export function speakerClassName(type: UtteranceTypeClass): string {
  switch (type) {
    case "utt_pao":
      return cx(styles.uttPao);
    case "utt_capcom":
      return cx(styles.uttCapcom);
    case "utt_mocr":
      return cx(styles.uttMocr);
    case "utt_crew":
      return cx(styles.uttCrew);
  }
}
