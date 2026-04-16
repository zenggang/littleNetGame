import { describe, expect, it } from "vitest";

import {
  signCoordinatorTicket,
  verifyCoordinatorTicket,
} from "@/lib/server/coordinator-ticket";

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
