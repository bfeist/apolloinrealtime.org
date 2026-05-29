/**
 * Dashboard panel.
 *
 * Phase 5 Track C — typed, jQuery-free composition of the legacy
 * `updateDashboard()` dashboard overlay (mission day + mission stage +
 * crew status + telemetry).
 *
 * Mirrors the legacy DOM structure (so existing `.dashboard-overlay`
 * styles continue to apply): a labelled rows layout with
 * `#dashMissionDay`, `#dashMissionStage`, `#dashCrewStatus`,
 * `#dashVelocity`, `#dashDistanceEarth`. Internally, crew status and
 * telemetry delegate to their own typed panels.
 */

import { findStageIndex } from "../../data/missionStagesData.js";
import { createCrewStatusPanel } from "../crewStatus/index.js";
import type { CrewStatusPanelHandle } from "../crewStatus/index.js";
import { createTelemetryPanel } from "../telemetry/index.js";
import type { FrameOfReferenceRange, TelemetryPanelHandle } from "../telemetry/index.js";

/** Compute the 1-based mission day for `currentSeconds`. */
export function missionDay(currentSeconds: number): number {
  return Math.floor(currentSeconds / 86400) + 1;
}

/** Options for {@link createDashboardPanel}. */
export interface DashboardPanelOptions {
  container: HTMLElement;
  stages: MissionStagesData;
  crewStatus: CrewStatusData;
  telemetry: TelemetryData;
  /** Frame-of-reference ranges for the telemetry sub-panel. */
  telemetryFrameRanges: readonly FrameOfReferenceRange[];
  /** Total mission days, e.g. 7 for A13. Displayed as `n/total`. */
  totalMissionDays: number;
}

export interface DashboardPanelHandle {
  /** Re-render at `currentSeconds`. */
  update: (currentSeconds: number) => void;
  destroy: () => void;
}

export function createDashboardPanel(options: DashboardPanelOptions): DashboardPanelHandle {
  const { container, stages, crewStatus, telemetry, totalMissionDays } = options;
  container.textContent = "";

  const wrap = document.createElement("div");
  wrap.className = "dashboard_panel";
  wrap.innerHTML = `
    <div class="dash-row"><span class="label">Mission Day:</span>
      <span class="value"><span id="dashMissionDay">--</span>/${String(totalMissionDays)}</span>
    </div>
    <div class="dash-row"><span class="label">Mission Phase:</span>
      <span class="value" id="dashMissionStage">--</span>
    </div>
    <div class="dash-row"><span class="label">Crew Status:</span>
      <div id="dashCrewStatus"></div>
    </div>
    <div class="dash-row"><span class="label">Telemetry:</span>
      <div id="dashTelemetry"></div>
    </div>
  `;
  container.appendChild(wrap);

  const dayEl = wrap.querySelector("#dashMissionDay");
  const stageEl = wrap.querySelector("#dashMissionStage");
  const crewHost = wrap.querySelector("#dashCrewStatus");
  const telemetryHost = wrap.querySelector("#dashTelemetry");
  if (
    dayEl === null ||
    stageEl === null ||
    !(crewHost instanceof HTMLElement) ||
    !(telemetryHost instanceof HTMLElement)
  ) {
    throw new Error("[panels/dashboard] template not mounted");
  }

  const crewPanel: CrewStatusPanelHandle = createCrewStatusPanel({
    container: crewHost,
    data: crewStatus,
  });
  const telemetryPanel: TelemetryPanelHandle = createTelemetryPanel({
    container: telemetryHost,
    data: telemetry,
    frameRanges: options.telemetryFrameRanges,
  });

  const update = (currentSeconds: number): void => {
    dayEl.textContent = String(missionDay(Math.max(0, currentSeconds)));
    const stageIdx = findStageIndex(stages, currentSeconds);
    if (stageIdx >= 0) {
      const stage = stages.stages[stageIdx];
      stageEl.textContent = stage?.name ?? "--";
    } else {
      stageEl.textContent = "--";
    }
    crewPanel.update(currentSeconds);
    telemetryPanel.update(currentSeconds);
  };

  const destroy = (): void => {
    crewPanel.destroy();
    telemetryPanel.destroy();
    container.textContent = "";
  };

  return { update, destroy };
}
