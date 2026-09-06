import { useMissionStore } from "../../store/missionStore.js";
import { biometricValueAt } from "./data.js";
import { useBiometricsData } from "./useBiometricsData.js";
import "../../styles/panels/biometrics.css";

/** The four recorded streams remain independent; gaps display n/a. */
export function BiometricsPanel({ config }: { config: MissionConfig }) {
  const seconds = useMissionStore((state) => state.seconds);
  const query = useBiometricsData(config);
  const data = query.data;
  return (
    <section className="biometrics-panel" aria-label="Crew biometric data">
      <h3>Heart / Metabolic rates</h3>
      <div className="biometrics-readings">
        {data &&
          (
            [
              ["Cernan", data.cdrHeart, data.cdrMetabolic],
              ["Schmitt", data.lmpHeart, data.lmpMetabolic],
            ] as const
          ).map(([name, heart, metabolic]) => (
            <div className="biometrics-row" key={name}>
              <span className="biometrics-name">{name}:</span>
              <span>
                <span className="biometrics-value">
                  {biometricValueAt(heart, seconds) ?? "n/a"}
                </span>{" "}
                bpm
              </span>
              <span>
                <span className="biometrics-value">
                  {biometricValueAt(metabolic, seconds) ?? "n/a"}
                </span>{" "}
                btu/hr
              </span>
            </div>
          ))}
      </div>
      <p className="biometrics-note">
        {query.isPending
          ? "Loading biometric records..."
          : query.isError || data?.unavailableStreams
            ? "Some biometric records are unavailable."
            : "n/a = no recorded data at this time"}
      </p>
    </section>
  );
}
