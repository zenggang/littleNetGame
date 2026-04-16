import type { DemoMember, DemoRoom } from "../../../src/lib/demo/store";
import { canStartMatch, resolveTeamCounts } from "../../../src/lib/game/config";
import type { TeamName } from "../../../src/lib/game/types";

export type RoomEngineState = {
  room: DemoRoom;
  members: DemoMember[];
  canStart: boolean;
};

type RoomJoinInput = {
  playerId: string;
  nickname: string;
  joinedAt: string;
};

type RoomAction =
  | { type: "switch_team"; playerId: string; team: TeamName }
  | { type: "lock_match"; matchId: string }
  | { type: "reopen_room" };

/**
 * 房间协调层只保留对当前房间真正有用的最小状态：
 * 房间元信息、成员列表，以及基于现状重新推导出来的 canStart。
 * 这样无论状态来自 Supabase 冷启动还是 DO 内存恢复，都能得到一致结果。
 */
export function createRoomEngineState(input: {
  room: DemoRoom;
  members: DemoMember[];
}): RoomEngineState {
  return {
    room: { ...input.room },
    members: [...input.members].sort((left, right) =>
      Date.parse(left.joinedAt) - Date.parse(right.joinedAt)
    ),
    canStart: deriveCanStart(input.room.capacity, input.members),
  };
}

/**
 * 新成员加入时沿用旧实现的分队策略：
 * 总是优先进入当前人数更少的一侧，避免房间层和旧大厅行为分叉。
 * 如果成员已存在，则只更新昵称，不重复插入。
 */
export function addRoomMember(
  state: RoomEngineState,
  input: RoomJoinInput,
): RoomEngineState {
  const existing = state.members.find((member) => member.playerId === input.playerId);

  if (existing) {
    return createRoomEngineState({
      room: state.room,
      members: state.members.map((member) =>
        member.playerId === input.playerId
          ? { ...member, nickname: input.nickname }
          : member
      ),
    });
  }

  const redCount = state.members.filter((member) => member.team === "red").length;
  const blueCount = state.members.filter((member) => member.team === "blue").length;
  const team: TeamName = redCount <= blueCount ? "red" : "blue";

  return createRoomEngineState({
    room: state.room,
    members: [
      ...state.members,
      {
        playerId: input.playerId,
        nickname: input.nickname,
        team,
        joinedAt: input.joinedAt,
      },
    ],
  });
}

/**
 * 房间层只处理房间语义：
 * 切队、进入锁房对战态、以及对局结束后回到可继续编队的开放态。
 * 这样 RoomPage 和 MatchRoom 可以共享同一套规则，不再各自拼装状态。
 */
export function applyRoomAction(
  state: RoomEngineState,
  action: RoomAction,
): RoomEngineState {
  if (action.type === "switch_team") {
    return createRoomEngineState({
      room: state.room,
      members: state.members.map((member) =>
        member.playerId === action.playerId
          ? { ...member, team: action.team }
          : member
      ),
    });
  }

  if (action.type === "lock_match") {
    return createRoomEngineState({
      room: {
        ...state.room,
        status: "locked",
        activeMatchId: action.matchId,
      },
      members: state.members,
    });
  }

  return createRoomEngineState({
    room: {
      ...state.room,
      status: "open",
      activeMatchId: null,
    },
    members: state.members,
  });
}

function deriveCanStart(
  capacity: DemoRoom["capacity"],
  members: DemoMember[],
): boolean {
  return canStartMatch({
    capacity,
    teams: resolveTeamCounts(members.map((member) => member.team)),
  });
}
