import { describe, expect, it } from "vitest";

import {
  addRoomMember,
  applyRoomAction,
  createRoomEngineState,
} from "../src/lib/room-engine";

describe("room engine", () => {
  it("applies team switches and computes canStart", () => {
    const initial = createRoomEngineState({
      room: {
        code: "ABCD",
        gradeLabel: "小学二年级",
        capacity: 2,
        hostPlayerId: "host-1",
        status: "open",
        activeMatchId: null,
        createdAt: "2026-04-16T10:00:00.000Z",
      },
      members: [
        {
          playerId: "host-1",
          nickname: "房主",
          team: "red",
          joinedAt: "2026-04-16T10:00:00.000Z",
        },
        {
          playerId: "guest-1",
          nickname: "队友",
          team: "red",
          joinedAt: "2026-04-16T10:00:01.000Z",
        },
      ],
    });

    const next = applyRoomAction(initial, {
      type: "switch_team",
      playerId: "guest-1",
      team: "blue",
    });

    expect(next.canStart).toBe(true);
    expect(
      next.members.find((member) => member.playerId === "guest-1")?.team,
    ).toBe("blue");
  });

  it("joins the least populated team and locks the room when a match starts", () => {
    const initial = createRoomEngineState({
      room: {
        code: "ABCD",
        gradeLabel: "小学二年级",
        capacity: 2,
        hostPlayerId: "host-1",
        status: "open",
        activeMatchId: null,
        createdAt: "2026-04-16T10:00:00.000Z",
      },
      members: [
        {
          playerId: "host-1",
          nickname: "房主",
          team: "red",
          joinedAt: "2026-04-16T10:00:00.000Z",
        },
      ],
    });

    const joined = addRoomMember(initial, {
      playerId: "guest-1",
      nickname: "蓝一号",
      joinedAt: "2026-04-16T10:00:01.000Z",
    });
    const locked = applyRoomAction(joined, {
      type: "lock_match",
      matchId: "match-1",
    });

    expect(joined.members.find((member) => member.playerId === "guest-1")?.team).toBe("blue");
    expect(joined.canStart).toBe(true);
    expect(locked.room.status).toBe("locked");
    expect(locked.room.activeMatchId).toBe("match-1");
  });

  it("reopens the room after a finished match", () => {
    const locked = createRoomEngineState({
      room: {
        code: "ABCD",
        gradeLabel: "小学二年级",
        capacity: 2,
        hostPlayerId: "host-1",
        status: "locked",
        activeMatchId: "match-1",
        createdAt: "2026-04-16T10:00:00.000Z",
      },
      members: [
        {
          playerId: "host-1",
          nickname: "房主",
          team: "red",
          joinedAt: "2026-04-16T10:00:00.000Z",
        },
        {
          playerId: "guest-1",
          nickname: "蓝一号",
          team: "blue",
          joinedAt: "2026-04-16T10:00:01.000Z",
        },
      ],
    });

    const reopened = applyRoomAction(locked, {
      type: "reopen_room",
    });

    expect(reopened.room.status).toBe("open");
    expect(reopened.room.activeMatchId).toBeNull();
    expect(reopened.canStart).toBe(true);
  });
});
