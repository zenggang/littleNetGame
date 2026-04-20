import {
  shouldBridgeCoordinatorBaseUrl,
} from "@/lib/server/coordinator-public-url";

const isVitestRuntime = Boolean(process.env.VITEST);

if (isVitestRuntime) {
  const { describe, expect, it } = await import("vitest");

  describe("shouldBridgeCoordinatorBaseUrl", () => {
    it("keeps direct websocket mode for normal public domains", () => {
      expect(
        shouldBridgeCoordinatorBaseUrl("https://coordinator.example.com"),
      ).toBe(false);
    });

    it("switches workers.dev coordinators into bridge mode", () => {
      expect(
        shouldBridgeCoordinatorBaseUrl(
          "https://little-net-game-coordinator.javababy.workers.dev/",
        ),
      ).toBe(true);
    });
  });
} else {
  const { describe, it } = await import("node:test");
  const assert = await import("node:assert/strict");

  describe("shouldBridgeCoordinatorBaseUrl", () => {
    it("keeps direct websocket mode for normal public domains", () => {
      assert.equal(
        shouldBridgeCoordinatorBaseUrl("https://coordinator.example.com"),
        false,
      );
    });

    it("switches workers.dev coordinators into bridge mode", () => {
      assert.equal(
        shouldBridgeCoordinatorBaseUrl(
          "https://little-net-game-coordinator.javababy.workers.dev/",
        ),
        true,
      );
    });
  });
}
