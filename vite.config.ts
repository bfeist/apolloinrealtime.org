import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig, normalizePath, type Plugin } from "vite";
import { pageHeadTags } from "./src/app/pageMetadata.js";
import { a11Config } from "./src/missions/11.config.js";
import { a13Config } from "./src/missions/13.config.js";
import { a17Config } from "./src/missions/17.config.js";

const projectRoot = import.meta.dirname;

/** Crawlers receive the same metadata as a browser navigating between routes. */
const pageMetadata = (): Plugin => ({
  name: "page-metadata",
  transformIndexHtml(_html, context) {
    const mission = [a11Config, a13Config, a17Config].find(
      (config) =>
        normalizePath(context.filename) ===
        normalizePath(resolve(projectRoot, config.id, "index.html")),
    );
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
    rollupOptions: {
      input: {
        landing: resolve(projectRoot, "index.html"),
        a11: resolve(projectRoot, "11/index.html"),
        a13: resolve(projectRoot, "13/index.html"),
        a17: resolve(projectRoot, "17/index.html"),
      },
    },
  },
});
