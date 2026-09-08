import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import styles from "./MocrvizPanel.module.css";
import { cx } from "../../styles/classNames.js";
import { findTapeForGet } from "../../data/tapeRangesData.js";
import { channelsFor, type MissionChannels } from "./channels.js";
import { MocrvizAudioController } from "./audio.js";
import { CONSOLES } from "./consoles.js";
import {
  activityTimeAtX,
  drawTimeline,
  waveformTimeAtX,
  TIMELINE,
  type TimelineHover,
} from "./timeline.js";
import type { MocrMissionId } from "./urls.js";
import { secondsToTimeStr } from "../../shell/clock.js";
import { useMissionStore } from "../../store/missionStore.js";
import { ChannelTranscript } from "./ChannelTranscript.js";
import { useMocrHover } from "./hoverStore.js";
import { useChannelActivity, useMocrTapes, useRecordingWaveform } from "./queries.js";

function displayLabel(channel: number, label: string): string {
  const sided = /^(.*)-(L|R|C)$/.exec(label);
  if (sided) return `${sided[1] ?? label} [${sided[2] ?? ""}]`;
  return [12, 14, 21, 28, 47].includes(channel) ? `${label} [L]` : label;
}

export function MocrvizPanel({ config }: { config: MissionConfig }) {
  const catalog = channelsFor(config.id);
  return catalog && (config.id === "11" || config.id === "13") ? (
    <MissionControl config={config} mission={config.id} catalog={catalog} />
  ) : null;
}

/** React owns the UI and query state. Effects bridge the canonical Zustand clock to
 * the browser audio element and canvas, which deliberately remain imperative engines. */
