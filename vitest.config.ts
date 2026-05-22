import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: ["apps/web/**", "node_modules/**", "**/dist/**"],
    coverage: {
      provider: "v8",
      all: true,
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/__tests__/**",
        "packages/*/src/index.ts",
        "**/*.d.ts",
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
