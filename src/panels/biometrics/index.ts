import { biometricValueAt, loadBiometrics } from "./data.js";
import type { BiometricSample } from "./data.js";
import "../../styles/panels/biometrics.css";

export interface BiometricsPanelOptions {
  container: HTMLElement;
  /** Mission asset root. This panel is currently used only by Apollo 17. */
  baseUrl?: string;
}

export interface BiometricsPanelHandle {
  update: (currentSeconds: number) => void;
  destroy: () => void;
}

/** Restore Apollo 17's Cernan/Schmitt heart and metabolic dashboard readout. */
export async function createBiometricsPanel(
  options: BiometricsPanelOptions,
): Promise<BiometricsPanelHandle> {
  const panel = document.createElement("section");
  panel.className = "biometrics-panel";
  panel.setAttribute("aria-label", "Crew biometric data");
  panel.innerHTML = `<h3>Heart / Metabolic rates</h3>
    <div class="biometrics-readings"></div>
    <p class="biometrics-note">Loading biometric records...</p>`;
  options.container.append(panel);
  const readings = panel.querySelector(".biometrics-readings");
  const note = panel.querySelector(".biometrics-note");
  if (!readings || !note) throw new Error("Biometrics panel template is incomplete");
  const data = await loadBiometrics(options.baseUrl);
  const fields: { element: HTMLElement; samples: readonly BiometricSample[] }[] = [];
  for (const [name, heart, metabolic] of [
    ["Cernan", data.cdrHeart, data.cdrMetabolic],
    ["Schmitt", data.lmpHeart, data.lmpMetabolic],
  ] as const) {
    const row = document.createElement("div");
    row.className = "biometrics-row";
    const label = document.createElement("span");
    label.className = "biometrics-name";
    label.textContent = `${name}:`;
    row.append(label);
    for (const [samples, units] of [
      [heart, "bpm"],
      [metabolic, "btu/hr"],
    ] as const) {
      const reading = document.createElement("span");
      const value = document.createElement("span");
      value.className = "biometrics-value";
      value.textContent = "n/a";
      reading.append(value, ` ${units}`);
      row.append(reading);
      fields.push({ element: value, samples });
    }
    readings.append(row);
  }
  note.textContent = data.unavailableStreams
    ? "Some biometric records are unavailable."
    : "n/a = no recorded data at this time";
  let destroyed = false;
  return {
    update(currentSeconds): void {
      if (destroyed) return;
      for (const { element, samples } of fields) {
        const value = biometricValueAt(samples, currentSeconds);
        element.textContent = value === null ? "n/a" : String(value);
      }
    },
    destroy(): void {
      destroyed = true;
      panel.remove();
    },
  };
}
