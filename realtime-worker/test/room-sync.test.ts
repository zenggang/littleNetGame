import { describe, expect, it } from "vitest";

import { createRoomEngineState } from "../src/lib/room-engine";
import { shouldRefreshRoomMembership } from "../src/lib/room-sync";

describe("room-sync", () => {
  it("requests a refresh when the connecting player is missing from the loaded room state", () => {
    const roomState = createRoomEngineState({
      room: {
        code: "ABCD",
        gradeLabel: "小学二年级",
        capacity: 2,
        hostPlayerId: "host-1",
        status: "open",
        activeMatchId: null,
        createdAt: "2026-04-19T08:00:00.000Z",
      },
      members: [
        {
          playerId: "host-1",
          nickname: "房主",
          team: "red",
          joinedAt: "2026-04-19T08:00:00.000Z",
        },
      ],
    });

    expect(
      shouldRefreshRoomMembership(roomState, "ABCD", "guest-1"),
    ).toBe(true);
  });

  it("does not refresh when the player already exists in the coordinator room state", () => {
    const roomState = createRoomEngineState({
      room: {
        code: "ABCD",
        gradeLabel: "小学二年级",
        capacity: 2,
        hostPlayerId: "host-1",
        status: "open",
        activeMatchId: null,
        createdAt: "2026-04-19T08:00:00.000Z",
      },
      members: [
        {
          playerId: "host-1",
          nickname: "房主",
          team: "red",
          joinedAt: "2026-04-19T08:00:00.000Z",
        },
        {
          playerId: "guest-1",
          nickname: "队友",
          team: "blue",
          joinedAt: "2026-04-19T08:00:01.000Z",
        },
      ],
    });

    expect(
      shouldRefreshRoomMembership(roomState, "ABCD", "guest-1"),
    ).toBe(false);
  });

  it("does not refresh when the caller did not provide a player id", () => {
    const roomState = createRoomEngineState({
      room: {
        code: "ABCD",
        gradeLabel: "小学二年级",
        capacity: 2,
        hostPlayerId: "host-1",
        status: "open",
        activeMatchId: null,
        createdAt: "2026-04-19T08:00:00.000Z",
      },
      members: [
        {
          playerId: "host-1",
          nickname: "房主",
          team: "red",
          joinedAt: "2026-04-19T08:00:00.000Z",
        },
        {
          playerId: "guest-1",
          nickname: "队友",
          team: "blue",
          joinedAt: "2026-04-19T08:00:01.000Z",
        },
      ],
    });

    expect(
      shouldRefreshRoomMembership(roomState, "ABCD", ""),
    ).toBe(false);
  });
});
