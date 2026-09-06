import { useState } from "react";
import { Link } from "react-router-dom";
import { useMissionStore } from "../../store/missionStore.js";
import { secondsToTimeStr } from "../../shell/clock.js";
import { parseDeepLink } from "../../app/deepLink.js";
import { MissionNavigator } from "../navigator/MissionNavigator.js";

export function MissionHeader({ config }: { config: MissionConfig }) {
  const seconds = useMissionStore((s) => Math.trunc(s.seconds));
  const seek = useMissionStore((s) => s.seek);
  const [draft, setDraft] = useState<string | null>(null);
  const date = new Date(Date.parse(config.launchDate) + seconds * 1000).toUTCString();
  return (
    <header className="airt-header">
      <Link
        className="airt-header__logo"
        to="/"
        aria-label="Apollo in Real Time home"
        style={{ backgroundImage: `url('/${config.id}/img/Apollo_${config.id}-insignia100.png')` }}
      />
      <div className="airt-header__info">
        <p className="airt-header__pretitle">
          {config.id === "11"
            ? "The First Landing on the Moon"
            : config.id === "13"
              ? "The Third Lunar Landing Attempt"
              : "The Last Landing on the Moon"}
        </p>
        <h1 className="airt-header__title">{config.name}</h1>
        <p className="airt-header__subtitle">Real-Time Mission Experience</p>
        <div className="airt-clock">
          <div className="airt-clock__row">
            <span id="historicalDate" className="airt-clock__date">
              {date.slice(0, 16)}
            </span>
            <span id="historicalTime" className="airt-clock__time">
              {date.slice(17, 25)} UTC
            </span>
          </div>
          <div className="airt-clock__row airt-clock__row--modern" hidden>
            <span id="modernDate" className="airt-clock__date" />
            <span id="modernTime" className="airt-clock__time" />
          </div>
        </div>
        <form
          className="airt-get"
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
          <label className="airt-get__label" htmlFor="missionElapsedTime">
            Ground Elapsed Time (GET):
          </label>
          <input
            id="missionElapsedTime"
            name="get"
            className="airt-get__input"
            type="text"
            size={9}
            value={draft ?? secondsToTimeStr(seconds)}
            aria-label="Ground Elapsed Time"
            onChange={(event) => {
              event.currentTarget.setCustomValidity("");
              setDraft(event.currentTarget.value);
            }}
          />
          <button id="GETBtn" className="airt-btn airt-btn--accent" type="submit">
            GO
          </button>
        </form>
      </div>
      <div className="airt-header__navigator">
        <MissionNavigator config={config} />
      </div>
    </header>
  );
}
