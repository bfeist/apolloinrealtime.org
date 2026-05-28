import { defineConfig } from "vite";
import { resolve } from "node:path";

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
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        landing: resolve(__dirname, "index.html"),
        a11: resolve(__dirname, "11/index.html"),
        // a13: Phase 1 lift — index.html lives at project root,
        // its assets live in public/13/ (lib/, styles.css, *.js,
        // img/, indexes/, MOCRviz/, favicons/). Replaced by a typed
        // entry in Phase 3 (unified shell).
        a13: resolve(__dirname, "13/index.html"),
        a17: resolve(__dirname, "17/index.html"),
      },
    },
  },
});
