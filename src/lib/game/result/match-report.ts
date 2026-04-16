export function buildMatchReport(input: {
  winner: "red" | "blue";
  winReason: "hp_zero" | "time_up";
  teams: {
    red: { hpCurrent: number };
    blue: { hpCurrent: number };
  };
  totalCorrect: { red: number; blue: number };
  durationMs: number;
  finalEventLog: Array<{
    type?: string;
    text?: string;
    createdAt?: string;
    damage?: number;
  }>;
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
    timeline: input.finalEventLog.slice(0, 5).map((event) => ({
      label: mapEventLabel(event.type),
      text: event.text ?? "战场上发生了一次关键变化。",
      damage: event.damage,
      createdAt: event.createdAt ?? "",
    })),
  };
}

function mapEventLabel(type?: string) {
  switch (type) {
    case "match_finished":
      return "胜负揭晓";
    case "answer_correct":
      return "关键命中";
    case "question_timeout":
      return "题目超时";
    case "hp_changed":
      return "血量变化";
    case "answer_wrong":
      return "抢答失误";
    case "question_spawned":
      return "新题登场";
    default:
      return "战场事件";
  }
}
