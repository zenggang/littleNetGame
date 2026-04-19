import type { CoordinatorMatchSnapshot } from "@/lib/game/protocol/coordinator";
import type { TeamName } from "@/lib/game/types";

type BattleMatch = NonNullable<CoordinatorMatchSnapshot["match"]>;

export type BattleStageCue =
  | {
      id: string;
      kind: "question-opened";
      questionKey: string;
    }
  | {
      id: string;
      kind: "hit";
      attackerTeam: TeamName;
      targetTeam: TeamName;
      damage: number;
    }
  | {
      id: string;
      kind: "wrong-answer";
      team: TeamName;
      damage: number;
    }
  | {
      id: string;
      kind: "timeout";
      redDamage: number;
      blueDamage: number;
    }
  | {
      id: string;
      kind: "finish";
      winner: TeamName;
      reason: "hp_zero" | "time_up";
    };

type BattleControlTone =
  | "ready"
  | "countdown"
  | "cooldown"
  | "danger"
  | "victory"
  | "defeat";

export type BattleViewModel = {
  topBarLabel: string;
  topBarTimerLabel: string;
  topBarPhaseLabel: string;
  viewerTeamLabel: string;
  redHpLabel: string;
  blueHpLabel: string;
  footerMessage: string;
  stageBannerLabel: string;
  stageBannerTone: BattleControlTone;
  controlTone: BattleControlTone;
  stageCue: BattleStageCue | null;
  questionCard: null | {
    key: string;
    prompt: string;
    damage: number;
    secondsLeft: number;
    hint: string;
    statusLabel: string;
    submitLabel: string;
  };
};

type BuildBattleViewModelInput = {
  match: BattleMatch;
  previousMatch: BattleMatch | null;
  viewerTeam: TeamName | null;
  now: number;
  isCoolingDown: boolean;
  feedback: string;
  error: string;
};

/**
 * battle 页需要把“当前对局状态”和“刚刚发生的变化”同时转换成一个稳定的展示模型：
 * - HUD 需要知道当前倒计时、提示语和控制台语气
 * - Phaser 舞台需要一次性 cue，才能播放发箭、超时、结算等演出
 *
 * 这里显式接收 previousMatch，是为了把“静态快照”升级成“可演出的状态差异”，
 * 且不需要回退去改 coordinator 主协议。
 */
export function buildBattleViewModel(
  input: BuildBattleViewModelInput,
): BattleViewModel {
  const {
    match,
    previousMatch,
    viewerTeam,
    now,
    isCoolingDown,
    feedback,
    error,
  } = input;
  const effectiveQuestionDeadline = Math.min(
    Date.parse(match.questionDeadlineAt),
    Date.parse(match.endsAt),
  );
  const questionTimerAnchor =
    match.phase === "countdown"
      ? Math.max(now, Date.parse(match.countdownEndsAt))
      : now;
  const totalSecondsLeft = buildTotalSecondsLeft(match, now);
  const questionCard = match.currentQuestion
    ? {
        key: match.currentQuestion.key,
        prompt: match.currentQuestion.prompt,
        damage: match.currentQuestion.damage,
        secondsLeft: Math.max(
          0,
          Math.ceil((effectiveQuestionDeadline - questionTimerAnchor) / 1000),
        ),
        hint: "",
        statusLabel: buildQuestionStatus(
          match.phase,
          isCoolingDown,
          effectiveQuestionDeadline,
          questionTimerAnchor,
        ),
        submitLabel: buildSubmitLabel(match.phase, isCoolingDown),
      }
    : null;
  const stageCue = buildStageCue(previousMatch, match);
  const controlTone = resolveControlTone({
    match,
    viewerTeam,
    isCoolingDown,
    error,
    questionCardSecondsLeft: questionCard?.secondsLeft ?? 0,
  });
  const stageBanner = buildStageBanner(match, stageCue, viewerTeam, controlTone);
  const nextQuestionCard = questionCard
    ? {
        ...questionCard,
        hint: buildQuestionHint(match.phase, isCoolingDown, stageCue, questionCard.secondsLeft),
      }
    : null;

  return {
    topBarLabel: `红 ${match.teams.red.hpCurrent} / 蓝 ${match.teams.blue.hpCurrent}`,
    topBarTimerLabel: match.phase === "finished"
      ? "已结束"
      : `总 ${totalSecondsLeft} 秒`,
    topBarPhaseLabel: buildTopBarPhaseLabel(match.phase, isCoolingDown, controlTone),
    viewerTeamLabel: buildViewerTeamLabel(viewerTeam),
    redHpLabel: `${match.teams.red.hpCurrent} / ${match.teams.red.hpMax}`,
    blueHpLabel: `${match.teams.blue.hpCurrent} / ${match.teams.blue.hpMax}`,
    footerMessage: buildFooterMessage({
      match,
      stageCue,
      isCoolingDown,
      feedback,
      error,
    }),
    stageBannerLabel: stageBanner.label,
    stageBannerTone: stageBanner.tone,
    controlTone,
    stageCue,
    questionCard: nextQuestionCard,
  };
}

