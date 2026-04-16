import { describe, expect, it } from "vitest";

import { createMatchEngine, submitAnswer } from "../src/lib/match-engine";

describe("match engine", () => {
  it("locks the first correct answer and emits the hp update", () => {
    const engine = createMatchEngine({
      mode: "1v1",
      roomCode: "ABCD",
      players: [
        { playerId: "red-1", team: "red" },
        { playerId: "blue-1", team: "blue" },
      ],
    });

    const result = submitAnswer(engine, {
      playerId: "red-1",
      answer: { value: "42" },
      evaluatorId: "math-single-number",
      correctAnswer: { value: 42 },
      damage: 10,
    });

    expect(result.events[0]?.type).toBe("match.answer_resolved");
    expect(result.state.teams.blue.hpCurrent).toBe(90);
  });
});
