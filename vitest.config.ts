import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  test: {
    include: ["tests/unit/**/*.{test,spec}.ts"],
    environment: "node",
    globals: false,
    reporters: "default",
  },
});
