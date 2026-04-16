import { canStartMatch, resolveTeamCounts } from "../../../src/lib/game/config";
import type { TeamName } from "../../../src/lib/game/types";

type Member = {
  playerId: string;
  nickname: string;
  team: TeamName;
};

type RoomEngineState = {
  roomCode: string;
  capacity: 2 | 3 | 4 | 6;
  hostPlayerId: string;
  members: Member[];
  canStart: boolean;
};

export function createRoomEngineState(
  input: Omit<RoomEngineState, "canStart">,
): RoomEngineState {
  return {
    ...input,
    canStart: canStartMatch({
      capacity: input.capacity,
      teams: resolveTeamCounts(input.members.map((member) => member.team)),
    }),
  };
}

export function applyRoomAction(
  state: RoomEngineState,
  action: { type: "switch_team"; playerId: string; team: TeamName },
) {
  const members = state.members.map((member) =>
    member.playerId === action.playerId
      ? { ...member, team: action.team }
      : member,
  );

  return createRoomEngineState({
    ...state,
    members,
  });
}
