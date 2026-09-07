import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

const projectRoot = import.meta.dirname;

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(projectRoot, "src"),
    },
  },
  test: {
    include: ["tests/unit/**/*.{test,spec}.ts"],
    environment: "node",
    globals: false,
    reporters: "default",
  },
});
