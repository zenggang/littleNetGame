import { describe, expect, it, vi } from "vitest";

import { createMatchSocketFactory } from "@/lib/game/client/use-match-session";

describe("createMatchSocketFactory", () => {
  it("forwards match session input to the match socket opener", async () => {
    const openSocket = vi.fn(
      async () => ({ close: vi.fn() }) as unknown as WebSocket,
    );
    const factory = createMatchSocketFactory(openSocket);

    await factory({
      roomCode: "ABCD",
      playerId: "player-1",
      nickname: "阿杰",
    });

    expect(openSocket).toHaveBeenCalledWith({
      roomCode: "ABCD",
      playerId: "player-1",
      nickname: "阿杰",
    });
  });
});
