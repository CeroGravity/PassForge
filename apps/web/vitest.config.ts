import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@passforge/core": resolve(__dirname, "../../packages/core/src/index.ts"),
    },
  },
  test: {
    root: resolve(__dirname),
    environment: "jsdom",
    globals: true,
    include: ["src/__tests__/**/*.test.{ts,tsx}"],
    setupFiles: ["src/__tests__/setup.ts"],
  },
});
