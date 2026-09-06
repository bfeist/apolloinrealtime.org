import { memo, useEffect, useMemo, useRef, useState } from "react";
import { closestChannelUtterance, type ChannelUtterance } from "./data.js";
import type { MocrMissionId } from "./urls.js";
import { secondsToTimeStr } from "../../shell/clock.js";
import { useMissionStore } from "../../store/missionStore.js";
import { MocrvizAbout } from "./MocrvizAbout.js";
import { useChannelTranscript } from "./queries.js";

const EMPTY_TRANSCRIPT: readonly ChannelUtterance[] = [];

export const ChannelTranscript = memo(function ChannelTranscript({
  mission,
  root,
  channel,
  label,
}: {
  mission: MocrMissionId;
  root: string;
  channel: number;
  label: string;
}) {
  const seek = useMissionStore((state) => state.seek);
  const transcript = useChannelTranscript(mission, root, channel);
  const [mode, setMode] = useState<"transcript" | "search" | "about">("transcript");
  const [search, setSearch] = useState("");
  const [extraRows, setExtraRows] = useState(0);
  const list = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const entries = transcript.data ?? EMPTY_TRANSCRIPT;
  const active = useMissionStore((state) => closestChannelUtterance(entries, state.seconds));
  const query = search.trim().toLowerCase();
  // Keep a bounded window around GET, then extend it as the reader scrolls.
  const start = Math.max(0, active - 20);
  const rows = useMemo(
    () =>
      query
        ? entries
            .map((entry, index) => ({ entry, index }))
            .filter(({ entry }) => entry.text.toLowerCase().includes(query))
            .slice(0, 200)
        : entries
            .slice(start, Math.max(0, active) + 60 + extraRows)
            .map((entry, index) => ({ entry, index: start + index })),
    [entries, query, start, active, extraRows],
  );

  useEffect(() => {
    if (query || mode === "about") return;
    const host = list.current;
    const row = host?.querySelector<HTMLElement>(".is-active");
    if (host && row)
      host.scrollTop += row.getBoundingClientRect().top - host.getBoundingClientRect().top - 30;
  }, [active, query, mode, transcript.data]);

  return (
    <section className="mocrviz-transcript-panel">
      <div className="mocrviz-transcript-title">
        Mission Control Audio Channel: <span className="mocrviz-transcript-channel">{label}</span>
      </div>
      <div className="mocrviz-transcript-tabs">
        {(["transcript", "search", "about"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            className={`mocrviz-transcript-tab${mode === tab ? " is-active" : ""}`}
            onClick={() => {
              setMode(tab);
              if (tab !== "search") setSearch("");
              if (tab === "search") requestAnimationFrame(() => searchInput.current?.focus());
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </div>
      <div className="mocrviz-transcript-monitor">
        <input
          ref={searchInput}
          className="mocrviz-transcript-search"
          type="search"
          placeholder="Search this channel"
          aria-label="Search this channel transcript"
          hidden={mode !== "search"}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <div
          ref={list}
          className="mocrviz-transcript"
          hidden={mode === "about"}
          onScroll={(event) => {
            const host = event.currentTarget;
            if (!query && host.scrollTop + host.clientHeight >= host.scrollHeight - 80)
              setExtraRows((count) => count + 30);
          }}
        >
          {transcript.isPending
            ? "Loading channel transcript…"
            : transcript.isError
              ? "Transcript unavailable for this channel."
              : rows.length === 0
                ? query
                  ? "No matching transcript lines."
                  : "No transcript for this channel."
                : rows.map(({ entry, index }) => (
                    <button
                      key={index}
                      type="button"
                      className={`mocrviz-utterance${index === active ? " is-active" : ""}`}
                      data-index={index}
                      onClick={() => {
                        setSearch("");
                        setExtraRows(0);
                        seek(entry.seconds);
                      }}
                    >
                      <time>{secondsToTimeStr(entry.seconds)}</time>
                      <span>{entry.text}</span>
                    </button>
                  ))}
        </div>
        <MocrvizAbout mission={mission} hidden={mode !== "about"} />
      </div>
    </section>
  );
});
