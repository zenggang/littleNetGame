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
});
