import { beforeEach, describe, expect, it, vi } from "vitest";

import { openCoordinatorSocket } from "@/lib/game/client/coordinator-client";

describe("openCoordinatorSocket", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("opens a websocket with the signed coordinator token", async () => {
    const socket = { readyState: 0 };
    const websocketCtor = vi.fn(() => socket);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          url: "https://coordinator.example.com/room/ABCD/connect",
          token: "signed-ticket",
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    ));
    vi.stubGlobal("WebSocket", websocketCtor);

    const result = await openCoordinatorSocket({
      roomCode: "ABCD",
      playerId: "player-1",
      nickname: "阿杰",
    });

    expect(result).toBe(socket);
    expect(websocketCtor).toHaveBeenCalledWith(
      "wss://coordinator.example.com/room/ABCD/connect?token=signed-ticket",
    );
  });

  it("throws the structured backend error instead of silently continuing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: "COORDINATOR_NOT_READY",
        }),
        {
          status: 503,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    ));

    await expect(
      openCoordinatorSocket({
        roomCode: "ABCD",
        playerId: "player-1",
        nickname: "阿杰",
      }),
    ).rejects.toThrow("COORDINATOR_NOT_READY");
  });
});