function buildQuestionHint(
  phase: BattleMatch["phase"],
  isCoolingDown: boolean,
  stageCue: BattleStageCue | null,
  secondsLeft: number,
) {
  if (phase === "countdown") {
    return "列阵完成，准备开火";
  }

  if (isCoolingDown) {
    return "失手了，装填中";
  }

  if (phase === "finished") {
    return "这一局已经收束，准备看战报";
  }

  if (stageCue?.kind === "timeout") {
    return "超时会让双方一起掉血";
  }

  if (stageCue?.kind === "wrong-answer") {
    return "答错会让自己掉半伤";
  }

  if (secondsLeft <= 2) {
    return "只剩几秒，立刻开火";
  }

  return "抢在对面前面答出来";
}

function buildQuestionStatus(
  phase: BattleMatch["phase"],
  isCoolingDown: boolean,
  deadlineAt: number,
  now: number,
) {
  if (phase === "countdown") {
    return "列阵倒计时";
  }

  if (isCoolingDown) {
    return "装填冷却";
  }

  if (phase === "finished") {
    return "本局结束";
  }

  if (Math.ceil((deadlineAt - now) / 1000) <= 2) {
    return "最后抢答";
  }

  return "抢答开火";
}

function buildSubmitLabel(
  phase: BattleMatch["phase"],
  isCoolingDown: boolean,
) {
  if (phase === "countdown") {
    return "列阵中";
  }

  if (isCoolingDown) {
    return "装填中";
  }

  if (phase === "finished") {
    return "已结束";
  }

  return "发射箭矢";
}

function buildTopBarPhaseLabel(
  phase: BattleMatch["phase"],
  isCoolingDown: boolean,
  controlTone: BattleControlTone,
) {
  if (phase === "countdown") {
    return "列阵中";
  }

  if (phase === "finished") {
    return controlTone === "victory" ? "胜利收束" : "战局收束";
  }

  if (isCoolingDown) {
    return "装填冷却";
  }

  return "抢答开火";
}

function resolveControlTone(input: {
  match: BattleMatch;
  viewerTeam: TeamName | null;
  isCoolingDown: boolean;
  error: string;
  questionCardSecondsLeft: number;
}): BattleControlTone {
  const { match, viewerTeam, isCoolingDown, error, questionCardSecondsLeft } = input;

  if (match.phase === "finished" && match.winner) {
    return viewerTeam && viewerTeam === match.winner ? "victory" : "defeat";
  }

  if (error) {
    return "danger";
  }

  if (match.phase === "countdown") {
    return "countdown";
  }

  if (isCoolingDown) {
    return "cooldown";
  }

  if (questionCardSecondsLeft <= 2) {
    return "danger";
  }

  return "ready";
}

function buildStageBanner(
  match: BattleMatch,
  stageCue: BattleStageCue | null,
  viewerTeam: TeamName | null,
  controlTone: BattleControlTone,
) {
  if (stageCue?.kind === "hit") {
    return {
      label: stageCue.attackerTeam === "red" ? "红队命中" : "蓝队命中",
      tone: stageCue.attackerTeam === "red" ? "danger" : "ready",
    } as const;
  }

  if (stageCue?.kind === "wrong-answer") {
    return {
      label: stageCue.team === "red" ? "红队失手" : "蓝队失手",
      tone: "danger",
    } as const;
  }

  if (stageCue?.kind === "timeout") {
    return {
      label: "超时惩罚",
      tone: "danger",
    } as const;
  }

  if (stageCue?.kind === "question-opened") {
    return {
      label: "新题装填",
      tone: "ready",
    } as const;
  }

  if (match.phase === "finished" && match.winner) {
    return {
      label: match.winner === "red" ? "红队胜利" : "蓝队胜利",
      tone: viewerTeam && viewerTeam === match.winner ? "victory" : "defeat",
    } as const;
  }

  if (match.phase === "countdown") {
    return {
      label: "列阵准备",
      tone: "countdown",
    } as const;
  }

  return {
    label: controlTone === "danger" ? "战场升温" : "正面交锋",
    tone: controlTone,
  } as const;
}

