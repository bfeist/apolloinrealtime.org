import { computeTelemetryDisplay, type FrameOfReferenceRange } from "./data.js";
import styles from "../dashboard/DashboardPanel.module.css";
import { cx } from "../../styles/classNames.js";

export * from "./data.js";

function format(value: number, decimals: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function TelemetryPanel({
  data,
  frameRanges,
  seconds,
}: {
  data: TelemetryData;
  frameRanges: readonly FrameOfReferenceRange[];
  seconds: number;
}) {
  const display = computeTelemetryDisplay(data, frameRanges, seconds);
  const velocityDecimals = (display.velocityFps ?? 0) < 100 ? 2 : 1;
  const distanceDecimals = (display.distanceNm ?? 0) < 100 ? 2 : 1;
  const velocity =
    display.velocityFps === null
      ? "--"
      : `${format(display.velocityFps, velocityDecimals)} fps · ` +
        `${format(display.velocityMph ?? 0, velocityDecimals)} mph · ` +
        `${format(display.velocityKph ?? 0, velocityDecimals)} km/h · ` +
        `Mach ${format(display.velocityMach ?? 0, 1)}`;
  const distance =
    display.distanceNm === null
      ? "--"
      : `${format(display.distanceNm, distanceDecimals)} nm · ${format(display.distanceKm ?? 0, distanceDecimals)} km`;
  return (
    <div className={styles.telemetryPanel}>
      <div className={styles.row}>
        <span className={styles.label}>
          Velocity (<span className={cx(styles.frame, styles.velocityFrame)}>{display.frame}</span>
          ):
        </span>
        <span className={cx(styles.value, styles.velocityValue)}>{velocity}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.label}>
          Distance (<span className={cx(styles.frame, styles.distanceFrame)}>{display.frame}</span>
          ):
        </span>
        <span className={cx(styles.value, styles.distanceValue)}>{distance}</span>
      </div>
    </div>
  );
}
