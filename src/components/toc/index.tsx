import { useMemo, useRef } from "react";
import { useTocData } from "../../api/useMissionData.js";
import { findClosestTocIndex } from "../../data/tocData.js";
import { useMissionStore } from "../../store/missionStore.js";
import { useFollowActiveRow } from "../transcript/useFollowActiveRow.js";
import { groupTocEntries, tocItemId } from "./model.js";

export function TocPanel({ config }: { config: MissionConfig }) {
  const { data, error } = useTocData(config);
  const activeIndex = useMissionStore((state) =>
    data ? findClosestTocIndex(data, state.seconds) : -1,
  );
  const seek = useMissionStore((state) => state.seek);
  const root = useRef<HTMLDivElement>(null);
  const active = data?.entries[activeIndex];
  const groups = useMemo(() => groupTocEntries(data?.entries ?? []), [data]);
  useFollowActiveRow(root, active ? tocItemId(active.timeId) : undefined);
  if (error) return <>failed: {error.message}</>;
  return (
    <div className="TOC_container" ref={root}>
      {groups.map((group, index) => (
        <ul className={`TOCli TOC${String(group.level)}`} key={index}>
          {group.items.map((entry, itemIndex) => (
            <li
              className="tocitem"
              id={tocItemId(entry.timeId)}
              data-timeid={entry.timeId}
              key={`${entry.timeId}:${String(itemIndex)}`}
              style={{ background: active === entry ? "#3b3b6e" : undefined }}
              onClick={() => {
                seek(entry.seconds);
              }}
            >
              <span className="TOCTimestamp">{entry.timeStr}</span>
              <span className="TOC_item"> {entry.label}</span>
            </li>
          ))}
        </ul>
      ))}
    </div>
  );
}
