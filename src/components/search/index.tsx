import { useEffect, useMemo, useState } from "react";
import { useUtteranceData, useCommentaryData, usePhotoData } from "../../api/useMissionData.js";
import { timeIdToSeconds } from "../../shell/clock.js";
import { useMissionStore } from "../../store/missionStore.js";
import { buildSearchIndex, searchIndex } from "./model.js";
import styles from "./SearchPanel.module.css";
import transcriptStyles from "../transcript/TranscriptPanel.module.css";
import { speakerClassName } from "../transcript/classNames.js";
import { cx } from "../../styles/classNames.js";

export function SearchPanel({ config }: { config: MissionConfig }) {
  const utterances = useUtteranceData(config).data;
  const commentary = useCommentaryData(config).data;
  const photos = usePhotoData(config).data;
  const seek = useMissionStore((state) => state.seek);
  const setSearchVisible = useMissionStore((state) => state.setSearchVisible);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const index = useMemo(
    () =>
      buildSearchIndex(
        {
          ...(utterances && { utterances }),
          ...(commentary && { commentary }),
          ...(photos && { photos }),
        },
        config.speakerLabels,
      ),
    [utterances, commentary, photos, config],
  );
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
    }, 100);
    return () => {
      window.clearTimeout(timer);
    };
  }, [query]);
  const hits = useMemo(() => searchIndex(index, debouncedQuery), [index, debouncedQuery]);
  return (
    <div className={styles.searchPanel}>
      <input
        type="text"
        id="searchInputField"
        placeholder="Search transcript, commentary, photos..."
        value={query}
        onChange={(event) => {
          setQuery(event.currentTarget.value);
        }}
      />
      <div id="searchResultsDiv">
        <table id="searchResultsTable">
          <tbody>
            {hits.map(({ item, matchStart, matchLength }, hitIndex) => (
              <tr
                className={cx(transcriptStyles.utterance, speakerClassName(item.uttType))}
                data-key={`${item.kind}:${item.timeId}:${String(matchStart)}`}
                key={hitIndex}
                onClick={() => {
                  seek(timeIdToSeconds(item.timeId));
                  setSearchVisible(false);
                }}
              >
                <td className={transcriptStyles.timestamp}>
                  {item.timeStr}
                  <br />
                  {item.kind}
                </td>
                <td className={cx(transcriptStyles.who, speakerClassName(item.uttType))}>
                  {item.who}
                </td>
                <td className={cx(transcriptStyles.spokenwords, speakerClassName(item.uttType))}>
                  {" "}
                  {item.words.slice(0, matchStart)}
                  <span className={transcriptStyles.searchResultHighlight}>
                    {item.words.slice(matchStart, matchStart + matchLength)}
                  </span>
                  {item.words.slice(matchStart + matchLength)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
