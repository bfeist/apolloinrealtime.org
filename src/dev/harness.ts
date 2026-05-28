/**
 * Browser harness for Phase 4 typed modules.
 *
 * Loaded by `/dev/index.html`. Wires each module to a couple of buttons so
 * Ben can hit it in the browser and verify behavior without needing to
 * touch a live mission page. Intentionally minimal — this is a dev-only
 * scaffold, not production code.
 */

import {
  secondsToTimeStr,
  secondsToTimeId,
  timeStrToSeconds,
  timeIdToSeconds,
} from "../shell/clock.js";
import { loadCsv } from "../data/csvLoader.js";
import { loadYouTubeIframeApi } from "../engines/ytplayer/index.js";

function out(id: string, text: string, cls: "ok" | "err" | "" = ""): void {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = "";
  if (cls) el.classList.add(cls);
}

function getInput(id: string): string {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement ? el.value : "";
}

function isChecked(id: string): boolean {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement && el.checked;
}

// --- clock -----------------------------------------------------------------

document.getElementById("btn-s2t")?.addEventListener("click", () => {
  const raw = Number(getInput("clock-seconds"));
  if (!Number.isFinite(raw)) {
    out("out-clock", `bad input: ${getInput("clock-seconds")}`, "err");
    return;
  }
  const timeStr = secondsToTimeStr(raw);
  const timeId = secondsToTimeId(raw);
  out("out-clock", `seconds: ${String(raw)}\ntimeStr: ${timeStr}\ntimeId:  ${timeId}`, "ok");
});

document.getElementById("btn-t2s")?.addEventListener("click", () => {
  const ts = getInput("clock-timestr");
  const seconds = timeStrToSeconds(ts);
  const fromId = timeIdToSeconds(ts.split(":").join(""));
  out(
    "out-clock",
    `timeStr:                 ${ts}\ntimeStrToSeconds:        ${String(seconds)}\ntimeIdToSeconds(no ':'): ${String(fromId)}`,
    "ok",
  );
});

document.getElementById("btn-clock-roundtrip")?.addEventListener("click", () => {
  const samples = [
    0,
    1,
    59,
    60,
    3600,
    86399,
    100 * 3600 + 23 * 60 + 9,
    195 * 3600 + 18 * 60 + 35,
    -1,
    -60,
    -3600,
    -(5 * 3600 + 23 * 60 + 9),
  ];
  const lines: string[] = [];
  let failed = 0;
  for (const s of samples) {
    const ts = secondsToTimeStr(s);
    const back = timeStrToSeconds(ts);
    const ok = back === s ? "✓" : "✗";
    if (back !== s) failed += 1;
    lines.push(`${ok} ${String(s).padStart(8)}  →  ${ts}  →  ${String(back)}`);
  }
  out(
    "out-clock",
    lines.join("\n") + `\n\n${failed === 0 ? "all round-trips OK" : `${String(failed)} FAILED`}`,
    failed === 0 ? "ok" : "err",
  );
});

// --- csvLoader -------------------------------------------------------------

document.getElementById("btn-csv-load")?.addEventListener("click", () => {
  const url = getInput("csv-url");
  const cacheBust = isChecked("csv-cachebust");
  out("out-csv", `loading ${url}${cacheBust ? "  (cache-busted)" : ""}…`);
  const t0 = performance.now();
  loadCsv(url, { cacheBust })
    .then((rows) => {
      const elapsed = (performance.now() - t0).toFixed(1);
      const preview = rows
        .slice(0, 5)
        .map(
          (r, i) =>
            `[${String(i)}] (${String(r.length)} fields) ${r.map((f) => JSON.stringify(f)).join(" | ")}`,
        )
        .join("\n");
      out(
        "out-csv",
        `OK · ${String(rows.length)} rows · ${elapsed} ms\n\nfirst 5 rows:\n${preview}`,
        "ok",
      );
    })
    .catch((e: unknown) => {
      out("out-csv", `ERR: ${String(e instanceof Error ? e.message : e)}`, "err");
    });
});

// --- ytplayer --------------------------------------------------------------

function reportYt(targetId: string, label: string): void {
  out(targetId, `${label}: requesting…`);
  const t0 = performance.now();
  loadYouTubeIframeApi()
    .then((YT) => {
      const elapsed = (performance.now() - t0).toFixed(1);
      out(
        targetId,
        `${label}: OK · ${elapsed} ms\nYT.Player: ${typeof YT.Player}\nYT.PlayerState.PLAYING = ${String(YT.PlayerState.PLAYING)}`,
        "ok",
      );
    })
    .catch((e: unknown) => {
      out(targetId, `${label}: ERR: ${String(e instanceof Error ? e.message : e)}`, "err");
    });
}

document.getElementById("btn-yt-load")?.addEventListener("click", () => {
  reportYt("out-yt", "first call");
});
document.getElementById("btn-yt-load-2")?.addEventListener("click", () => {
  reportYt("out-yt", "repeat call");
});

console.warn("[dev/harness] ready");
