import { describe, expect, it } from "vitest";

import {
  buildMatchEventMessages,
  buildSnapshotMessages,
  shouldPersistCheckpoint,
} from "../src/lib/coordinator-messages";

function seedRoom() {
  return {
    room: {
      id: "room-1",
      code: "ABCD",
      gradeLabel: "小学二年级",
      capacity: 2 as const,
      hostPlayerId: "player-1",
      status: "locked" as const,
      activeMatchId: "match-1",
      createdAt: "2026-04-16T10:00:00.000Z",
    },
    members: [
      {
        playerId: "player-1",
        nickname: "阿杰",
        team: "red" as const,
        joinedAt: "2026-04-16T10:00:00.000Z",
      },
      {
        playerId: "player-2",
        nickname: "小蓝",
        team: "blue" as const,
        joinedAt: "2026-04-16T10:00:01.000Z",
      },
    ],
    canStart: false,
  };
}

function seedMatch() {
  return {
    id: "match-1",
    roomCode: "ABCD",
    mode: "1v1" as const,
    phase: "active" as const,
    teams: {
      red: { name: "red" as const, hpMax: 100, hpCurrent: 100, damageMultiplier: 1 },
      blue: { name: "blue" as const, hpMax: 100, hpCurrent: 92, damageMultiplier: 1 },
    },
    totalCorrect: { red: 1, blue: 0 },
    currentQuestion: {
      key: "q-1",
      difficulty: 2 as const,
      type: "addition" as const,
      prompt: "27 + 15 = ?",
      answerKind: "single-number" as const,
      damage: 8,
      correctAnswer: { value: 42 },
      meta: {},
    },
    questionIndex: 1,
    questionDeadlineAt: "2026-04-16T10:00:18.000Z",
    countdownEndsAt: "2026-04-16T10:00:03.000Z",
    endsAt: "2026-04-16T10:01:03.000Z",
    recentPrompts: ["27 + 15 = ?"],
    winner: null,
    winReason: null,
    lastHitTeam: "red" as const,
    cooldowns: {},
    events: [],
    createdAt: "2026-04-16T10:00:00.000Z",
    endedAt: null,
    players: [
      { playerId: "player-1", nickname: "阿杰", team: "red" as const },
      { playerId: "player-2", nickname: "小蓝", team: "blue" as const },
    ],
    protocolSeq: 1,
  };
}

describe("coordinator message helpers", () => {
  it("builds room and match snapshots only when an explicit sync is requested", () => {
    const messages = buildSnapshotMessages({
      roomState: seedRoom(),
      matchState: seedMatch(),
      session: {
        playerId: "player-1",
        nickname: "阿杰",
      },
    });

    expect(messages).toHaveLength(2);
    expect(messages[0]?.type).toBe("room.snapshot");
    expect(messages[1]?.type).toBe("match.snapshot");
  });

  it("maps protocol events to match.event messages without injecting snapshots", () => {
    const messages = buildMatchEventMessages([
      {
        seq: 2,
        type: "match.answer_resolved",
        serverTime: Date.parse("2026-04-16T10:00:04.000Z"),
        payload: {
          attackerTeam: "red",
          targetTeam: "blue",
          damage: 8,
          hp: { red: 100, blue: 84 },
        },
      },
    ]);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toEqual({
      type: "match.event",
      payload: {
        seq: 2,
        type: "match.answer_resolved",
        serverTime: Date.parse("2026-04-16T10:00:04.000Z"),
        payload: {
          attackerTeam: "red",
          targetTeam: "blue",
          damage: 8,
          hp: { red: 100, blue: 84 },
        },
      },
    });
  });

  it("throttles repeated non-forced checkpoints", () => {
    expect(
      shouldPersistCheckpoint({
        lastPersistedAt: 1_000,
        now: 1_100,
        minIntervalMs: 1_000,
      }),
    ).toBe(false);
    expect(
      shouldPersistCheckpoint({
        lastPersistedAt: 1_000,
        now: 2_100,
        minIntervalMs: 1_000,
      }),
    ).toBe(true);
    expect(
      shouldPersistCheckpoint({
        lastPersistedAt: 1_000,
        now: 1_100,
        minIntervalMs: 1_000,
        force: true,
      }),
    ).toBe(true);
  });
});
