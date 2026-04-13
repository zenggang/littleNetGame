import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyQuestionOutcome, createInitialTeams } from "@/lib/game/match";

describe("match resolution", () => {
  it("applies damage to the defending side on a correct answer", () => {
    const teams = createInitialTeams("1v2");
    const outcome = applyQuestionOutcome({
      teams,
      attacker: "red",
      damage: 10,
      wasCorrect: true,
      penaltyDamage: 2,
    });

    assert.equal(outcome.teams.red.hpCurrent, 120);
    assert.equal(outcome.teams.blue.hpCurrent, 85);
    assert.equal(outcome.winner, null);
  });

  it("applies the timeout penalty to both teams", () => {
    const teams = createInitialTeams("2v2");
    const outcome = applyQuestionOutcome({
      teams,
      attacker: null,
      damage: 0,
      wasCorrect: false,
      penaltyDamage: 2,
    });

    assert.equal(outcome.teams.red.hpCurrent, 98);
    assert.equal(outcome.teams.blue.hpCurrent, 98);
  });

  it("declares a winner when a team hp reaches zero", () => {
    const teams = createInitialTeams("1v1");
    const outcome = applyQuestionOutcome({
      teams: {
        ...teams,
        blue: { ...teams.blue, hpCurrent: 6 },
      },
      attacker: "red",
      damage: 6,
      wasCorrect: true,
      penaltyDamage: 2,
    });

    assert.equal(outcome.teams.blue.hpCurrent, 0);
    assert.equal(outcome.winner, "red");
    assert.equal(outcome.reason, "hp_zero");
  });
});
