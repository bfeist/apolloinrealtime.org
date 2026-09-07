import { findCrewStatusIndex } from "../../data/crewStatusData.js";
import { secondsToTimeStr } from "../../shell/clock.js";
import { timeToWakeup } from "./data.js";
import styles from "../dashboard/DashboardPanel.module.css";

export { timeToWakeup } from "./data.js";

export function CrewStatusPanel({ data, seconds }: { data: CrewStatusData; seconds: number }) {
  const index = findCrewStatusIndex(data, seconds);
  const entry = data.entries[index];
  const wake = timeToWakeup(data.entries, index, seconds);
  return (
    <div className={styles.crewstatusPanel}>
      {/* The local mission index contains curated line breaks and value spans. */}
      {entry ? (
        <div
          className={styles.crewstatusText}
          dangerouslySetInnerHTML={{ __html: entry.statusHtml }}
        />
      ) : (
        <div className={styles.crewstatusText}>(no crew status entry)</div>
      )}
      <div className={styles.crewstatusWake}>
        {wake === null ? "" : `Wake-up in: ${secondsToTimeStr(Math.trunc(wake))}`}
      </div>
    </div>
  );
}
