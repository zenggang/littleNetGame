import { describe, expect, it } from "vitest";

import { buildMatchReport } from "@/lib/game/result/match-report";

describe("buildMatchReport", () => {
  it("maps the finished state into a result-page friendly report", () => {
    const report = buildMatchReport({
      winner: "red",
      winReason: "hp_zero",
      teams: {
        red: { hpCurrent: 32 },
        blue: { hpCurrent: 0 },
      },
      totalCorrect: { red: 6, blue: 4 },
      durationMs: 62_000,
    });

    expect(report.headline).toBe("红队胜利");
    expect(report.summary).toContain("血量归零");
    expect(report.stats.redCorrect).toBe(6);
  });
});
