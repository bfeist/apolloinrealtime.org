import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { realtimeGet } from "../../app/playback.js";
import { timeIdToSeconds } from "../../shell/clock.js";
import { useMissionStore } from "../../store/missionStore.js";
import { toggleFullscreen } from "./TransportControls.js";

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
  const epoch = Date.parse(config.launchDate);
  const years = Math.max(0, Math.floor((now - epoch) / 31_556_952_000));
  const date = new Date(epoch + realtimeGet(epoch, 0, now) * 1000).toUTCString();
  const enter = (seconds: number): void => {
    const state = useMissionStore.getState();
    state.seek(seconds);
    state.setPlaying(true);
    onDismiss();
  };
  return (
    <section
      className={`mission-splash mission-splash--${config.id}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="missionSplashTitle"
    >
      <div className="mission-splash__about">
        <div className="mission-splash__identity">
          <Link className="mission-splash__patch" to="/" aria-label="Apollo in Real Time home" />
          <div>
            <div className="mission-splash__heading-row">
              <h1 id="missionSplashTitle" className="mission-splash__heading">
                {config.name}
              </h1>
              <span className="mission-splash__realtime">In Real Time</span>
            </div>
            <p className="mission-splash__subheading">{splash.tagline}</p>
            <p className="mission-splash__description">{splash.description}</p>
            <p className="mission-splash__description">
              Relive the mission as it occurred in {splash.year}
            </p>
          </div>
        </div>
      </div>
      <div className="mission-splash__actions">
        <div className="mission-splash__section mission-splash__entry">
          <button
            autoFocus
            className="mission-splash__button mission-splash__button--primary"
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
        <div className="mission-splash__section mission-splash__entry">
          <button
            className="mission-splash__button"
            type="button"
            data-enter="now"
            onClick={() => {
              enter(realtimeGet(epoch, 0));
            }}
          >
            Now
          </button>
          <div>
            <p>Join in-progress</p>
            <small>
              {config.id === "13" ? "~" : ""}
              {years} years ago
            </small>
            <p className="mission-splash__historical">
              <span data-historical-date>{date.slice(0, 16)}</span>
              <span data-historical-time>{date.slice(17, 25)} UTC</span>
              <small>Current time in {splash.year}</small>
            </p>
          </div>
        </div>
        <div className="mission-splash__section mission-splash__fullscreen">
          <button
            className="mission-splash__icon-button"
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
        <div className="mission-splash__section mission-splash__included">
          <p>Included real-time elements:</p>
          <ul>
            {splash.included.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <button
            className="mission-splash__button mission-splash__button--credits"
            type="button"
            data-action="about"
            onClick={onAbout}
          >
            Instructions / Credits
          </button>
        </div>
        <div className="mission-splash__section mission-splash__forum">
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
