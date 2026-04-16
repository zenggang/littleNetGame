import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: [
      "src/app/**/*.test.ts",
      "src/app/**/*.test.tsx",
      "src/lib/server/**/*.test.ts",
      "src/lib/game/content/**/*.test.ts",
      "src/lib/game/client/**/*.test.ts",
      "src/lib/game/protocol/**/*.test.ts",
      "src/lib/game/result/**/*.test.ts",
      "src/components/**/*.test.ts",
      "src/components/**/*.test.tsx",
      "realtime-worker/test/**/*.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
