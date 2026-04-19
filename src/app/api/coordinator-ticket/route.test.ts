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

import { POST } from "@/app/api/coordinator-ticket/route";

describe("/api/coordinator-ticket", () => {
  beforeEach(() => {
    readCoordinatorEnv.mockReset();
    signCoordinatorTicket.mockReset();
  });

  it("returns a signed ticket when coordinator env is ready", async () => {
    readCoordinatorEnv.mockReturnValue({
      baseUrl: "https://coordinator.example.com",
      sharedSecret: "super-secret-value",
    });
    signCoordinatorTicket.mockResolvedValue("signed-ticket");

    const response = await POST(
      new Request("http://localhost/api/coordinator-ticket", {
        method: "POST",
        body: JSON.stringify({
          playerId: "player-1",
          nickname: "阿杰",
          roomCode: "ABCD",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      token: "signed-ticket",
      url: "https://coordinator.example.com/room/ABCD/connect",
    });
  });

  it("returns a structured not-ready error when coordinator env is missing", async () => {
    readCoordinatorEnv.mockImplementation(() => {
      throw new Error("Missing COORDINATOR_BASE_URL");
    });

    const response = await POST(
      new Request("http://localhost/api/coordinator-ticket", {
        method: "POST",
        body: JSON.stringify({
          playerId: "player-1",
          nickname: "阿杰",
          roomCode: "ABCD",
        }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "COORDINATOR_NOT_READY",
    });
  });
});
