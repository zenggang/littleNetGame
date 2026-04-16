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
          prompt: "27 + 16 = ?",
          inputSchema: "single-number",
          damage: 10,
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
          prompt: "27 + 16 = ?",
          inputSchema: "single-number",
          damage: 10,
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
          prompt: "should not apply",
          inputSchema: "single-number",
          damage: 99,
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
});
