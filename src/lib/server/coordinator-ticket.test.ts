import {
  signCoordinatorTicket,
  verifyCoordinatorTicket,
} from "@/lib/server/coordinator-ticket";

const isVitestRuntime = Boolean(process.env.VITEST);

if (isVitestRuntime) {
  const { describe, expect, it } = await import("vitest");

  describe("coordinator ticket", () => {
    it("round-trips a signed room ticket", async () => {
      const token = await signCoordinatorTicket(
        {
          playerId: "player-1",
          nickname: "阿杰",
          roomCode: "ABCD",
        },
        "super-secret-value",
      );

      const payload = await verifyCoordinatorTicket(
        token,
        "super-secret-value",
      );

      expect(payload.playerId).toBe("player-1");
      expect(payload.roomCode).toBe("ABCD");
    });
  });
} else {
  const { describe, it } = await import("node:test");
  const assert = await import("node:assert/strict");

  describe("coordinator ticket", () => {
    it("round-trips a signed room ticket", async () => {
      const token = await signCoordinatorTicket(
        {
          playerId: "player-1",
          nickname: "阿杰",
          roomCode: "ABCD",
        },
        "super-secret-value",
      );

      const payload = await verifyCoordinatorTicket(
        token,
        "super-secret-value",
      );

      assert.equal(payload.playerId, "player-1");
      assert.equal(payload.roomCode, "ABCD");
    });
  });
}
