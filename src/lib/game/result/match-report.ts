import { formatBattleHpValue } from "@/lib/game/presentation";

type TeamName = "red" | "blue";

type MatchReportInput = {
  winner: TeamName;
  winReason: "hp_zero" | "time_up";
  teams: {
    red: { hpCurrent: number };
    blue: { hpCurrent: number };
  };
  totalCorrect: Record<TeamName, number>;
  durationMs: number;
  finalEventLog: Array<{
    type?: string;
    text?: string;
    createdAt?: string;
    team?: TeamName;
    targetTeam?: TeamName;
    damage?: number;
  }>;
};

export function buildMatchReport(input: MatchReportInput) {
  const winningTeam = mapTeam(input.winner);
  const losingTeam = mapTeam(input.winner === "red" ? "blue" : "red");
  const keyHit = resolveKeyHit(input.finalEventLog, input.winner);
  const mvp = resolveMvp(input);

  return {
    headline: `${winningTeam.label}胜利`,
    summary: buildSummary(input, winningTeam.label, losingTeam.label, keyHit),
    winner: winningTeam,
    loser: losingTeam,
    winReason: {
      code: input.winReason,
      label: input.winReason === "hp_zero" ? "击破终局" : "时间裁决",
      text:
        input.winReason === "hp_zero"
          ? `${losingTeam.label}血量归零，${winningTeam.label}提前锁定胜局。`
          : `倒计时归零后，${winningTeam.label}凭剩余血量与答题优势拿下本局。`,
    },
    keyHit,
    mvp,
    stats: {
      redHp: formatBattleHpValue(input.teams.red.hpCurrent),
      blueHp: formatBattleHpValue(input.teams.blue.hpCurrent),
      redCorrect: input.totalCorrect.red,
      blueCorrect: input.totalCorrect.blue,
      durationMs: input.durationMs,
      durationLabel: formatDuration(input.durationMs),
    },
    timeline: input.finalEventLog.slice(0, 5).map((event) => ({
      label: mapEventLabel(event.type),
      text: event.text ?? "战场上发生了一次关键变化。",
      damage: event.damage,
      team: event.team ? mapTeam(event.team) : null,
      targetTeam: event.targetTeam ? mapTeam(event.targetTeam) : null,
      createdAt: event.createdAt ?? "",
    })),
  };
}

function buildSummary(
  input: MatchReportInput,
  winningTeamLabel: string,
  losingTeamLabel: string,
  keyHit: ReturnType<typeof resolveKeyHit>,
) {
  if (input.winReason === "hp_zero") {
    return keyHit
      ? `${winningTeamLabel}用 ${keyHit.damage} 点关键伤害击穿${losingTeamLabel}防线，战斗提前结束。`
      : `${losingTeamLabel}血量归零，${winningTeamLabel}持续压制后完成击破。`;
  }

  return `${winningTeamLabel}守住最后 ${formatDuration(input.durationMs)}，以 ${formatBattleHpValue(input.teams[input.winner].hpCurrent)} 点剩余血量赢下时间裁决。`;
}

function resolveKeyHit(events: MatchReportInput["finalEventLog"], winner: TeamName) {
  // 关键一击只从现有 answer_correct 事件里派生；没有新增协议字段时，以最高伤害优先。
  const hits = events
    .filter((event) => event.type === "answer_correct" && event.team === winner)
    .sort((current, next) => (next.damage ?? 0) - (current.damage ?? 0));
  const event = hits[0] ?? events.find((item) => item.type === "answer_correct");

  if (!event) {
    return null;
  }

  return {
    label: event.team ? `${mapTeam(event.team).label}关键一击` : "关键一击",
    text: event.text ?? "一次答题命中改变了战场走向。",
    damage: event.damage ?? 0,
    createdAt: event.createdAt ?? "",
  };
}

function resolveMvp(input: MatchReportInput) {
  // MVP 在当前阶段不是玩家级数据，只能按现有团队答对数和胜方兜底派生为“队伍核心”。
  const leadingTeam =
    input.totalCorrect.red === input.totalCorrect.blue
      ? input.winner
      : input.totalCorrect.red > input.totalCorrect.blue
        ? "red"
        : "blue";

  return {
    team: mapTeam(leadingTeam),
    label: `${mapTeam(leadingTeam).label}攻势核心`,
    text:
      leadingTeam === input.winner
        ? `全队答对 ${input.totalCorrect[leadingTeam]} 题，是本局胜势来源。`
        : `全队答对 ${input.totalCorrect[leadingTeam]} 题，虽未获胜但打出了最高火力。`,
    correct: input.totalCorrect[leadingTeam],
  };
}

function mapTeam(team: TeamName) {
  return {
    id: team,
    label: team === "red" ? "红队" : "蓝队",
    tone: team,
  };
}

function formatDuration(durationMs: number) {
  const seconds = Math.max(0, Math.round(durationMs / 1_000));
  const minutes = Math.floor(seconds / 60);
  const restSeconds = seconds % 60;

  if (minutes === 0) {
    return `${restSeconds} 秒`;
  }

  return `${minutes} 分 ${restSeconds.toString().padStart(2, "0")} 秒`;
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
