import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  callCoordinatorBridge,
  openCoordinatorSocket,
} from "@/lib/game/client/coordinator-client";

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

  it("switches to bridge mode when the backend marks the coordinator as non-public", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          url: "https://little-net-game-coordinator.javababy.workers.dev/room/ABCD/connect",
          token: "signed-ticket",
          mode: "bridge",
        }),
        {
          status: 200,
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
    ).rejects.toThrow("COORDINATOR_HTTP_BRIDGE_REQUIRED");
  });
});

describe("callCoordinatorBridge", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the bridged snapshot payload", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          roomSnapshot: {
            room: null,
            members: [],
            match: null,
            viewer: null,
            canStart: false,
            session: {
              playerId: "player-1",
              nickname: "阿杰",
            },
          },
          matchSnapshot: null,
          result: {
            ok: true,
            message: "已同步",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
    ));

    await expect(
      callCoordinatorBridge({
        roomCode: "ABCD",
        playerId: "player-1",
        nickname: "阿杰",
        view: "room",
      }),
    ).resolves.toMatchObject({
      result: {
        ok: true,
        message: "已同步",
      },
    });
  });
});
