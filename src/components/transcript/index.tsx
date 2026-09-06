import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useUtteranceData } from "../../api/useMissionData.js";
import { findClosestUtteranceIndex } from "../../data/utteranceData.js";
import { useMissionStore } from "../../store/missionStore.js";
import { displaySpeakerLabel, utteranceItemId, utteranceTypeClass } from "./model.js";
import { useFollowActiveRow } from "./useFollowActiveRow.js";

interface TranscriptWindow {
  center: number;
  start: number;
  end: number;
}

/** A small row window keeps the 30,000-line transcript responsive. Scrolling expands
 * it in either direction; the next mission-time selection recenters it. */
export function TranscriptPanel({ config }: { config: MissionConfig }) {
  const { data, error } = useUtteranceData(config);
  const activeIndex = useMissionStore((state) =>
    data ? findClosestUtteranceIndex(data, state.seconds) : -1,
  );
  const seek = useMissionStore((state) => state.seek);
  const root = useRef<HTMLDivElement>(null);
  const [rowWindow, setRowWindow] = useState<TranscriptWindow>({ center: -1, start: 0, end: -1 });
  const range =
    rowWindow.center === activeIndex
      ? rowWindow
      : {
          center: activeIndex,
          start: Math.max(0, activeIndex - 50),
          end: Math.min((data?.entries.length ?? 0) - 1, activeIndex + 50),
        };
  const suppressScroll = useRef(false);
  const prependAnchor = useRef<{ height: number; top: number } | null>(null);
  const active = data?.entries[activeIndex];

  useLayoutEffect(() => {
    const container = root.current?.parentElement;
    suppressScroll.current = true;
    const anchor = prependAnchor.current;
    if (container && anchor)
      container.scrollTop = anchor.top + container.scrollHeight - anchor.height;
    prependAnchor.current = null;
    const frame = requestAnimationFrame(() => {
      suppressScroll.current = false;
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [range.start, range.end, activeIndex]);
  useFollowActiveRow(root, active ? utteranceItemId(active.timeId) : undefined);

  useEffect(() => {
    const container = root.current?.parentElement;
    if (!container || !data) return;
    const extendWindow = (): void => {
      if (suppressScroll.current) return;
      const nearTop = container.scrollTop < 200;
      const nearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight < 200;
      const start = nearTop ? Math.max(0, range.start - 50) : range.start;
      const end = nearBottom ? Math.min(data.entries.length - 1, range.end + 50) : range.end;
      if (start === range.start && end === range.end) return;
      if (start < range.start)
        prependAnchor.current = { height: container.scrollHeight, top: container.scrollTop };
      setRowWindow({ center: activeIndex, start, end });
    };
    container.addEventListener("scroll", extendWindow);
    return () => {
      container.removeEventListener("scroll", extendWindow);
    };
  }, [data, activeIndex, range.start, range.end]);

  if (error) return <>failed: {error.message}</>;
  return (
    <div className="transcript_container utteranceDiv" id="utteranceDiv" ref={root}>
      <table id="utteranceTable" className="utteranceTable">
        <tbody>
          {data?.entries.slice(range.start, range.end + 1).map((entry, offset) => {
            const index = range.start + offset;
            const type = utteranceTypeClass(entry.extra, entry.speaker);
            const id = utteranceItemId(entry.timeId);
            return (
              <tr
                id={id}
                className={`utterance ${type} ${id}`}
                data-timeid={entry.timeId}
                data-index={index}
                key={index}
                style={{ backgroundColor: index === activeIndex ? "#234" : undefined }}
                onClick={() => {
                  seek(entry.seconds);
                }}
              >
                <td className="timestamp">{entry.timeStr}</td>
                <td className={`who ${type}`}>
                  {displaySpeakerLabel(entry.speaker, config.speakerLabels)}
                </td>
                <td className={`spokenwords ${type}`}>{entry.words}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
