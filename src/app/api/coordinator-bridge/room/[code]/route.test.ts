import { beforeEach, describe, expect, it, vi } from "vitest";

const { readCoordinatorEnv, signCoordinatorTicket } = vi.hoisted(() => ({
  readCoordinatorEnv: vi.fn(),
  signCoordinatorTicket: vi.fn(),
}));

vi.mock("@/lib/server/coordinator-env", () => ({
  readCoordinatorEnv,
}));

vi.mock("@/lib/server/coordinator-ticket", () => ({
  signCoordinatorTicket,
}));

import { POST } from "@/app/api/coordinator-bridge/room/[code]/route";

describe("/api/coordinator-bridge/room/[code]", () => {
  beforeEach(() => {
    readCoordinatorEnv.mockReset();
    signCoordinatorTicket.mockReset();
    vi.restoreAllMocks();
  });

  it("forwards bridge requests to the coordinator with a freshly signed token", async () => {
    readCoordinatorEnv.mockReturnValue({
      baseUrl: "https://coordinator.example.com",
      sharedSecret: "super-secret-value",
    });
    signCoordinatorTicket.mockResolvedValue("signed-ticket");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          roomSnapshot: null,
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

    const response = await POST(
      new Request("https://math.pigou.top/api/coordinator-bridge/room/ABCD", {
        method: "POST",
        body: JSON.stringify({
          playerId: "player-1",
          nickname: "阿杰",
          view: "room",
        }),
      }),
      {
        params: Promise.resolve({
          code: "ABCD",
        }),
      },
    );

    expect(fetch).toHaveBeenCalledWith(
      new URL("https://coordinator.example.com/room/ABCD/bridge?token=signed-ticket"),
      expect.objectContaining({
        method: "POST",
      }),
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      roomSnapshot: null,
      matchSnapshot: null,
      result: {
        ok: true,
        message: "已同步",
      },
    });
  });
});
