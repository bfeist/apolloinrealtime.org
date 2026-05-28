// Flat config — typescript-eslint strictTypeChecked, per docs-plan/05.
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

// tseslint.config() is flagged as @deprecated by typescript-eslint's own
// no-deprecated rule now that eslint.config.js is type-checked, but ESLint 10
// doesn't export defineConfig as an ESM named binding yet. Suppress here;
// revisit when ESLint ships a proper ESM export for defineConfig.
// eslint-disable-next-line @typescript-eslint/no-deprecated
export default tseslint.config(
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "legacy/**",
      "legacy-src/**",
      "public/**",
      "pipeline/**",
      "tests/visual/**/*-snapshots/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["eslint.config.js", "scripts/*.mjs"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-unnecessary-condition": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  prettier,
);
