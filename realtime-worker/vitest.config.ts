import { defineWorkersConfig } from "@cloudflare/vitest-pool-workers/config";

export default defineWorkersConfig({
  test: {
    include: ["realtime-worker/test/**/*.test.ts"],
    poolOptions: {
      workers: {
        wrangler: {
          configPath: "./realtime-worker/wrangler.jsonc",
        },
      },
    },
  },
});
