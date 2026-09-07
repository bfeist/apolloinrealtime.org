import { useMissionStore } from "../../store/missionStore.js";
import { missionRealtimeGet } from "../../app/playback.js";
import "../../styles/control-icons.css";
import styles from "../../styles/controls.module.css";
import { cx } from "../../styles/classNames.js";

export function toggleFullscreen(): void {
  const action = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen();
  void action.catch((error: unknown) => {
    console.warn("Fullscreen unavailable", error);
  });
}

export function TransportControls({
  config,
  dashboardVisible,
  onAbout,
  onShare,
}: {
  config: MissionConfig;
  dashboardVisible: boolean;
  onAbout: () => void;
  onShare: () => void;
}) {
  const playing = useMissionStore((s) => s.playing);
  const muted = useMissionStore((s) => s.muted);
  const searchVisible = useMissionStore((s) => s.searchVisible);
  const { setPlaying, setMuted, setSearchVisible, setDashboardVisible } =
    useMissionStore.getState();
  return (
    <div className={cx(styles.airtButtonRow, styles.airtButtonRowSmall)}>
      <button
        id="searchBtn"
        className={cx(styles.airtActionBtn, searchVisible && styles.isActive)}
        type="button"
        title="Search mission"
        aria-label="Search"
        onClick={() => {
          setSearchVisible(!searchVisible);
        }}
      />
      <button
        id="realtimeBtn"
        className={styles.airtActionBtn}
        type="button"
        title="Sync to today's clock"
        aria-label="Sync to today's clock"
        onClick={() => {
          const state = useMissionStore.getState();
          state.seek(missionRealtimeGet(config, state.seconds));
          state.setPlaying(true);
        }}
      />
      <button
        id="aboutBtn"
        className={styles.airtActionBtn}
        type="button"
        title="How to explore"
        aria-label="How to explore"
        onClick={onAbout}
      />
      <button
        id="dashboardBtn"
        className={cx(styles.airtActionBtn, dashboardVisible && styles.isActive)}
        type="button"
        title="Show/hide Mission Status"
        aria-label="Dashboard"
        onClick={() => {
          setDashboardVisible(!dashboardVisible);
        }}
      />
      <button
        id="soundBtn"
        className={styles.airtActionBtn}
        type="button"
        title={muted ? "Unmute sound" : "Mute sound"}
        aria-label="Sound"
        aria-pressed={muted}
        onClick={() => {
          setMuted(!muted);
        }}
      />
      <button
        id="fullscreenBtn"
        className={styles.airtActionBtn}
        type="button"
        title="Fullscreen"
        aria-label="Fullscreen"
        onClick={toggleFullscreen}
      />
      <button
        id="shareBtn"
        className={cx(styles.airtActionBtn, styles.airtActionBtnLabeled)}
        type="button"
        title="Share this moment"
        aria-label="Share this moment"
        onClick={onShare}
      >
        Share
      </button>
      <button
        id="playPauseBtn"
        className={cx(styles.airtActionBtn, styles.airtActionBtnLabeled)}
        type="button"
        title="Play/Pause"
        aria-label={playing ? "Pause" : "Play"}
        aria-pressed={playing}
        onClick={() => {
          setPlaying(!playing);
        }}
      >
        {playing ? "Pause" : "Play"}
      </button>
    </div>
  );
}