function buildFooterMessage(input: {
  match: BattleMatch;
  stageCue: BattleStageCue | null;
  isCoolingDown: boolean;
  feedback: string;
  error: string;
}) {
  const { match, stageCue, isCoolingDown, feedback, error } = input;

  if (error) {
    return error;
  }

  if (feedback) {
    return feedback;
  }

  if (stageCue?.kind === "timeout") {
    return "超时了，双方都挨了一下。";
  }

  if (stageCue?.kind === "wrong-answer") {
    return "答错受伤，装填结束后再抢。";
  }

  if (stageCue?.kind === "hit") {
    return stageCue.attackerTeam === "red"
      ? "红队一箭命中，继续压上去。"
      : "蓝队一箭命中，别让节奏断掉。";
  }

  if (match.phase === "countdown") {
    return "列阵完成，倒计时结束后立刻开火。";
  }

  if (isCoolingDown) {
    return "刚刚失手了，装填结束后再抢。";
  }

  if (match.phase === "finished" && match.winner) {
    return match.winner === "red"
      ? "红队拿下这一局，战报马上送达。"
      : "蓝队拿下这一局，战报马上送达。";
  }

  return "保持专注，抢在别人前面答出来。";
}

function buildStageCue(
  previousMatch: BattleMatch | null,
  match: BattleMatch,
): BattleStageCue | null {
  if (!previousMatch) {
    return null;
  }

  if (
    previousMatch.phase !== "finished" &&
    match.phase === "finished" &&
    match.winner
  ) {
    return {
      id: `finish:${match.endedAt ?? match.winner}`,
      kind: "finish",
      winner: match.winner,
      reason: match.winReason ?? "time_up",
    };
  }

  const redDamage = Math.max(
    0,
    previousMatch.teams.red.hpCurrent - match.teams.red.hpCurrent,
  );
  const blueDamage = Math.max(
    0,
    previousMatch.teams.blue.hpCurrent - match.teams.blue.hpCurrent,
  );
  const questionChanged =
    previousMatch.currentQuestion.key !== match.currentQuestion.key;
  const wrongAnswerEvent = match.events.find((event) =>
    event.type === "answer_wrong" &&
    event.team &&
    event.targetTeam === event.team &&
    typeof event.damage === "number"
  );

  if (!questionChanged && wrongAnswerEvent?.team && wrongAnswerEvent.damage) {
    const damage = wrongAnswerEvent.team === "red" ? redDamage : blueDamage;

    if (damage > 0) {
      return {
        id: `wrong:${match.currentQuestion.key}:${wrongAnswerEvent.team}:${damage}:${wrongAnswerEvent.id}`,
        kind: "wrong-answer",
        team: wrongAnswerEvent.team,
        damage,
      };
    }
  }

  if (questionChanged && redDamage > 0 && blueDamage > 0) {
    return {
      id: `timeout:${match.currentQuestion.key}:${redDamage}:${blueDamage}`,
      kind: "timeout",
      redDamage,
      blueDamage,
    };
  }

  if (redDamage > 0 || blueDamage > 0) {
    const targetTeam = redDamage > 0 ? "red" : "blue";
    const damage = targetTeam === "red" ? redDamage : blueDamage;
    const correctAnswerEvent = match.events.find((event) =>
      event.type === "answer_correct" &&
      event.team &&
      event.targetTeam === targetTeam &&
      typeof event.damage === "number"
    );
    const attackerTeam = correctAnswerEvent?.team ?? match.lastHitTeam ?? oppositeTeam(targetTeam);

    return {
      id: correctAnswerEvent
        ? `hit:${match.currentQuestion.key}:${attackerTeam}:${targetTeam}:${damage}:${correctAnswerEvent.id}`
        : `hit:${match.currentQuestion.key}:${attackerTeam}:${targetTeam}:${damage}`,
      kind: "hit",
      attackerTeam,
      targetTeam,
      damage,
    };
  }

  if (questionChanged || (previousMatch.phase !== "active" && match.phase === "active")) {
    return {
      id: `question:${match.currentQuestion.key}`,
      kind: "question-opened",
      questionKey: match.currentQuestion.key,
    };
  }

  return null;
}

function buildViewerTeamLabel(viewerTeam: TeamName | null) {
  if (viewerTeam === "red") {
    return "你是红队";
  }

  if (viewerTeam === "blue") {
    return "你是蓝队";
  }

  return "观战中";
}

function buildTotalSecondsLeft(match: BattleMatch, now: number) {
  const countdownEndsAt = Date.parse(match.countdownEndsAt);
  const endsAt = Date.parse(match.endsAt);

  if (match.phase === "finished") {
    return 0;
  }

  if (now < countdownEndsAt) {
    return Math.max(0, Math.ceil((endsAt - countdownEndsAt) / 1000));
  }

  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

function oppositeTeam(team: TeamName): TeamName {
  return team === "red" ? "blue" : "red";
}
