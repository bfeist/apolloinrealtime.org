/**
 * Crew status panel.
 *
 * Phase 5 Track C — typed replacement for the `dashCrewStatus` block in
 * legacy `updateDashboard()`. Renders the current crew status text
 * (which may include the legacy `<BR>`/`<span class="value">` HTML) and,
 * when the crew is sleeping, a countdown to the next wake-up entry.
 *
 * The legacy code detected sleeping by inspecting characters 15..7 from
 * the end of the status string (`dashCrewStatus.substr(len-15, 8) === "sleeping"`).
 * This typed version uses a case-insensitive substring match, which is
 * equivalent on the actual A11/A13/A17 data and far less fragile.
 */

import { findCrewStatusIndex } from "../../data/crewStatusData.js";
import { secondsToTimeStr } from "../../shell/clock.js";

/**
 * Returns the seconds-until-wake-up if `entries[currentIndex]` represents
 * the crew sleeping, otherwise `null`. Pure helper for testing.
 */
export function timeToWakeup(
  entries: readonly CrewStatusEntry[],
  currentIndex: number,
  currentSeconds: number,
): number | null {
  const current = entries[currentIndex];
  if (!current) return null;
  if (!/sleeping/i.test(current.statusHtml)) return null;
  const next = entries[currentIndex + 1];
  if (!next) return null;
  const remaining = next.startSeconds - currentSeconds;
  return remaining > 0 ? remaining : null;
}

/** Options for {@link createCrewStatusPanel}. */
export interface CrewStatusPanelOptions {
  container: HTMLElement;
  data: CrewStatusData;
}

export interface CrewStatusPanelHandle {
  /** Re-render at `currentSeconds`. */
  update: (currentSeconds: number) => void;
  destroy: () => void;
}

export function createCrewStatusPanel(options: CrewStatusPanelOptions): CrewStatusPanelHandle {
  const { container, data } = options;
  container.textContent = "";

  const wrap = document.createElement("div");
  wrap.className = "crewstatus_panel";
  const statusEl = document.createElement("div");
  statusEl.className = "crewstatus_text";
  const wakeEl = document.createElement("div");
  wakeEl.className = "crewstatus_wake";
  wrap.appendChild(statusEl);
  wrap.appendChild(wakeEl);
  container.appendChild(wrap);

  const update = (currentSeconds: number): void => {
    const idx = findCrewStatusIndex(data, currentSeconds);
    if (idx < 0) {
      statusEl.textContent = "(no crew status entry)";
      wakeEl.textContent = "";
      return;
    }
    const entry = data.entries[idx];
    if (!entry) return;
    // statusHtml is curated content from the CSV that legacy code injected
    // verbatim via $.html(); preserve that behavior.
    statusEl.innerHTML = entry.statusHtml;

    const wake = timeToWakeup(data.entries, idx, currentSeconds);
    if (wake === null) {
      wakeEl.textContent = "";
    } else {
      wakeEl.textContent = `Wake-up in: ${secondsToTimeStr(Math.trunc(wake))}`;
    }
  };

  const destroy = (): void => {
    container.textContent = "";
  };

  return { update, destroy };
}
