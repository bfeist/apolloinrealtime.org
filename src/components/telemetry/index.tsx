import { computeTelemetryDisplay, type FrameOfReferenceRange } from "./data.js";

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
    <div className="telemetry_panel">
      <div className="row">
        <span className="label">
          Velocity (<span className="frame velocity-frame">{display.frame}</span>):
        </span>
        <span className="value velocity-value">{velocity}</span>
      </div>
      <div className="row">
        <span className="label">
          Distance (<span className="frame distance-frame">{display.frame}</span>):
        </span>
        <span className="value distance-value">{distance}</span>
      </div>
    </div>
  );
}
