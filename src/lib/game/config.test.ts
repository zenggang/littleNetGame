import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canStartMatch,
  detectMatchMode,
  getBalanceConfig,
  resolveTeamCounts,
} from "@/lib/game/config";

describe("game config", () => {
  it("detects supported modes from room teams", () => {
    assert.equal(detectMatchMode({ red: 1, blue: 1 }), "1v1");
    assert.equal(detectMatchMode({ red: 1, blue: 2 }), "1v2");
    assert.equal(detectMatchMode({ red: 1, blue: 3 }), "1v3");
    assert.equal(detectMatchMode({ red: 2, blue: 2 }), "2v2");
    assert.equal(detectMatchMode({ red: 3, blue: 3 }), "3v3");
  });

  it("rejects unsupported team splits", () => {
    assert.equal(detectMatchMode({ red: 0, blue: 2 }), null);
    assert.equal(detectMatchMode({ red: 2, blue: 3 }), null);
    assert.equal(
      canStartMatch({ capacity: 4, teams: { red: 4, blue: 0 } }),
      false,
    );
  });

  it("returns the configured balance values", () => {
    assert.deepEqual(getBalanceConfig("1v1"), {
      red: { hp: 100, damageMultiplier: 1 },
      blue: { hp: 100, damageMultiplier: 1 },
    });

    assert.deepEqual(getBalanceConfig("1v3"), {
      red: { hp: 140, damageMultiplier: 1.8 },
      blue: { hp: 100, damageMultiplier: 1 },
    });
  });

  it("normalizes a team view for room display", () => {
    assert.deepEqual(resolveTeamCounts(["red", "blue", "red"]), {
      red: 2,
      blue: 1,
    });
  });
});
