import type { DemoPlayerSession } from "../../../src/lib/demo/store";
import type {
  CoordinatorMatchSnapshot,
  CoordinatorMessage,
  CoordinatorRoomSnapshot,
  RoomEvent,
} from "../../../src/lib/game/protocol/coordinator";
import type { MatchEvent } from "../../../src/lib/game/protocol/events";
import type { MatchEngineState } from "./match-engine";
import type { RoomEngineState } from "./room-engine";

type BuildSnapshotMessagesInput = {
  roomState: RoomEngineState;
  matchState: MatchEngineState | null;
  session: DemoPlayerSession;
};

type CheckpointPolicyInput = {
  lastPersistedAt: number;
  now: number;
  minIntervalMs: number;
  force?: boolean;
};

/**
 * 把显式同步请求统一转换成 snapshot 消息数组。
 * MatchRoom 只负责决定何时需要 snapshot，消息体本身由纯函数组装，
 * 这样可以在不依赖 DO runtime 的前提下验证协议边界。
 */
export function buildSnapshotMessages(
  input: BuildSnapshotMessagesInput,
): CoordinatorMessage[] {
  const roomSnapshot = buildRoomSnapshot(input);
  const messages: CoordinatorMessage[] = [
    {
      type: "room.snapshot",
      payload: roomSnapshot,
    },
  ];

  const matchSnapshot = buildMatchSnapshot(input);

  if (matchSnapshot) {
    messages.push({
      type: "match.snapshot",
      payload: matchSnapshot,
    });
  }

  return messages;
}

export function buildRoomSnapshot(
  input: BuildSnapshotMessagesInput,
): CoordinatorRoomSnapshot {
  const viewer = input.roomState.members.find(
    (member) => member.playerId === input.session.playerId,
  ) ?? null;
  return {
    room: input.roomState.room,
    members: input.roomState.members,
    match: input.matchState,
    viewer,
    canStart: input.roomState.canStart,
    session: input.session,
  };
}

export function buildMatchSnapshot(
  input: BuildSnapshotMessagesInput,
): CoordinatorMatchSnapshot | null {
  if (input.matchState) {
    const viewer = input.roomState.members.find(
      (member) => member.playerId === input.session.playerId,
    ) ?? null;

    return {
      room: input.roomState.room,
      members: input.roomState.members,
      viewer,
      session: input.session,
      match: input.matchState,
    };
  }

  return null;
}

export function buildMatchEventMessages(events: MatchEvent[]): CoordinatorMessage[] {
  return events.map((event) => ({
    type: "match.event",
    payload: event,
  }));
}

export function buildRoomEventMessage(event: RoomEvent): CoordinatorMessage {
  return {
    type: "room.event",
    payload: event,
  };
}

/**
 * 高频实时链路允许跳过过密的 checkpoint，只保留关键节点强制落盘。
 * 这个策略纯粹回答“现在该不该写”。
 */
export function shouldPersistCheckpoint(input: CheckpointPolicyInput) {
  if (input.force) {
    return true;
  }

  return input.now - input.lastPersistedAt >= input.minIntervalMs;
}
