import { findCrewStatusIndex } from "../../data/crewStatusData.js";
import { secondsToTimeStr } from "../../shell/clock.js";
import { timeToWakeup } from "./data.js";

export { timeToWakeup } from "./data.js";

export function CrewStatusPanel({ data, seconds }: { data: CrewStatusData; seconds: number }) {
  const index = findCrewStatusIndex(data, seconds);
  const entry = data.entries[index];
  const wake = timeToWakeup(data.entries, index, seconds);
  return (
    <div className="crewstatus_panel">
      {/* The local mission index contains curated line breaks and value spans. */}
      {entry ? (
        <div className="crewstatus_text" dangerouslySetInnerHTML={{ __html: entry.statusHtml }} />
      ) : (
        <div className="crewstatus_text">(no crew status entry)</div>
      )}
      <div className="crewstatus_wake">
        {wake === null ? "" : `Wake-up in: ${secondsToTimeStr(Math.trunc(wake))}`}
      </div>
    </div>
  );
}
