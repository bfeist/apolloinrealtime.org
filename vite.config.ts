import { defineConfig, type Plugin } from "vite";
import { resolve } from "node:path";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { a11Config } from "./src/missions/11.config.js";
import { a13Config } from "./src/missions/13.config.js";
import { a17Config } from "./src/missions/17.config.js";
import { renderMissionHead } from "./src/template/head.js";

const MISSION_CONFIGS: Record<MissionId, MissionConfig | null> = {
  "11": a11Config,
  "13": a13Config,
  "17": a17Config,
};

const HEAD_BLOCK = /<head\b[^>]*>[\s\S]*?<\/head>/i;

/** Pure HTML transform: replace <head>…</head> with the generated head. */
function applyHeadInjection(
  html: string,
  config: MissionConfig,
  options: { includeEsmEntry?: boolean } = {},
): string {
  const windowMission = `<script>window.MISSION = ${JSON.stringify(config)};</script>`;
  const generatedHead = `<head>\n${windowMission}\n${renderMissionHead(config, options)}\n</head>`;
  return HEAD_BLOCK.test(html)
    ? html.replace(HEAD_BLOCK, generatedHead)
    : html.replace(/<html[^>]*>/i, (m) => `${m}\n${generatedHead}`);
}

// Phase 1: each lifted mission HTML uses non-module <script src> tags —
// Vite can't bundle those and emits noisy warnings if it tries. Instead,
// keep it out of rollupOptions and copy it to dist/{N}/ verbatim — but apply
// the Phase 3 head injection on the way through, so production matches dev.
const copyLegacyHtml = (mission: MissionId) => ({
  name: `copy-legacy-html-${mission}`,
  closeBundle() {
    const config = MISSION_CONFIGS[mission];
    if (!config) return;
    const src = `${mission}/index.html`;
    const dest = `dist/${mission}/index.html`;
    const transformed = applyHeadInjection(readFileSync(src, "utf8"), config, {
      includeEsmEntry: false,
    });
    mkdirSync(`dist/${mission}`, { recursive: true });
    writeFileSync(dest, transformed);
  },
});

/**
 * For any path that looks like a directory (no dot-extension, no trailing slash),
 * append a trailing slash so Vite resolves the index.html inside it.
 * Handles /dev, /11, /13, /17, etc. without needing per-route entries.
 */
const trailingSlashRedirect = (): Plugin => ({
  name: "trailing-slash-redirect",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url ?? "";
      // Only rewrite if: has no trailing slash, no query string, no file extension
      if (url !== "/" && !url.endsWith("/") && !url.includes("?") && !/\.[^/]+$/.test(url)) {
        req.url = url + "/";
      }
      next();
    });
  },
});

// Phase 3: rebuild each mission's <head> from the shared template
// (src/template/head.ts) using the typed mission config. The first script
// is `window.MISSION = {...}` so the legacy `index.js` `var c*` block reads
// it. The generated head ends with `<script type="module" src="/src/main.ts">`
// — the ESM bootstrap entry. This plugin handles the dev server; the build
// path applies the same transform inside `copyLegacyHtml`.
const injectMissionConfig = (): Plugin => ({
  name: "inject-mission-config",
  transformIndexHtml(html, ctx) {
    const match = /^\/?(\d{2})\/index\.html$/.exec(ctx.path.replace(/^\//, ""));
    if (!match) return;
    const id = match[1] as MissionId;
    const config = MISSION_CONFIGS[id];
    if (!config) return;
    return applyHeadInjection(html, config);
  },
});

// Multi-page setup: one HTML entry per mission + landing.
// During Phase 0 these are empty placeholder shells; Phases 1-3 fill them in.
export default defineConfig({
  root: ".",
  publicDir: "public",
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [
    trailingSlashRedirect(),
    injectMissionConfig(),
    copyLegacyHtml("11"),
    copyLegacyHtml("13"),
    copyLegacyHtml("17"),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        landing: resolve(__dirname, "index.html"),
      },
    },
  },
});
