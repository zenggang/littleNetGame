import { readCoordinatorEnv } from "@/lib/server/coordinator-env";

// This file is executed by both Vitest and the legacy tsx test runner.
// Vitest uses its own matcher API, while the legacy runner falls back to Node's
// built-in test/assert modules so the old `src/lib/**/*.test.ts` sweep remains intact.
const isVitestRuntime = Boolean(process.env.VITEST);

if (isVitestRuntime) {
  const { describe, expect, it } = await import("vitest");

  describe("readCoordinatorEnv", () => {
    it("returns the private coordinator configuration", () => {
      const env = readCoordinatorEnv({
        COORDINATOR_BASE_URL: "https://coordinator.example.com",
        COORDINATOR_SHARED_SECRET: "super-secret-value",
      });

      expect(env.baseUrl).toBe("https://coordinator.example.com");
      expect(env.sharedSecret).toBe("super-secret-value");
    });

    it("throws when a required value is missing", () => {
      expect(() =>
        readCoordinatorEnv({
          COORDINATOR_BASE_URL: "https://coordinator.example.com",
        }),
      ).toThrow("Missing COORDINATOR_SHARED_SECRET");
    });
  });
} else {
  const { describe, it } = await import("node:test");
  const assert = await import("node:assert/strict");

  describe("readCoordinatorEnv", () => {
    it("returns the private coordinator configuration", () => {
      const env = readCoordinatorEnv({
        COORDINATOR_BASE_URL: "https://coordinator.example.com",
        COORDINATOR_SHARED_SECRET: "super-secret-value",
      });

      assert.equal(env.baseUrl, "https://coordinator.example.com");
      assert.equal(env.sharedSecret, "super-secret-value");
    });

    it("throws when a required value is missing", () => {
      assert.throws(
        () =>
          readCoordinatorEnv({
            COORDINATOR_BASE_URL: "https://coordinator.example.com",
          }),
        /Missing COORDINATOR_SHARED_SECRET/,
      );
    });
  });
}