function MissionControl({
  config,
  mission,
  catalog,
}: {
  config: MissionConfig;
  mission: MocrMissionId;
  catalog: MissionChannels;
}) {
  const seconds = useMissionStore((state) => state.seconds);
  const playing = useMissionStore((state) => state.playing);
  const muted = useMissionStore((state) => state.muted);
  const rightTab = useMissionStore((state) => state.rightTab);
  const channel = useMissionStore((state) => state.selectedChannel) ?? catalog.defaultChannel;
  const selectChannel = useMissionStore((state) => state.selectChannel);
  const seek = useMissionStore((state) => state.seek);
  const hovered = useMocrHover((state) => state.channel);
  const hover = useMocrHover((state) => state.setChannel);
  const [timelineHover, setTimelineHover] = useState<TimelineHover | null>(null);
  const [width, setWidth] = useState(0);
  const [audioError, setAudioError] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null);
  const audio = useRef<HTMLAudioElement>(null);
  const controller = useRef<MocrvizAudioController | null>(null);
  const root = `${config.mediaRoot}/MOCR_audio`;
  const tapes = useMocrTapes(mission);
  const tape = tapes.data ? findTapeForGet(tapes.data, channel, seconds) : null;
  const waveform = useRecordingWaveform(mission, root, channel, tape);
  const activity = useChannelActivity(mission, root, seconds, Math.ceil(width / 2) + 2);
  const waveformSeconds =
    playing && rightTab === "mocr"
      ? (controller.current?.playbackGetSeconds() ?? seconds)
      : seconds;
  const labels = useMemo(
    () => new Map(catalog.all.map((entry) => [entry.id, displayLabel(entry.id, entry.label)])),
    [catalog],
  );
  const ordered = useMemo(() => [...catalog.available].sort((a, b) => a - b), [catalog]);
  const waveMessage =
    !tape || tape.tapeId === "T999"
      ? "No recording at this mission time"
      : waveform.isError
        ? "Waveform unavailable for this recording"
        : waveform.isPending
          ? "Loading recorded waveform…"
          : "";

  useEffect(() => {
    const element = audio.current;
    if (!tapes.data || !element) return;
    const engine = new MocrvizAudioController(
      { mission, audioRoot: root, tapes: tapes.data, createAudio: () => element },
      catalog.defaultChannel,
    );
    controller.current = engine;
    return () => {
      engine.destroy();
      controller.current = null;
    };
  }, [mission, root, tapes.data, catalog.defaultChannel]);

  useEffect(() => {
    controller.current?.setChannel(channel);
    controller.current?.tick(seconds, playing && rightTab === "mocr");
  }, [channel, seconds, playing, rightTab, tapes.data]);

  useLayoutEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const observer = new ResizeObserver(() => {
      setWidth(element.getBoundingClientRect().width);
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useLayoutEffect(() => {
    if (!canvas.current || rightTab !== "mocr") return;
    drawTimeline(canvas.current, {
      seconds,
      waveformSeconds,
      channel,
      channels: ordered,
      labels,
      activityAt: activity.at,
      waveform: waveform.data ?? null,
      tapeStart: tape?.startSeconds ?? 0,
      activityMessage: activity.message,
      waveformMessage: waveMessage,
      hoveredChannel: hovered,
      hover: timelineHover,
    });
  }, [
    seconds,
    waveformSeconds,
    channel,
    ordered,
    labels,
    activity,
    waveform.data,
    tape?.startSeconds,
    waveMessage,
    hovered,
    timelineHover,
    width,
    rightTab,
  ]);

  const displayChannel = hovered ?? channel;
  const info = catalog.all.find((entry) => entry.id === displayChannel);
  const speaking = activity.at(seconds);
  const missionLabels: Readonly<Record<number, string>> =
    mission === "11"
      ? { 16: "I", 17: "E", 18: "G", 5: "O", 57: "C", 53: "FR" }
      : { 16: "CE", 17: "PE", 18: "CG", 57: "LG" };
  const status =
    audioError && audioError === audio.current?.src
      ? "Audio could not be loaded. Select another channel or mission time."
      : tapes.isError
        ? "Mission Control recordings could not be loaded."
        : tapes.isPending
          ? "Loading Mission Control recordings..."
          : !tape || tape.tapeId === "T999"
            ? "No audio recording at this mission time."
            : `Tape ${tape.tapeId} · ${tape.channelBank} · CH ${String(channel)}`;

  return (
    <div className={styles.mocrvizPanel}>
      <canvas
        ref={canvas}
        className={styles.mocrvizTimeline}
        data-testid="mocr-timeline"
        role="application"
        tabIndex={0}
        aria-label="Recorded channel activity and audio waveform. Click to select a channel and seek in mission time."
        data-current-seconds={seconds.toFixed(3)}
        data-waveform-seconds={waveformSeconds.toFixed(3)}
        data-hover-channel={hovered ?? undefined}
        data-hover-get={timelineHover ? secondsToTimeStr(timelineHover.seconds) : undefined}
        onPointerMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          const id = ordered[Math.floor(y / TIMELINE.rowHeight)];
          if (id !== undefined && y >= 0 && y < ordered.length * TIMELINE.rowHeight) {
            setTimelineHover({ x, channel: id, seconds: activityTimeAtX(x, rect.width, seconds) });
            hover(id);
          } else {
            setTimelineHover(null);
            hover(null);
          }
        }}
        onPointerLeave={() => {
          setTimelineHover(null);
          hover(null);
        }}
        onPointerDown={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - rect.left;
          const y = event.clientY - rect.top;
          const id = ordered[Math.floor(y / TIMELINE.rowHeight)];
          if (id !== undefined && y >= 0 && y < ordered.length * TIMELINE.rowHeight) {
            selectChannel(id);
            seek(Math.round(activityTimeAtX(x, rect.width, seconds)));
          } else seek(Math.round(waveformTimeAtX(x, rect.width, seconds, waveform.data ?? null)));
        }}
      />
      <div className={styles.mocrvizBottom}>
        <section className={styles.mocrvizControls}>
          <div className={styles.mocrvizRoom}>
            <img
              className={styles.mocrvizRoomImage}
              data-testid="mocr-room-image"
              src={`/${mission}/MOCRviz/img/MOCR_consoles_dark_faded.png`}
              alt="Isometric layout of the Apollo Mission Operations Control Room"
              width={746}
              height={419}
            />
            {CONSOLES.map(([positionChannel, x, y, label, small]) => {
              const id = mission === "11" && positionChannel === 53 ? 8 : positionChannel;
              const entry = catalog.all.find((item) => item.id === id);
              return (
                <button
                  key={positionChannel}
                  type="button"
                  className={cx(
                    styles.mocrvizConsole,
                    channel === id && styles.isActive,
                    speaking?.includes(id) && styles.isSpeaking,
                    hovered === id && styles.isHovered,
                  )}
                  data-channel-id={id}
                  data-testid="mocr-console"
                  data-hovered={hovered === id || undefined}
                  aria-label={`Channel ${String(id)}, ${entry?.label ?? label}`}
                  aria-pressed={channel === id}
                  title={`${entry?.label ?? label}: ${entry?.description ?? ""}`}
                  style={{
                    left: `${String((x / 746) * 100)}%`,
                    top: `${String(((y - 68) / 419) * 100)}%`,
                    width: `${String(((small ? 30 : 44) / 746) * 100)}%`,
                  }}
                  onClick={() => {
                    if (catalog.available.includes(id)) selectChannel(id);
                  }}
                  onPointerEnter={() => {
                    hover(id);
                  }}
                  onPointerLeave={() => {
                    hover(null);
                  }}
                  onFocus={() => {
                    hover(id);
                  }}
                  onBlur={() => {
                    hover(null);
                  }}
                >
                  {missionLabels[positionChannel] ?? label}
                </button>
              );
            })}
          </div>
          <div className={styles.mocrvizControllerDetails}>
            <span className={styles.mocrvizChannelName} data-testid="mocr-channel-name">
              {labels.get(displayChannel) ?? ""}
            </span>
            : <span className={styles.mocrvizChannelDescription}>{info?.description ?? ""}</span>
          </div>
        </section>
        <ChannelTranscript
          key={`${mission}/${String(channel)}`}
          mission={mission}
          root={root}
          channel={channel}
          label={labels.get(channel) ?? "CHANNEL"}
        />
      </div>
      <p className={styles.mocrvizStatus} data-testid="mocr-status" aria-live="polite">
        {status}
      </p>
      <audio
        ref={audio}
        className={styles.mocrvizAudio}
        data-testid="mocr-audio"
        preload="metadata"
        muted={muted}
        onError={(event) => {
          setAudioError(event.currentTarget.src);
        }}
        onLoadedMetadata={() => {
          setAudioError("");
          controller.current?.tick(seconds, playing && rightTab === "mocr");
        }}
      />
    </div>
  );
}
