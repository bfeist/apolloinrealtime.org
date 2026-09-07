import {
  useCrewStatusData,
  useMissionStagesData,
  useTelemetryData,
} from "../../api/useMissionData.js";
import { findStageIndex } from "../../data/missionStagesData.js";
import { useMissionStore } from "../../store/missionStore.js";
import { BiometricsPanel } from "../biometrics/index.js";
import { CrewStatusPanel } from "../crewStatus/index.js";
import { TelemetryPanel, type FrameOfReferenceRange } from "../telemetry/index.js";
import { missionDay } from "./data.js";
import styles from "./DashboardPanel.module.css";

export { missionDay } from "./data.js";

/** Apollo 13's original telemetry switches reference bodies during lunar passage. */
const LUNAR_PASSAGE: readonly FrameOfReferenceRange[] = [
  { startSeconds: 270368, endSeconds: 309540, frame: "Moon" },
];

/** Query data is cached; every readout derives from the single shared mission clock. */
export function DashboardPanel({ config }: { config: MissionConfig }) {
  const seconds = useMissionStore((state) => state.seconds);
  const stages = useMissionStagesData(config);
  const crew = useCrewStatusData(config);
  const telemetry = useTelemetryData(config);
  if (stages.isError || crew.isError || telemetry.isError)
    return <>failed to load dashboard data</>;
  if (!stages.data || !crew.data || !telemetry.data) return <>Loading mission status...</>;
  const stage = stages.data.stages[findStageIndex(stages.data, seconds)];
  return (
    <>
      <div className={styles.dashboardPanel}>
        <div className={styles.dashRow}>
          <span className={styles.label}>Mission Day:</span>
          <span className={styles.value}>
            <span id="dashMissionDay">{missionDay(Math.max(0, seconds))}</span>/
            {Math.ceil(config.missionDurationSeconds / 86400)}
          </span>
        </div>
        <div className={styles.dashRow}>
          <span className={styles.label}>Mission Phase:</span>
          <span className={styles.value} id="dashMissionStage">
            {stage?.name ?? "--"}
          </span>
        </div>
        <div className={styles.dashRow}>
          <span className={styles.label}>Crew Status:</span>
          <div id="dashCrewStatus">
            <CrewStatusPanel data={crew.data} seconds={seconds} />
          </div>
        </div>
        <div className={styles.dashRow}>
          <span className={styles.label}>Telemetry:</span>
          <div id="dashTelemetry">
            <TelemetryPanel
              data={telemetry.data}
              frameRanges={config.id === "13" ? LUNAR_PASSAGE : []}
              seconds={seconds}
            />
          </div>
        </div>
      </div>
      {config.id === "17" && (
        <div>
          <BiometricsPanel config={config} />
        </div>
      )}
    </>
  );
}
