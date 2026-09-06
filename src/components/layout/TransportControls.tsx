import { useMissionStore } from "../../store/missionStore.js";
import { realtimeGet } from "../../app/playback.js";

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
    <div className="airt-button-row airt-button-row--small">
      <button
        id="searchBtn"
        className={`airt-action-btn${searchVisible ? " is-active" : ""}`}
        type="button"
        title="Search mission"
        aria-label="Search"
        onClick={() => {
          setSearchVisible(!searchVisible);
        }}
      />
      <button
        id="realtimeBtn"
        className="airt-action-btn"
        type="button"
        title="Sync to today's clock"
        aria-label="Sync to today's clock"
        onClick={() => {
          const state = useMissionStore.getState();
          state.seek(realtimeGet(Date.parse(config.launchDate), state.seconds));
          state.setPlaying(true);
        }}
      />
      <button
        id="aboutBtn"
        className="airt-action-btn"
        type="button"
        title="How to explore"
        aria-label="How to explore"
        onClick={onAbout}
      />
      <button
        id="dashboardBtn"
        className={`airt-action-btn${dashboardVisible ? " is-active" : ""}`}
        type="button"
        title="Show/hide Mission Status"
        aria-label="Dashboard"
        onClick={() => {
          setDashboardVisible(!dashboardVisible);
        }}
      />
      <button
        id="soundBtn"
        className="airt-action-btn"
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
        className="airt-action-btn"
        type="button"
        title="Fullscreen"
        aria-label="Fullscreen"
        onClick={toggleFullscreen}
      />
      <button
        id="shareBtn"
        className="airt-action-btn airt-action-btn--labeled"
        type="button"
        title="Share this moment"
        aria-label="Share this moment"
        onClick={onShare}
      >
        Share
      </button>
      <button
        id="playPauseBtn"
        className="airt-action-btn airt-action-btn--labeled"
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
