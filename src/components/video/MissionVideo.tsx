import { useEffect, useRef, useState } from "react";
import { useVideoUrlData } from "../../api/useMissionData.js";
import { findVideoUrlIndex } from "../../data/videoUrlData.js";
import {
  loadYouTubeIframeApi,
  syncYouTubePlayback,
  youtubePlayerVars,
} from "../../engines/ytplayer/index.js";
import { useMissionStore } from "../../store/missionStore.js";
import styles from "../../styles/base.module.css";
import { cx } from "../../styles/classNames.js";

export function MissionVideo({ config }: { config: MissionConfig }) {
  const host = useRef<HTMLDivElement>(null);
  const { data, error } = useVideoUrlData(config);
  const [unavailable, setUnavailable] = useState(false);
  const playing = useMissionStore((s) => s.playing);
  const setPlaying = useMissionStore((s) => s.setPlaying);
  useEffect(() => {
    if (!host.current || !data) return;
    let disposed = false;
    let player: YTPlayer | undefined;
    let unsubscribe: (() => void) | undefined;
    // YouTube replaces this leaf. React must not reconcile its iframe children.
    const target = document.createElement("div");
    target.id = "player";
    target.className = cx(styles.airtPlayer);
    host.current.append(target);
    void loadYouTubeIframeApi()
      .then((yt) => {
        if (disposed) return;
        let key = "";
        let ready = false;
        const sync = (forceSeek = false): void => {
          if (!ready || !player || disposed) return;
          const state = useMissionStore.getState();
          const entry = data.entries[findVideoUrlIndex(data, state.seconds)];
          if (!entry) {
            player.pauseVideo();
            key = "";
            return;
          }
          const nextKey = `${entry.videoId}:${String(entry.startSeconds)}`;
          const offset = Math.max(0, state.seconds - entry.startSeconds);
          if (nextKey !== key) {
            key = nextKey;
            setUnavailable(false);
            if (state.playing) player.loadVideoById(entry.videoId, offset);
            else player.cueVideoById(entry.videoId, offset);
          } else if ((state.playing || forceSeek) && Math.abs(player.getCurrentTime() - offset) > 2)
            player.seekTo(offset, true);
          syncYouTubePlayback(player, player.getPlayerState(), state.playing, yt.PlayerState);
          if (state.muted || state.rightTab === "mocr") player.mute();
          else player.unMute();
        };
        const hideCaptions = (): void => {
          if (player?.getOptions?.().includes("captions")) player.unloadModule?.("captions");
        };
        player = new yt.Player("player", {
          width: "100%",
          height: "100%",
          playerVars: youtubePlayerVars(window.location.origin),
          events: {
            onReady: (event: { target: YTPlayer }) => {
              if (disposed) return;
              player = event.target;
              ready = true;
              hideCaptions();
              sync();
              unsubscribe = useMissionStore.subscribe((state, previous) => {
                if (
                  Math.floor(state.seconds) !== Math.floor(previous.seconds) ||
                  state.playing !== previous.playing ||
                  state.muted !== previous.muted ||
                  state.rightTab !== previous.rightTab ||
                  state.seekRevision !== previous.seekRevision
                )
                  sync(state.seekRevision !== previous.seekRevision);
              });
            },
            onStateChange: () => {
              hideCaptions();
              sync();
            },
            onApiChange: hideCaptions,
            onError: () => {
              if (!disposed) setUnavailable(true);
            },
          },
        });
      })
      .catch(() => {
        if (!disposed) setUnavailable(true);
      });
    const element = host.current;
    return () => {
      disposed = true;
      unsubscribe?.();
      player?.destroy?.();
      element.replaceChildren();
    };
  }, [data]);
  return (
    <div
      id="player-iframe-wrapper"
      className={styles.airtPlayerWrapper}
      data-media-error={unavailable || undefined}
    >
      <div ref={host} style={{ width: "100%", height: "100%" }} />
      {(error !== null || unavailable) && (
        <p role="status">
          Video is unavailable. The mission timeline and historical material remain accessible.
        </p>
      )}
      <button
        id="videoPlaybackBtn"
        className={styles.airtVideoPlayback}
        type="button"
        aria-label={playing ? "Pause mission video" : "Play mission video"}
        aria-pressed={playing}
        title={playing ? "Pause the mission" : "Play the mission"}
        onClick={() => {
          setPlaying(!playing);
        }}
      />
    </div>
  );
}
