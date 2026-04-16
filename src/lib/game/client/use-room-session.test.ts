import { describe, expect, it, vi } from "vitest";

import { createRoomSocketFactory } from "@/lib/game/client/use-room-session";

describe("createRoomSocketFactory", () => {
  it("forwards room session input to the room socket opener", async () => {
    const openSocket = vi.fn(
      async () => ({ close: vi.fn() }) as unknown as WebSocket,
    );
    const factory = createRoomSocketFactory(openSocket);

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
