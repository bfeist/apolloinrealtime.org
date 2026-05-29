import { defineConfig, type Plugin } from "vite";
import { resolve } from "node:path";
import { existsSync, readFileSync } from "node:fs";

/**
 * URL strategy
 * ------------
 *  /                      \u2192 landing/index.html (placeholder)
 *  /11/  /13/  /17/       \u2192 the new typed app (this is the work-in-progress).
 *                            HTML lives at {N}/index.html, ESM at
 *                            src/app/missionApp.ts, assets under public/{N}/.
 *  /legacy/{N}/           \u2192 byte-for-byte lifted legacy mission, served from
 *                            legacy-oracle/{N}/index.html for side-by-side
 *                            comparison. Dev-only \u2014 not in the production build.
 *  /dev/                  \u2192 raw per-module smoke harness (src/dev/harness.ts).
 *                            Dev-only \u2014 not in the production build.
 *
 * All shared assets (CSVs, photos, MOCRviz audio data, vendored paper.js)
 * live under public/{N}/ and are reachable from both the new app and the
 * legacy oracle.
 */

/**
 * If a path looks like a directory (no extension, no trailing slash), append
 * one so Vite resolves the index.html inside. Handles /11, /13, /17, /dev,
 * /legacy, /legacy/13, etc. without per-route config.
 */
const trailingSlashRedirect = (): Plugin => ({
  name: "trailing-slash-redirect",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url ?? "";
      if (url !== "/" && !url.endsWith("/") && !url.includes("?") && !/\.[^/]+$/.test(url)) {
        req.url = url + "/";
      }
      next();
    });
  },
});

/**
 * Dev-only: serve /legacy/{11,13,17}/ from legacy-oracle/{N}/index.html as
 * a read-only byte-for-byte oracle. The oracle's <script src="..."> tags
 * reference relative paths (e.g. "lib/jquery-2.1.4.js", "index.js") that
 * resolve against the URL prefix \u2014 we rewrite those requests to look under
 * public/{N}/ so the same asset tree serves both the new app and the
 * oracle. The oracle is never copied into the production build.
 */
const legacyOraclePlugin = (): Plugin => ({
  name: "legacy-oracle",
  configureServer(server) {
    const oracleHtml = (mission: string): string | null => {
      const path = resolve("legacy-oracle", mission, "index.html");
      return existsSync(path) ? readFileSync(path, "utf8") : null;
    };
    server.middlewares.use((req, res, next) => {
      const url = req.url ?? "";
      const m = /^\/legacy\/(11|13|17)\/(.*)$/.exec(url);
      if (!m) return next();
      const [, mission, rest] = m;
      // bare /legacy/{N}/ \u2192 serve the oracle HTML
      if (rest === "" || rest === "index.html") {
        const html = oracleHtml(mission!);
        if (!html) return next();
        res.setHeader("content-type", "text/html; charset=utf-8");
        res.end(html);
        return;
      }
      // /legacy/{N}/<asset> \u2192 rewrite to /{N}/<asset> so Vite serves it
      // from public/{N}/
      req.url = `/${mission}/${rest}`;
      next();
    });
  },
});

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
  plugins: [trailingSlashRedirect(), legacyOraclePlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        landing: resolve(__dirname, "index.html"),
        a11: resolve(__dirname, "11/index.html"),
        a13: resolve(__dirname, "13/index.html"),
        a17: resolve(__dirname, "17/index.html"),
      },
    },
  },
});
