import { useState } from "react";
import { Link } from "react-router-dom";
import { useMissionStore } from "../../store/missionStore.js";
import { secondsToTimeStr } from "../../shell/clock.js";
import { parseDeepLink } from "../../app/deepLink.js";
import { missionGetToElapsed } from "../../app/missionTime.js";
import { MissionNavigator } from "../navigator/MissionNavigator.js";
import styles from "../../styles/base.module.css";
import { cx } from "../../styles/classNames.js";

export function MissionHeader({ config }: { config: MissionConfig }) {
  const seconds = useMissionStore((s) => Math.trunc(s.seconds));
  const seek = useMissionStore((s) => s.seek);
  const [draft, setDraft] = useState<string | null>(null);
  const date = new Date(
    Date.parse(config.launchDate) + missionGetToElapsed(config, seconds) * 1000,
  ).toUTCString();
  return (
    <header className={styles.airtHeader}>
      <Link
        className={styles.airtHeaderLogo}
        data-testid="home-link"
        to="/"
        aria-label="Apollo in Real Time home"
        style={{ backgroundImage: `url('/${config.id}/img/Apollo_${config.id}-insignia100.png')` }}
      />
      <div className={styles.airtHeaderInfo}>
        <p className={styles.airtHeaderPretitle}>
          {config.id === "11"
            ? "The First Landing on the Moon"
            : config.id === "13"
              ? "The Third Lunar Landing Attempt"
              : "The Last Landing on the Moon"}
        </p>
        <h1 className={styles.airtHeaderTitle}>{config.name}</h1>
        <p className={styles.airtHeaderSubtitle}>Real-Time Mission Experience</p>
        <div className={styles.airtClock}>
          <div className={styles.airtClockRow}>
            <span id="historicalDate" className={styles.airtClockDate}>
              {date.slice(0, 16)}
            </span>
            <span id="historicalTime" className={styles.airtClockTime}>
              {date.slice(17, 25)} UTC
            </span>
          </div>
          <div className={cx(styles.airtClockRow, styles.airtClockRowModern)} hidden>
            <span id="modernDate" className={styles.airtClockDate} />
            <span id="modernTime" className={styles.airtClockTime} />
          </div>
        </div>
        <form
          className={styles.airtGet}
          onSubmit={(event) => {
            event.preventDefault();
            const input = event.currentTarget.elements.namedItem("get");
            if (!(input instanceof HTMLInputElement)) return;
            const parsed = parseDeepLink(`?t=${encodeURIComponent(input.value.trim())}`).seek;
            if (parsed?.kind === "seconds") {
              seek(parsed.seconds);
              setDraft(null);
              input.blur();
            } else {
              input.setCustomValidity("Enter a time such as 055:54:53 or -02:00:00.");
              input.reportValidity();
            }
          }}
        >
          <label className={styles.airtGetLabel} htmlFor="missionElapsedTime">
            Ground Elapsed Time (GET):
          </label>
          <input
            id="missionElapsedTime"
            name="get"
            className={styles.airtGetInput}
            type="text"
            size={9}
            value={draft ?? secondsToTimeStr(seconds)}
            aria-label="Ground Elapsed Time"
            onChange={(event) => {
              event.currentTarget.setCustomValidity("");
              setDraft(event.currentTarget.value);
            }}
          />
          <button id="GETBtn" className={cx(styles.airtBtn, styles.airtBtnAccent)} type="submit">
            GO
          </button>
        </form>
      </div>
      <div className={styles.airtHeaderNavigator}>
        <MissionNavigator config={config} />
      </div>
    </header>
  );
}
