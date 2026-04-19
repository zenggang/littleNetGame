import { describe, expect, it } from "vitest";

import { createSequenceRandom } from "../../src/lib/game/questions";
import {
  COUNTDOWN_MS,
  MATCH_DURATION_MS,
  QUESTION_DURATION_MS,
  createMatchEngine,
  submitAnswer,
  tickMatch,
} from "../src/lib/match-engine";

describe("match engine", () => {
  it("keeps question rounds long enough for manual production playtests", () => {
    expect(QUESTION_DURATION_MS).toBeGreaterThanOrEqual(60_000);
  });

  it("opens the first question after countdown and resolves the first correct answer", () => {
    const engine = createMatchEngine({
      mode: "1v1",
      roomCode: "ABCD",
      players: [
        { playerId: "red-1", team: "red" },
        { playerId: "blue-1", team: "blue" },
      ],
      now: Date.parse("2026-04-16T10:00:00.000Z"),
      random: createSequenceRandom([0.3, 0.1, 0.2126, 0.0795]),
    });
    const activated = tickMatch(
      engine,
      Date.parse("2026-04-16T10:00:00.000Z") + COUNTDOWN_MS,
      createSequenceRandom([0.2, 0.4, 0.5, 0.7]),
    );

    const result = submitAnswer(activated.state, {
      playerId: "red-1",
      answer: { value: "42" },
      now: Date.parse("2026-04-16T10:00:04.000Z"),
      random: createSequenceRandom([0.1, 0.3, 0.6, 0.2]),
    });

    expect(activated.events[0]?.type).toBe("match.question_opened");
    expect(result.events[0]?.type).toBe("match.answer_resolved");
    expect(result.state.phase).toBe("active");
    expect(result.state.teams.blue.hpCurrent).toBe(92);
    expect(result.state.questionIndex).toBe(2);
    expect(result.result.message).toBe("答对了，继续下一题");
  });

  it("applies wrong-answer cooldowns and blocks repeated guesses inside the cooldown window", () => {
    const engine = createMatchEngine({
      mode: "1v1",
      roomCode: "ABCD",
      players: [
        { playerId: "red-1", team: "red" },
        { playerId: "blue-1", team: "blue" },
      ],
      now: Date.parse("2026-04-16T10:00:00.000Z"),
      random: createSequenceRandom([0.3, 0.1, 0.2126, 0.0795]),
    });
    const activated = tickMatch(
      engine,
      Date.parse("2026-04-16T10:00:00.000Z") + COUNTDOWN_MS,
      createSequenceRandom([0.2, 0.4, 0.5, 0.7]),
    );

    const wrong = submitAnswer(activated.state, {
      playerId: "red-1",
      answer: { value: "0" },
      now: Date.parse("2026-04-16T10:00:04.000Z"),
      random: createSequenceRandom([0.1, 0.3, 0.6, 0.2]),
    });

    const blocked = submitAnswer(wrong.state, {
      playerId: "red-1",
      answer: { value: "42" },
      now: Date.parse("2026-04-16T10:00:04.500Z"),
      random: createSequenceRandom([0.1, 0.3, 0.6, 0.2]),
    });

    expect(wrong.result.ok).toBe(false);
    expect(wrong.result.message).toBe("不对，再想一想");
    expect(blocked.result.message).toBe("答错了，冷静 1 秒再来");
    expect(wrong.state.cooldowns["red-1"]).toBeGreaterThan(
      Date.parse("2026-04-16T10:00:04.000Z"),
    );
  });

  it("applies timeout damage to both teams and finishes on time-up", () => {
    const engine = createMatchEngine({
      mode: "1v1",
      roomCode: "ABCD",
      players: [
        { playerId: "red-1", team: "red" },
        { playerId: "blue-1", team: "blue" },
      ],
      now: Date.parse("2026-04-16T10:00:00.000Z"),
      random: createSequenceRandom([0.3, 0.1, 0.2126, 0.0795]),
    });
    const activated = tickMatch(
      engine,
      Date.parse("2026-04-16T10:00:00.000Z") + COUNTDOWN_MS,
      createSequenceRandom([0.2, 0.4, 0.5, 0.7]),
    );

    const timedOut = tickMatch(
      activated.state,
      Date.parse("2026-04-16T10:00:00.000Z") + COUNTDOWN_MS + QUESTION_DURATION_MS,
      createSequenceRandom([0.15, 0.25, 0.35, 0.45]),
    );

    const finished = tickMatch(
      timedOut.state,
      Date.parse("2026-04-16T10:00:00.000Z") + COUNTDOWN_MS + MATCH_DURATION_MS,
      createSequenceRandom([0.15, 0.25, 0.35, 0.45]),
    );

    expect(timedOut.events[0]?.type).toBe("match.question_timed_out");
    expect(timedOut.state.teams.red.hpCurrent).toBe(98);
    expect(timedOut.state.teams.blue.hpCurrent).toBe(98);
    expect(finished.events.at(-1)?.type).toBe("match.finished");
    expect(finished.state.phase).toBe("finished");
    expect(finished.state.winReason).toBe("time_up");
  });
});
