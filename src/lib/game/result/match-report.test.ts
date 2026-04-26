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
      finalEventLog: [],
    });

    expect(report.headline).toBe("红队胜利");
    expect(report.summary).toContain("血量归零");
    expect(report.stats.redHp).toBe(896);
    expect(report.stats.redCorrect).toBe(6);
    expect(report.winReason.label).toBe("击破终局");
    expect(report.mvp.label).toBe("红队攻势核心");
  });

  it("extracts a compact battle timeline from the final event log", () => {
    const report = buildMatchReport({
      winner: "blue",
      winReason: "time_up",
      teams: {
        red: { hpCurrent: 14 },
        blue: { hpCurrent: 28 },
      },
      totalCorrect: { red: 5, blue: 7 },
      durationMs: 63_000,
      finalEventLog: [
        {
          id: "evt-1",
          type: "match_finished",
          text: "蓝队获胜！",
          createdAt: "2026-04-16T10:01:03.000Z",
          team: "blue",
        },
        {
          id: "evt-2",
          type: "answer_correct",
          text: "小蓝抢先答对了，蓝队发起进攻！",
          createdAt: "2026-04-16T10:00:54.000Z",
          team: "blue",
          targetTeam: "red",
          damage: 8,
        },
        {
          id: "evt-3",
          type: "question_timeout",
          text: "这题没人答对，双方都掉了 2 点血。",
          createdAt: "2026-04-16T10:00:46.000Z",
        },
      ],
    });

    expect(report.timeline).toHaveLength(3);
    expect(report.stats.blueHp).toBe(784);
    expect(report.timeline[0]).toEqual(
      expect.objectContaining({
        label: "胜负揭晓",
        text: "蓝队获胜！",
      }),
    );
    expect(report.timeline[1]).toEqual(
      expect.objectContaining({
        label: "关键命中",
        damage: 8,
      }),
    );
    expect(report.timeline[2]).toEqual(
      expect.objectContaining({
        label: "题目超时",
      }),
    );
  });

  it("derives key hit and MVP from existing report events only", () => {
    const report = buildMatchReport({
      winner: "blue",
      winReason: "hp_zero",
      teams: {
        red: { hpCurrent: 0 },
        blue: { hpCurrent: 18 },
      },
      totalCorrect: { red: 8, blue: 7 },
      durationMs: 58_000,
      finalEventLog: [
        {
          type: "answer_correct",
          text: "蓝队抢先答对了，发起进攻！",
          createdAt: "2026-04-16T10:00:59.000Z",
          team: "blue",
          targetTeam: "red",
          damage: 12,
        },
        {
          type: "answer_correct",
          text: "红队抢先答对了，发起进攻！",
          createdAt: "2026-04-16T10:00:44.000Z",
          team: "red",
          targetTeam: "blue",
          damage: 16,
        },
      ],
    });

    expect(report.keyHit).toEqual(
      expect.objectContaining({
        label: "蓝队关键一击",
        damage: 12,
      }),
    );
    expect(report.mvp).toEqual(
      expect.objectContaining({
        label: "红队攻势核心",
        correct: 8,
      }),
    );
    expect(report.summary).toContain("12 点关键伤害");
  });
});
