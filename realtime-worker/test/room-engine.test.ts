import { describe, expect, it } from "vitest";

import {
  applyRoomAction,
  createRoomEngineState,
} from "../src/lib/room-engine";

describe("room engine", () => {
  it("applies team switches and computes canStart", () => {
    const initial = createRoomEngineState({
      roomCode: "ABCD",
      capacity: 2,
      hostPlayerId: "host-1",
      members: [
        { playerId: "host-1", nickname: "房主", team: "red" },
        { playerId: "guest-1", nickname: "队友", team: "red" },
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
});
