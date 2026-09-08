import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import { pageHeadTags } from "./src/app/pageMetadata.js";
import { a11Config } from "./src/missions/11.config.js";
import { a13Config } from "./src/missions/13.config.js";
import { a17Config } from "./src/missions/17.config.js";

const projectRoot = import.meta.dirname;

const missionConfigs = [a11Config, a13Config, a17Config];

function configForPath(path: string | undefined) {
  const missionId = /^\/(11|13|17)(?:\/|$)/.exec(path ?? "")?.[1];
  return missionConfigs.find((config) => config.id === missionId);
}

/** Development requests receive route metadata; React updates it during client navigation. */
const pageMetadata = (): Plugin => ({
  name: "page-metadata",
  transformIndexHtml(_html, context) {
    const mission = configForPath(context.originalUrl ?? context.path);
    return pageHeadTags(mission);
  },
});

/**
 * URL strategy
 * ------------
 *  /                 -> landing page
 *  /11/ /13/ /17/    -> shared typed mission application
 *
 * Shared CSVs, photos, MOCRviz data/images, and vendored paper.js live under
 * public/{N}/. Original website source remains in the adjacent repositories.
 */

/** Append a slash to supported directory routes so Vite resolves index.html. */
const trailingSlashRedirect = (): Plugin => ({
  name: "trailing-slash-redirect",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const url = req.url ?? "";
      // Rewriting development endpoints such as /@vite/client would bypass
      // Vite's client transform and break dynamic CSS imports.
      const match = /^(\/(?:11|13|17))(\?.*)?$/.exec(url);
      if (match) req.url = `${match[1]}/${match[2] ?? ""}`;
      next();
    });
  },
});

export default defineConfig({
  root: ".",
  publicDir: "public",
  resolve: {
    alias: {
      "@": resolve(projectRoot, "src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [react(), trailingSlashRedirect(), pageMetadata()],
  build: {
    outDir: ".local/dist",
    emptyOutDir: true,
  },
});
