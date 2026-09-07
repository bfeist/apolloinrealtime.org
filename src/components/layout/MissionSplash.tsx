import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { missionRealtimeGet } from "../../app/playback.js";
import { missionAnniversary } from "../../app/anniversary.js";
import { timeIdToSeconds } from "../../shell/clock.js";
import { useMissionStore } from "../../store/missionStore.js";
import { toggleFullscreen } from "./TransportControls.js";
import styles from "./MissionSplash.module.css";
import { cx } from "../../styles/classNames.js";

export function MissionSplash({
  config,
  onDismiss,
  onAbout,
}: {
  config: MissionConfig;
  onDismiss: () => void;
  onAbout: () => void;
}) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, []);
  const splash = config.splash;
  const missionStyle =
    config.id === "13" ? styles.missionSplash13 : config.id === "17" ? styles.missionSplash17 : "";
  const epoch = Date.parse(config.launchDate);
  const { years, isAnniversary } = missionAnniversary(config, now);
  const date = new Date(epoch + missionRealtimeGet(config, 0, now) * 1000).toUTCString();
  const enter = (seconds: number): void => {
    const state = useMissionStore.getState();
    state.seek(seconds);
    state.setPlaying(true);
    onDismiss();
  };
  return (
    <section
      className={cx(styles.missionSplash, missionStyle)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="missionSplashTitle"
    >
      <div className={styles.missionSplashAbout}>
        <div className={styles.missionSplashIdentity}>
          <Link
            className={styles.missionSplashPatch}
            to="/"
            aria-label="Apollo in Real Time home"
          />
          <div>
            <div className={styles.missionSplashHeadingRow}>
              <h1 id="missionSplashTitle" className={styles.missionSplashHeading}>
                {config.name}
              </h1>
              <span className={styles.missionSplashRealtime}>In Real Time</span>
            </div>
            <p className={styles.missionSplashSubheading}>{splash.tagline}</p>
            <p className={styles.missionSplashDescription}>{splash.description}</p>
            <p className={styles.missionSplashDescription}>
              Relive the mission as it occurred in {splash.year}
            </p>
          </div>
        </div>
      </div>
      <div className={styles.missionSplashActions}>
        <div className={cx(styles.missionSplashSection, styles.missionSplashEntry)}>
          <button
            autoFocus
            className={cx(styles.missionSplashButton, styles.missionSplashButtonPrimary)}
            type="button"
            data-enter="launch"
            onClick={() => {
              enter(timeIdToSeconds(config.defaultStartTimeId));
            }}
          >
            T-Minus 1m
          </button>
          <p>Join at 1 minute to launch</p>
        </div>
        <div className={cx(styles.missionSplashSection, styles.missionSplashEntry)}>
          <button
            className={styles.missionSplashButton}
            type="button"
            data-enter="now"
            onClick={() => {
              enter(missionRealtimeGet(config, 0));
            }}
          >
            Now
          </button>
          <div>
            <p>Join in-progress</p>
            <small data-testid="mission-anniversary">
              {isAnniversary ? "Exactly " : ""}
              {years} years ago
            </small>
            <p className={styles.missionSplashHistorical}>
              <span data-historical-date>{date.slice(0, 16)}</span>
              <span data-historical-time>{date.slice(17, 25)} UTC</span>
              <small>Current time in {splash.year}</small>
            </p>
          </div>
        </div>
        <div className={cx(styles.missionSplashSection, styles.missionSplashFullscreen)}>
          <button
            className={styles.missionSplashIconButton}
            type="button"
            data-action="fullscreen"
            aria-label="Fullscreen"
            onClick={toggleFullscreen}
          />
          <p>
            Fullscreen
            <br />
            <small>(recommended)</small>
          </p>
        </div>
        <div className={cx(styles.missionSplashSection, styles.missionSplashIncluded)}>
          <p>Included real-time elements:</p>
          <ul>
            {splash.included.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button
            className={cx(styles.missionSplashButton, styles.missionSplashButtonCredits)}
            type="button"
            data-action="about"
            onClick={onAbout}
          >
            Instructions / Credits
          </button>
        </div>
        <div className={cx(styles.missionSplashSection, styles.missionSplashForum)}>
          <p>Join our Forum:</p>
          <ul>
            <li>
              Share and discover moments of interest at{" "}
              <a href="https://forum.apolloinrealtime.org" target="_blank" rel="noopener">
                forum.apolloinrealtime.org
              </a>
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
