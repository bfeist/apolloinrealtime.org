import { defineConfig } from "vite";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync } from "node:fs";

// Phase 1: A13 is a lifted legacy app whose HTML uses non-module <script src>
// tags — Vite can't bundle those and emits noisy warnings if it tries.
// Instead, exclude it from rollupOptions and copy it to dist/13/ verbatim.
// Its assets (lib/, styles.css, *.js, img/, indexes/, MOCRviz/, favicons/)
// are already in public/13/ and get copied by Vite's publicDir handling.
// Replace with a typed rollup entry in Phase 3 (unified shell).
const copyLegacyHtml = (mission: string) => ({
  name: `copy-legacy-html-${mission}`,
  closeBundle() {
    mkdirSync(`dist/${mission}`, { recursive: true });
    copyFileSync(`${mission}/index.html`, `dist/${mission}/index.html`);
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
  plugins: [copyLegacyHtml("13")],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        landing: resolve(__dirname, "index.html"),
        a11: resolve(__dirname, "11/index.html"),
        a17: resolve(__dirname, "17/index.html"),
      },
    },
  },
});
