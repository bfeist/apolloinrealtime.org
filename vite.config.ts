import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

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
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  plugins: [react(), trailingSlashRedirect()],
  build: {
    outDir: ".local/dist",
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
