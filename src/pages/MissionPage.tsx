import { lazy, Suspense, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { PageHead } from "../components/layout/PageHead.js";
import { MissionHeader } from "../components/layout/MissionHeader.js";
import { MissionSplash } from "../components/layout/MissionSplash.js";
import { MissionDialogs } from "../components/layout/MissionDialogs.js";
import { TransportControls } from "../components/layout/TransportControls.js";
import { MissionVideo } from "../components/video/MissionVideo.js";
import { TranscriptPanel } from "../components/transcript/index.js";
import { TocPanel } from "../components/toc/index.js";
import { CommentaryPanel } from "../components/commentary/index.js";
import { SearchPanel } from "../components/search/index.js";
import { PhotoPanel } from "../components/photo/index.js";
import { DashboardPanel } from "../components/dashboard/index.js";
import { ChannelStrip } from "../components/mocrviz/ChannelStrip.js";
import { useMissionStore, type RightTab } from "../store/missionStore.js";
import { useVideoSegmentData } from "../api/useMissionData.js";
import { findVideoSegmentIndex } from "../data/videoSegmentData.js";
import { secondsToTimeStr } from "../shell/clock.js";
import layout from "../styles/base.module.css";
import controls from "../styles/controls.module.css";
import spacecraftStyles from "../components/spacecraft/SpacecraftPanel.module.css";
import { cx } from "../styles/classNames.js";
import { GeoSampleOverlay } from "../components/geosamples/GeoSampleOverlay.js";
import type { GeoSampleBag } from "../components/geosamples/data.js";

const MocrvizPanel = lazy(() =>
  import("../components/mocrviz/index.js").then((m) => ({ default: m.MocrvizPanel })),
);
const SpacecraftPanel = lazy(() =>
  import("../components/spacecraft/index.js").then((m) => ({ default: m.SpacecraftPanel })),
);
const SamplesPanel = lazy(() =>
  import("../components/samples/index.js").then((m) => ({ default: m.SamplesPanel })),
);

const textTabs = [
  {
    id: "transcript",
    label: "Transcript",
    title: "Every word spoken on the mission",
    Panel: TranscriptPanel,
  },
  {
    id: "toc",
    label: "Mission Milestones",
    title: "Points of interest throughout the mission",
    Panel: TocPanel,
  },
  {
    id: "commentary",
    label: "Commentary",
    title: "Description of events and post-mission interviews with the crew",
    Panel: CommentaryPanel,
  },
] as const;

export function MissionPage({ config }: { config: MissionConfig }) {
  const location = useLocation();
  // Also remount for browser back/forward between query links on one mission.
  return <MissionExperience key={location.key} config={config} />;
}

/** Composition only: panels select data/time themselves rather than receiving every tick. */
function MissionExperience({ config }: { config: MissionConfig }) {
  const [splash, setSplash] = useState(() => window.location.search === "");
  const [about, setAbout] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sampleBag, setSampleBag] = useState<GeoSampleBag | null>(null);
  const textTab = useMissionStore((s) => s.textTab);
  const rightTab = useMissionStore((s) => s.rightTab);
  const searchVisible = useMissionStore((s) => s.searchVisible);
  const override = useMissionStore((s) => s.dashboardOverride);
  const videos = useVideoSegmentData(config);
  const inVideo = useMissionStore((s) =>
    videos.data ? findVideoSegmentIndex(videos.data, s.seconds) >= 0 : false,
  );
  const dashboardVisible = override ?? (!searchVisible && !inVideo);
  const [opened, setOpened] = useState<RightTab[]>([rightTab]);
  if (!opened.includes(rightTab)) setOpened([...opened, rightTab]);
  useEffect(() => {
    // One clock publisher. High-frequency canvas/audio consumers use the same GET;
    // text panels select a row index so they render only when the active row changes.
    const timer = window.setInterval(() => {
      useMissionStore.getState().tick();
    }, 100);
    return () => {
      window.clearInterval(timer);
      // The next route loader replaces the clock. Do not pause that new clock
      // from the outgoing page's cleanup (including its realtime selection).
    };
  }, []);
  const showAbout = (): void => {
    if (config.id === "17") setSplash(false);
    setAbout(true);
  };
  const share = (): void => {
    const state = useMissionStore.getState();
    const url = new URL(window.location.href);
    const channel =
      state.rightTab === "mocr" && state.selectedChannel !== null
        ? `&ch=${encodeURIComponent(String(state.selectedChannel))}`
        : "";
    setShareUrl(`${url.origin}/${config.id}/?t=${secondsToTimeStr(state.seconds)}${channel}`);
  };
  const rightTabs: { id: RightTab; label: string }[] = [
    { id: "photo", label: "Photography" },
    ...(config.id !== "17" ? [{ id: "mocr" as const, label: "Mission Control Audio" }] : []),
    ...(config.id === "13" ? [{ id: "spacecraft" as const, label: "Spacecraft" }] : []),
    ...(config.id === "11" ? [{ id: "samples" as const, label: "Astromaterial Samples" }] : []),
  ];
  return (
    <>
      <PageHead config={config} />
      <div id="mission-root">
        <div
          className={layout.airtApp}
          role="application"
          aria-label={config.name}
          aria-hidden={splash || undefined}
        >
          <MissionHeader config={config} />
          <main className={layout.airtMain}>
            <section className={layout.airtLeft} aria-label="Mission video and transcript">
              <div
                className={cx(layout.airtMonitor, layout.airtMonitorTop)}
                data-testid="mission-monitor"
              >
                <MissionVideo config={config} />
                <div
                  className={layout.airtDashboardOverlay}
                  data-overlay="dashboard"
                  hidden={!dashboardVisible}
                >
                  <div className={layout.airtOverlayHead}>
                    <span className={layout.airtOverlayTitle}>Mission Status</span>
                    <button
                      className={layout.airtOverlayClose}
                      type="button"
                      data-close="dashboard"
                      aria-label="Close"
                      onClick={() => {
                        useMissionStore.getState().setDashboardVisible(false);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div id="dashboardContent" className={layout.airtDashboard}>
                    <DashboardPanel config={config} />
                  </div>
                </div>
                <div
                  id="searchOverlay"
                  className={layout.airtSearchOverlay}
                  hidden={!searchVisible}
                >
                  <div className={layout.airtOverlayHead}>
                    <span className={layout.airtOverlayTitle}>Search</span>
                    <button
                      id="searchClose"
                      className={layout.airtOverlayClose}
                      type="button"
                      aria-label="Close"
                      onClick={() => {
                        useMissionStore.getState().setSearchVisible(false);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div id="searchPanelHost" className={layout.airtSearchOverlayResults}>
                    <SearchPanel config={config} />
                  </div>
                </div>
              </div>
              <div className={controls.airtTabsWrapper} data-testid="text-controls">
                <div className={controls.airtButtonRow} role="tablist" aria-label="Mission text">
                  {textTabs.map(({ id, label, title }) => (
                    <button
                      key={id}
                      id={`${id}Tab`}
                      className={cx(controls.airtTab, textTab === id && controls.isActive)}
                      type="button"
                      role="tab"
                      aria-selected={textTab === id}
                      aria-controls={`${id}Wrapper`}
                      title={title}
                      onClick={() => {
                        useMissionStore.getState().setTextTab(id);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <TransportControls
                  dashboardVisible={dashboardVisible}
                  onAbout={showAbout}
                  onShare={share}
                />
              </div>
              <div
                className={cx(layout.airtMonitor, layout.airtMonitorText)}
                data-testid="text-monitor"
              >
                {textTabs.map(({ id, Panel }) => (
                  <div
                    key={id}
                    id={`${id}Wrapper`}
                    className={layout.airtTextPanel}
                    role="tabpanel"
                    aria-labelledby={`${id}Tab`}
                    hidden={textTab !== id}
                  >
                    {id === "transcript" ? (
                      config.id === "17" ? (
                        <TranscriptPanel
                          config={config}
                          onOpenSampleBag={(bag) => {
                            useMissionStore.getState().setRightTab("photo");
                            setSampleBag(bag);
                          }}
                        />
                      ) : (
                        <TranscriptPanel config={config} />
                      )
                    ) : (
                      <Panel config={config} />
                    )}
                  </div>
                ))}
              </div>
            </section>
            <section
              className={layout.airtChannels}
              data-testid="mission-channels"
              aria-label="Mission Control channels"
              hidden={config.id === "17"}
            >
              <div className={layout.airtChannelsTitle}>Mission Control Channels</div>
              <div id="thirtytrack-container" className={layout.airtChannelsList}>
                <ChannelStrip config={config} />
              </div>
            </section>
            <section
              className={cx(layout.airtRight, rightTab === "mocr" && layout.isMocrvizActive)}
              data-testid="right-panel"
              aria-label="Photography"
            >
              <div className={layout.airtRightTabs} data-testid="right-tabs">
                {rightTabs.map(({ id, label }) => (
                  <button
                    key={id}
                    id={`${id}Tab`}
                    className={cx(controls.airtAppTab, rightTab === id && controls.isActive)}
                    type="button"
                    aria-selected={rightTab === id}
                    onClick={() => {
                      useMissionStore.getState().setRightTab(id);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className={layout.airtRightBody}>
                <PhotoPanel config={config} />
                <div
                  id="mocrviz-host"
                  className={layout.airtMocrvizHost}
                  style={{ padding: 0 }}
                  hidden={rightTab !== "mocr"}
                >
                  {opened.includes("mocr") && (
                    <Suspense fallback="Loading Mission Control recordings...">
                      <MocrvizPanel config={config} />
                    </Suspense>
                  )}
                </div>
                {config.id === "13" && (
                  <div
                    id="spacecraft-host"
                    className={cx(layout.airtMocrvizHost, spacecraftStyles.spacecraftPanel)}
                    hidden={rightTab !== "spacecraft"}
                  >
                    {opened.includes("spacecraft") && (
                      <Suspense fallback="Loading...">
                        <SpacecraftPanel config={config} visible={rightTab === "spacecraft"} />
                      </Suspense>
                    )}
                  </div>
                )}
                {config.id === "11" && (
                  <div
                    id="samples-host"
                    className={layout.airtMocrvizHost}
                    style={{ padding: 0 }}
                    hidden={rightTab !== "samples"}
                  >
                    {opened.includes("samples") && (
                      <Suspense fallback="Loading...">
                        <SamplesPanel config={config} />
                      </Suspense>
                    )}
                  </div>
                )}
              </div>
              {config.id === "17" && sampleBag && (
                <GeoSampleOverlay
                  config={config}
                  bag={sampleBag}
                  onClose={() => {
                    setSampleBag(null);
                  }}
                />
              )}
            </section>
          </main>
          <div
            id="debug-host"
            className={layout.airtDebug}
            hidden={!new URLSearchParams(window.location.search).has("debug")}
          >
            <h2>config</h2>
            <pre>{JSON.stringify(config, null, 2)}</pre>
          </div>
        </div>
        <MissionDialogs
          config={config}
          about={about}
          shareUrl={shareUrl}
          onClose={() => {
            setAbout(false);
            setShareUrl(null);
          }}
        />
        {splash && (
          <MissionSplash
            config={config}
            onDismiss={() => {
              setSplash(false);
            }}
            onAbout={showAbout}
          />
        )}
      </div>
    </>
  );
}
