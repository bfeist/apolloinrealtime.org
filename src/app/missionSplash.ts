import { timeIdToSeconds } from "../shell/clock.js";
import { realtimeGet } from "./playback.js";

interface MissionSplashOptions {
  config: MissionConfig;
  container: HTMLElement;
  onEnter: (seconds: number) => void;
  onAbout: () => void;
}

/** Show the legacy mission entry only for a bare mission URL. */
export function mountMissionSplash(options: MissionSplashOptions): void {
  if (window.location.search !== "") return;

  const { config, container } = options;
  const splash = document.createElement("section");
  splash.className = `mission-splash mission-splash--${config.id}`;
  splash.setAttribute("role", "dialog");
  splash.setAttribute("aria-modal", "true");
  splash.setAttribute("aria-labelledby", "missionSplashTitle");
  splash.innerHTML = splashHtml(config);
  container.appendChild(splash);

  const app = container.querySelector<HTMLElement>(".airt-app");
  const aboutDialog = app?.querySelector<HTMLDialogElement>("#aboutDialog");
  if (aboutDialog) container.appendChild(aboutDialog);
  app?.setAttribute("aria-hidden", "true");

  let historicalInterval: number | null = null;

  const dismiss = (seconds: number): void => {
    if (historicalInterval !== null) window.clearInterval(historicalInterval);
    options.onEnter(seconds);
    splash.remove();
    app?.removeAttribute("aria-hidden");
  };

  splash.querySelector("[data-enter='launch']")?.addEventListener("click", () => {
    dismiss(timeIdToSeconds(config.defaultStartTimeId));
  });
  splash.querySelector("[data-enter='now']")?.addEventListener("click", () => {
    dismiss(realtimeGet(Date.parse(config.launchDate), 0));
  });
  splash.querySelector("[data-action='fullscreen']")?.addEventListener("click", () => {
    const action = document.fullscreenElement
      ? document.exitFullscreen()
      : document.documentElement.requestFullscreen();
    void action.catch((error: unknown) => {
      console.warn("Fullscreen unavailable", error);
    });
  });
  splash.querySelector("[data-action='about']")?.addEventListener("click", () => {
    // Apollo 17's legacy help body starts beneath the live mission header.
    if (config.id === "17") {
      if (historicalInterval !== null) window.clearInterval(historicalInterval);
      splash.remove();
      app?.removeAttribute("aria-hidden");
    }
    options.onAbout();
  });

  const updateHistoricalTime = (): void => {
    if (!splash.isConnected) return;
    const seconds = realtimeGet(Date.parse(config.launchDate), 0);
    const date = new Date(Date.parse(config.launchDate) + seconds * 1000);
    const dateNode = splash.querySelector("[data-historical-date]");
    const timeNode = splash.querySelector("[data-historical-time]");
    if (dateNode) dateNode.textContent = date.toUTCString().slice(0, 16);
    if (timeNode) timeNode.textContent = `${date.toUTCString().slice(17, 25)} UTC`;
  };
  updateHistoricalTime();
  historicalInterval = window.setInterval(updateHistoricalTime, 1000);

  splash.querySelector<HTMLElement>("[data-enter='launch']")?.focus();
}

function splashHtml(config: MissionConfig): string {
  const splashConfig = config.splash;
  const list = splashConfig.included.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const years = elapsedYears(Date.parse(config.launchDate));
  return `
    <div class="mission-splash__about">
      <div class="mission-splash__identity">
        <a class="mission-splash__patch" href="/" aria-label="Apollo in Real Time home"></a>
        <div>
          <div class="mission-splash__heading-row">
            <h1 id="missionSplashTitle" class="mission-splash__heading">${escapeHtml(config.name)}</h1>
            <span class="mission-splash__realtime">In Real Time</span>
          </div>
          <p class="mission-splash__subheading">${escapeHtml(splashConfig.tagline)}</p>
          <p class="mission-splash__description">${escapeHtml(splashConfig.description)}</p>
          <p class="mission-splash__description">Relive the mission as it occurred in ${escapeHtml(splashConfig.year)}</p>
        </div>
      </div>
    </div>
    <div class="mission-splash__actions">
      <div class="mission-splash__section mission-splash__entry">
        <button class="mission-splash__button mission-splash__button--primary" type="button" data-enter="launch">T-Minus 1m</button>
        <p>Join at 1 minute to launch</p>
      </div>
      <div class="mission-splash__section mission-splash__entry">
        <button class="mission-splash__button" type="button" data-enter="now">Now</button>
        <div>
          <p>Join in-progress</p>
          <small>${config.id === "13" ? "~" : ""}${String(years)} years ago</small>
          <p class="mission-splash__historical">
            <span data-historical-date></span>
            <span data-historical-time></span>
            <small>Current time in ${escapeHtml(splashConfig.year)}</small>
          </p>
        </div>
      </div>
      <div class="mission-splash__section mission-splash__fullscreen">
        <button class="mission-splash__icon-button" type="button" data-action="fullscreen" aria-label="Fullscreen"></button>
        <p>Fullscreen<br><small>(recommended)</small></p>
      </div>
      <div class="mission-splash__section mission-splash__included">
        <p>Included real-time elements:</p>
        <ul>${list}</ul>
        <button class="mission-splash__button mission-splash__button--credits" type="button" data-action="about">Instructions / Credits</button>
      </div>
      <div class="mission-splash__section mission-splash__forum">
        <p>Join our Forum:</p>
        <ul><li>Share and discover moments of interest at <a href="https://forum.apolloinrealtime.org" target="_blank" rel="noopener">forum.apolloinrealtime.org</a></li></ul>
      </div>
    </div>`;
}

function elapsedYears(launchEpoch: number): number {
  return Math.max(0, Math.floor((Date.now() - launchEpoch) / 31_556_952_000));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
