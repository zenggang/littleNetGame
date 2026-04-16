export function buildMatchReport(input: {
  winner: "red" | "blue";
  winReason: "hp_zero" | "time_up";
  teams: {
    red: { hpCurrent: number };
    blue: { hpCurrent: number };
  };
  totalCorrect: { red: number; blue: number };
  durationMs: number;
}) {
  return {
    headline: input.winner === "red" ? "红队胜利" : "蓝队胜利",
    summary:
      input.winReason === "hp_zero"
        ? "有一方血量归零，战斗提前结束。"
        : "时间结束后，系统按血量结算胜负。",
    stats: {
      redHp: input.teams.red.hpCurrent,
      blueHp: input.teams.blue.hpCurrent,
      redCorrect: input.totalCorrect.red,
      blueCorrect: input.totalCorrect.blue,
      durationMs: input.durationMs,
    },
  };
}
