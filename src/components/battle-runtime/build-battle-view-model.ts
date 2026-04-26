import type { CoordinatorMatchSnapshot } from "@/lib/game/protocol/coordinator";
import { formatBattleHp, formatBattleHpValue } from "@/lib/game/presentation";
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
    deckLabel: string;
    prompt: string;
    damage: number;
    damageLabel: string;
    secondsLeft: number;
    secondsLeftLabel: string;
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
  const stageCue = buildStageCue(previousMatch, match);
  const questionCard = match.currentQuestion
    ? {
        key: match.currentQuestion.key,
        deckLabel: buildDeckLabel(match.phase, stageCue),
        prompt: match.currentQuestion.prompt,
        damage: match.currentQuestion.damage,
        damageLabel: `箭矢威力 ${match.currentQuestion.damage}`,
        secondsLeft: Math.max(
          0,
          Math.ceil((effectiveQuestionDeadline - questionTimerAnchor) / 1000),
        ),
        secondsLeftLabel: "",
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
        secondsLeftLabel: buildSecondsLeftLabel(match.phase, questionCard.secondsLeft),
      }
    : null;

  return {
    topBarLabel: `红 ${formatBattleHpValue(match.teams.red.hpCurrent)} / 蓝 ${formatBattleHpValue(match.teams.blue.hpCurrent)}`,
    topBarTimerLabel: match.phase === "finished"
      ? "已结束"
      : `总 ${totalSecondsLeft} 秒`,
    topBarPhaseLabel: buildTopBarPhaseLabel(match.phase, isCoolingDown, controlTone),
    viewerTeamLabel: buildViewerTeamLabel(viewerTeam),
    redHpLabel: formatBattleHp(match.teams.red),
    blueHpLabel: formatBattleHp(match.teams.blue),
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
    return "炮塔预热，等倒计时结束立刻开火";
  }

  if (isCoolingDown) {
    return "装填失误，冷却结束后再抢";
  }

  if (phase === "finished") {
    return "终局裁决完成，战报即将送达";
  }

  if (stageCue?.kind === "timeout") {
    return "弹药过载，双方护盾同时受损";
  }

  if (stageCue?.kind === "wrong-answer") {
    return "装填错误会反噬自己的基地";
  }

  if (secondsLeft <= 2) {
    return "装填窗口快关闭了，立刻开火";
  }

  return "解出答案，把数字箭矢打进对面护盾";
}

function buildQuestionStatus(
  phase: BattleMatch["phase"],
  isCoolingDown: boolean,
  deadlineAt: number,
  now: number,
) {
  if (phase === "countdown") {
    return "炮塔预热";
  }

  if (isCoolingDown) {
    return "装填冷却";
  }

  if (phase === "finished") {
    return "终局裁决";
  }

  if (Math.ceil((deadlineAt - now) / 1000) <= 2) {
    return "最后装填";
  }

  return "弹药待发";
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
      label: stageCue.attackerTeam === "red" ? "红队数字箭矢命中" : "蓝队数字箭矢命中",
      tone: stageCue.attackerTeam === "red" ? "danger" : "ready",
    } as const;
  }

  if (stageCue?.kind === "wrong-answer") {
    return {
      label: stageCue.team === "red" ? "红队装填失误" : "蓝队装填失误",
      tone: "danger",
    } as const;
  }

  if (stageCue?.kind === "timeout") {
    return {
      label: "弹药过载",
      tone: "danger",
    } as const;
  }

  if (stageCue?.kind === "question-opened") {
    return {
      label: "弹药装填完成",
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
    return "弹药过载，双方护盾同时受损。";
  }

  if (stageCue?.kind === "wrong-answer") {
    return "装填失误产生反噬，冷却结束后再抢。";
  }

  if (stageCue?.kind === "hit") {
    return stageCue.attackerTeam === "red"
      ? "红队数字箭矢命中，继续压上去。"
      : "蓝队数字箭矢命中，别让节奏断掉。";
  }

  if (match.phase === "countdown") {
    return "炮塔完成预热，倒计时结束后立刻开火。";
  }

  if (isCoolingDown) {
    return "刚刚装填失误，冷却结束后再抢。";
  }

  if (match.phase === "finished" && match.winner) {
    return match.winner === "red"
      ? "红队拿下这一局，战报马上送达。"
      : "蓝队拿下这一局，战报马上送达。";
  }

  return "保持专注，把这一发数字箭矢装好。";
}

function buildDeckLabel(
  phase: BattleMatch["phase"],
  stageCue: BattleStageCue | null,
) {
  if (phase === "finished") {
    return "本局战报";
  }

  if (stageCue?.kind === "question-opened") {
    return "弹药装填完成";
  }

  return "当前弹药题";
}

function buildSecondsLeftLabel(
  phase: BattleMatch["phase"],
  secondsLeft: number,
) {
  if (phase === "finished") {
    return "战报生成中";
  }

  return `装填窗口 ${secondsLeft}s`;
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
