import { useRef } from "react";
import { useCommentaryData } from "../../api/useMissionData.js";
import { findClosestCommentaryIndex } from "../../data/commentaryData.js";
import { useMissionStore } from "../../store/missionStore.js";
import { displaySpeakerLabel } from "../transcript/model.js";
import { useFollowActiveRow } from "../transcript/useFollowActiveRow.js";
import { commentaryItemId, defaultAttribution } from "./model.js";

export function CommentaryPanel({ config }: { config: MissionConfig }) {
  const { data, error } = useCommentaryData(config);
  const activeIndex = useMissionStore((state) =>
    data ? findClosestCommentaryIndex(data, state.seconds) : -1,
  );
  const seek = useMissionStore((state) => state.seek);
  const root = useRef<HTMLDivElement>(null);
  const active = data?.entries[activeIndex];
  useFollowActiveRow(root, active ? commentaryItemId(active.timeId) : undefined);
  if (error) return <>failed: {error.message}</>;
  return (
    <div className="commentary_container" ref={root}>
      <table id="commentaryTable" className="commentaryTable">
        <tbody>
          {data?.entries.map((entry, index) => {
            const id = commentaryItemId(entry.timeId);
            const type = entry.speaker === "" ? "com_support" : "com_main";
            const attribution = defaultAttribution(entry);
            return (
              <tr
                id={id}
                className={`commentary utt_pao ${id}`}
                data-timeid={entry.timeId}
                key={`${id}:${String(index)}`}
                style={{ backgroundColor: active === entry ? "#3b3b6e" : undefined }}
                onClick={() => {
                  seek(entry.seconds);
                }}
              >
                <td className="timestamp">{entry.timeStr}</td>
                {entry.speaker !== "" && (
                  <td className={`who ${type}`}>
                    {displaySpeakerLabel(entry.speaker, config.speakerLabels)}
                  </td>
                )}
                <td
                  className={`spokenwords ${type}`}
                  colSpan={entry.speaker === "" ? 2 : undefined}
                >
                  {entry.text}
                  {attribution !== "" && <span className="attribution"> {attribution}</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
