import { describe, expect, it } from "vitest";

import { reduceMatchEvent } from "@/lib/game/protocol/reducer";
import { createEmptyMatchState } from "@/lib/game/protocol/state";

describe("reduceMatchEvent", () => {
  it("opens a question and resolves an attack in sequence order", () => {
    let state = createEmptyMatchState();

    state = reduceMatchEvent(state, {
      seq: 1,
      type: "match.question_opened",
      serverTime: 1_716_000_000_000,
      payload: {
        question: {
          id: "q-1",
          difficulty: 2,
          type: "addition",
          prompt: "27 + 16 = ?",
          inputSchema: "single-number",
          damage: 10,
          correctAnswer: { value: 43 },
          meta: {},
          deadlineAt: "2026-04-16T10:00:08.000Z",
        },
      },
    });

    state = reduceMatchEvent(state, {
      seq: 2,
      type: "match.answer_resolved",
      serverTime: 1_716_000_000_500,
      payload: {
        attackerTeam: "red",
        targetTeam: "blue",
        damage: 10,
        hp: { red: 100, blue: 90 },
      },
    });

    expect(state.currentQuestion?.id).toBe("q-1");
    expect(state.teams.blue.hpCurrent).toBe(90);
    expect(state.lastSeq).toBe(2);
  });

  it("ignores stale or duplicate events", () => {
    const openedState = reduceMatchEvent(createEmptyMatchState(), {
      seq: 1,
      type: "match.question_opened",
      serverTime: 1_716_000_000_000,
      payload: {
        question: {
          id: "q-1",
          difficulty: 2,
          type: "addition",
          prompt: "27 + 16 = ?",
          inputSchema: "single-number",
          damage: 10,
          correctAnswer: { value: 43 },
          meta: {},
          deadlineAt: "2026-04-16T10:00:08.000Z",
        },
      },
    });

    const resolvedState = reduceMatchEvent(openedState, {
      seq: 2,
      type: "match.answer_resolved",
      serverTime: 1_716_000_000_500,
      payload: {
        attackerTeam: "red",
        targetTeam: "blue",
        damage: 10,
        hp: { red: 100, blue: 90 },
      },
    });

    const duplicateEventState = reduceMatchEvent(resolvedState, {
      seq: 2,
      type: "match.answer_resolved",
      serverTime: 1_716_000_000_750,
      payload: {
        attackerTeam: "blue",
        targetTeam: "red",
        damage: 999,
        hp: { red: 1, blue: 1 },
      },
    });

    const staleEventState = reduceMatchEvent(resolvedState, {
      seq: 1,
      type: "match.question_opened",
      serverTime: 1_716_000_000_750,
      payload: {
        question: {
          id: "q-stale",
          difficulty: 3,
          type: "multiplication",
          prompt: "should not apply",
          inputSchema: "single-number",
          damage: 99,
          correctAnswer: { value: 99 },
          meta: {},
          deadlineAt: "2026-04-16T10:00:09.000Z",
        },
      },
    });

    expect(duplicateEventState).toBe(resolvedState);
    expect(staleEventState).toBe(resolvedState);
    expect(resolvedState.currentQuestion?.id).toBe("q-1");
    expect(resolvedState.teams.blue.hpCurrent).toBe(90);
    expect(resolvedState.lastSeq).toBe(2);
  });

  it("records seq progress for wrong-answer penalty events", () => {
    const openedState = reduceMatchEvent(createEmptyMatchState(), {
      seq: 1,
      type: "match.question_opened",
      serverTime: 1_716_000_000_000,
      payload: {
        question: {
          id: "q-1",
          prompt: "27 + 16 = ?",
          inputSchema: "single-number",
          damage: 10,
          deadlineAt: "2026-04-16T10:00:08.000Z",
          difficulty: 2,
          type: "addition",
          correctAnswer: { value: 43 },
          meta: {},
        },
      },
    });

    const rejectedState = reduceMatchEvent(openedState, {
      seq: 2,
      type: "match.answer_rejected",
      serverTime: 1_716_000_000_500,
      payload: {
        playerId: "red-1",
        team: "red",
        damage: 5,
        cooldownUntil: 1_716_000_001_500,
        hp: { red: 95, blue: 100 },
      },
    });

    expect(rejectedState.teams.red.hpCurrent).toBe(95);
    expect(rejectedState.teams.blue.hpCurrent).toBe(100);
    expect(rejectedState.lastSeq).toBe(2);
  });
});
