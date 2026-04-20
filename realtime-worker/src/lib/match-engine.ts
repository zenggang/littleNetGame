import type { DemoMatch, DemoMatchEvent, DemoMember } from "../../../src/lib/demo/store";
import {
  applyQuestionOutcome,
  applyTeamPenalty,
  createInitialTeams,
} from "../../../src/lib/game/match";
import type { MatchEvent } from "../../../src/lib/game/protocol/events";
import { generateQuestion, isAnswerCorrect } from "../../../src/lib/game/questions";
import { resolveTeamCounts } from "../../../src/lib/game/config";
import type { MatchMode, TeamCounts, TeamName } from "../../../src/lib/game/types";

export const COUNTDOWN_MS = 3_000;
export const MATCH_DURATION_MS = 60_000;
export const QUESTION_DURATION_MS = 15_000;
export const WRONG_COOLDOWN_MS = 1_000;
export const TIMEOUT_DAMAGE = 2;

type RandomSource = {
  next: () => number;
};

export type MatchEngineState = DemoMatch & {
  players: Array<{
    playerId: string;
    team: TeamName;
    nickname?: string;
  }>;
  protocolSeq: number;
};

type Player = {
  playerId: string;
  team: TeamName;
};

type SubmitAnswerInput = {
  playerId: string;
  answer: Record<string, string | number | undefined>;
  now: number;
  random: RandomSource;
};

type TickResult = {
  state: MatchEngineState;
  events: MatchEvent[];
};

type SubmitResult = TickResult & {
  result: {
    ok: boolean;
    message: string;
  };
};

/**
 * 对局引擎沿用当前 demo/store 已经验证过的节奏：
 * 倒计时 -> 开题 -> 抢答/超时 -> 下一题/结束。
 * 这里只把它改造成纯函数，让 Durable Object、测试、以及持久化层都能复用同一套规则。
 */
export function createMatchEngine(input: {
  mode: MatchMode;
  roomCode: string;
  players: Array<Player & { nickname?: string }>;
  now: number;
  random: RandomSource;
}): MatchEngineState {
  const question = createRuntimeQuestion([], input.random);
  const advantagedTeam = resolveAdvantagedTeam(
    resolveTeamCounts(input.players.map((player) => player.team)),
  );

  return {
    id: crypto.randomUUID(),
    roomCode: input.roomCode,
    mode: input.mode,
    phase: "countdown",
    teams: createInitialTeams(input.mode, advantagedTeam),
    totalCorrect: { red: 0, blue: 0 },
    currentQuestion: question,
    questionIndex: 1,
    questionDeadlineAt: new Date(
      input.now + COUNTDOWN_MS + QUESTION_DURATION_MS,
    ).toISOString(),
    countdownEndsAt: new Date(input.now + COUNTDOWN_MS).toISOString(),
    endsAt: new Date(input.now + COUNTDOWN_MS + MATCH_DURATION_MS).toISOString(),
    recentPrompts: [question.prompt],
    winner: null,
    winReason: null,
    lastHitTeam: null,
    cooldowns: {},
    events: [
      createLogEvent("match_started", "房主发起了对战倒计时。"),
      createLogEvent("question_spawned", `第 1 题：${question.prompt}`),
    ],
    createdAt: new Date(input.now).toISOString(),
    endedAt: null,
    players: input.players.map((player) => ({ ...player })),
    protocolSeq: 0,
  };
}

/**
 * `tickMatch` 由协调层 alarm 驱动，不再由前端轮询驱动。
 * 每次调用只推进一个明确的边界动作，便于 Durable Object 在需要时循环补齐滞后的状态。
 */
export function tickMatch(
  state: MatchEngineState,
  now: number,
  random: RandomSource,
): TickResult {
  const match = cloneMatch(state);
  const events: MatchEvent[] = [];

  if (match.phase === "finished") {
    return { state: match, events };
  }

  if (now >= Date.parse(match.endsAt)) {
    finishMatch(match, "time_up", now);
    events.push(
      createProtocolEvent(match, "match.finished", {
        winner: match.winner ?? "red",
        reason: "time_up",
      }),
    );
    return { state: match, events };
  }

  if (match.phase === "countdown" && now >= Date.parse(match.countdownEndsAt)) {
    match.phase = "active";
    events.push(
      createProtocolEvent(match, "match.question_opened", {
        question: buildProtocolQuestion(match),
      }),
    );
    return { state: match, events };
  }

  if (match.phase !== "active" || now < Date.parse(match.questionDeadlineAt)) {
    return { state: match, events };
  }

  const outcome = applyQuestionOutcome({
    teams: match.teams,
    attacker: null,
    damage: 0,
    wasCorrect: false,
    penaltyDamage: TIMEOUT_DAMAGE,
  });

  match.teams = outcome.teams;
  match.events.unshift(
    createLogEvent("question_timeout", "这题没人答对，双方都掉了 2 点血。"),
  );
  match.events.unshift(createLogEvent("hp_changed", renderHpText(match.teams)));
  events.push(
    createProtocolEvent(match, "match.question_timed_out", {
      damage: TIMEOUT_DAMAGE,
      hp: {
        red: match.teams.red.hpCurrent,
        blue: match.teams.blue.hpCurrent,
      },
    }),
  );

  if (outcome.winner) {
    match.winner = outcome.winner;
    finishMatch(match, "hp_zero", now);
    events.push(
      createProtocolEvent(match, "match.finished", {
        winner: match.winner ?? outcome.winner,
        reason: "hp_zero",
      }),
    );
    return { state: match, events };
  }

  nextQuestion(match, now, random);
  events.push(
    createProtocolEvent(match, "match.question_opened", {
      question: buildProtocolQuestion(match),
    }),
  );

  return { state: match, events };
}

/**
 * 提交答案只负责单次答题决议；
 * 是否已经到倒计时结束、是否已经超时，先由协调层在调用前或失败时补一次 tick。
 */
export function submitAnswer(
  state: MatchEngineState,
  input: SubmitAnswerInput,
): SubmitResult {
  const match = cloneMatch(state);
  const now = input.now;

  if (match.phase === "countdown") {
    return {
      state: match,
      events: [],
      result: { ok: false, message: "倒计时中，马上开始" },
    };
  }

  if (match.phase === "finished") {
    return {
      state: match,
      events: [],
      result: { ok: false, message: "这局已经结束了" },
    };
  }

  const cooldownUntil = match.cooldowns[input.playerId] ?? 0;
  if (cooldownUntil > now) {
    return {
      state: match,
      events: [],
      result: { ok: false, message: "答错了，冷静 1 秒再来" },
    };
  }

  if (now >= Date.parse(match.questionDeadlineAt)) {
    return {
      state: match,
      events: [],
      result: { ok: false, message: "这题已经超时了" },
    };
  }

  const member = findMember(state, input.playerId);
  if (!member) {
    return {
      state: match,
      events: [],
      result: { ok: false, message: "你还不在这个房间里" },
    };
  }

  if (!isAnswerCorrect(match.currentQuestion, input.answer)) {
    const wrongAnswerDamage = resolveWrongAnswerDamage(match.currentQuestion.damage);
    const outcome = applyTeamPenalty({
      teams: match.teams,
      team: member.team,
      penaltyDamage: wrongAnswerDamage,
    });

    match.teams = outcome.teams;
    match.cooldowns[input.playerId] = now + WRONG_COOLDOWN_MS;
    match.events.unshift(
      createLogEvent(
        "hp_changed",
        renderHpText(match.teams),
        member.team,
        member.team,
        wrongAnswerDamage,
      ),
    );
    match.events.unshift(
      createLogEvent(
        "answer_wrong",
        `${member.nickname} 答错了，${member.team === "red" ? "红队" : "蓝队"}受到 ${wrongAnswerDamage} 点反噬。`,
        member.team,
        member.team,
        wrongAnswerDamage,
      ),
    );

    if (outcome.winner) {
      match.winner = outcome.winner;
      finishMatch(match, "hp_zero", now);

      return {
        state: match,
        events: [
          createProtocolEvent(match, "match.answer_rejected", {
            playerId: input.playerId,
            team: member.team,
            damage: wrongAnswerDamage,
            cooldownUntil: match.cooldowns[input.playerId],
            hp: {
              red: match.teams.red.hpCurrent,
              blue: match.teams.blue.hpCurrent,
            },
          }),
          createProtocolEvent(match, "match.finished", {
            winner: match.winner ?? outcome.winner,
            reason: "hp_zero",
          }),
        ],
        result: { ok: false, message: "答错受伤，本局结束" },
      };
    }

    return {
      state: match,
      events: [
        createProtocolEvent(match, "match.answer_rejected", {
          playerId: input.playerId,
          team: member.team,
          damage: wrongAnswerDamage,
          cooldownUntil: match.cooldowns[input.playerId],
          hp: {
            red: match.teams.red.hpCurrent,
            blue: match.teams.blue.hpCurrent,
          },
        }),
      ],
      result: { ok: false, message: "不对，再想一想" },
    };
  }

  const outcome = applyQuestionOutcome({
    teams: match.teams,
    attacker: member.team,
    damage: match.currentQuestion.damage,
    wasCorrect: true,
    penaltyDamage: TIMEOUT_DAMAGE,
  });
  const targetTeam = member.team === "red" ? "blue" : "red";
  const damageDealt = Math.max(
    0,
    match.teams[targetTeam].hpCurrent - outcome.teams[targetTeam].hpCurrent,
  );

  match.teams = outcome.teams;
  match.totalCorrect[member.team] += 1;
  match.lastHitTeam = member.team;
  match.events.unshift(
    createLogEvent(
      "answer_correct",
      `${member.nickname} 抢先答对了，${member.team === "red" ? "红队" : "蓝队"}发起进攻！`,
      member.team,
      targetTeam,
      damageDealt,
    ),
  );
  match.events.unshift(
    createLogEvent("hp_changed", renderHpText(match.teams), member.team, targetTeam, damageDealt),
  );

  const events: MatchEvent[] = [
    createProtocolEvent(match, "match.answer_resolved", {
      attackerTeam: member.team,
      targetTeam,
      damage: damageDealt,
      hp: {
        red: match.teams.red.hpCurrent,
        blue: match.teams.blue.hpCurrent,
      },
    }),
  ];

  if (outcome.winner) {
    match.winner = outcome.winner;
    finishMatch(match, "hp_zero", now);
    events.push(
      createProtocolEvent(match, "match.finished", {
        winner: match.winner ?? outcome.winner,
        reason: "hp_zero",
      }),
    );

    return {
      state: match,
      events,
      result: { ok: true, message: "命中了，直接拿下这一局！" },
    };
  }

  nextQuestion(match, now, input.random);
  events.push(
    createProtocolEvent(match, "match.question_opened", {
      question: buildProtocolQuestion(match),
    }),
  );

  return {
    state: match,
    events,
    result: { ok: true, message: "答对了，继续下一题" },
  };
}

function cloneMatch(state: MatchEngineState): MatchEngineState {
  return structuredClone(state);
}

function createRuntimeQuestion(recentPrompts: string[], random: RandomSource) {
  const question = generateQuestion(random, recentPrompts.slice(0, 4));
  return {
    ...question,
    key: crypto.randomUUID(),
  };
}

function buildProtocolQuestion(match: MatchEngineState) {
  return {
    id: match.currentQuestion.key,
    difficulty: match.currentQuestion.difficulty,
    type: match.currentQuestion.type,
    prompt: match.currentQuestion.prompt,
    inputSchema: match.currentQuestion.answerKind,
    damage: match.currentQuestion.damage,
    correctAnswer: match.currentQuestion.correctAnswer,
    meta: match.currentQuestion.meta,
    deadlineAt: match.questionDeadlineAt,
  };
}

function nextQuestion(
  match: MatchEngineState,
  now: number,
  random: RandomSource,
) {
  const question = createRuntimeQuestion(match.recentPrompts, random);

  match.currentQuestion = question;
  match.questionIndex += 1;
  match.questionDeadlineAt = new Date(now + QUESTION_DURATION_MS).toISOString();
  match.recentPrompts = [question.prompt, ...match.recentPrompts].slice(0, 6);
  match.events.unshift(
    createLogEvent("question_spawned", `第 ${match.questionIndex} 题：${question.prompt}`),
  );
}

function resolveWrongAnswerDamage(questionDamage: number) {
  // 当前题库伤害值都是偶数；向上取整能保护后续内容包出现奇数伤害时仍至少承担半伤。
  return Math.ceil(questionDamage / 2);
}

function finishMatch(
  match: MatchEngineState,
  reason: "hp_zero" | "time_up",
  now: number,
) {
  match.phase = "finished";
  match.winReason = reason;
  match.winner = match.winner ?? pickWinnerOnTime(match);
  match.endedAt = new Date(now).toISOString();
  match.events.unshift(
    createLogEvent(
      "match_finished",
      `${match.winner === "red" ? "红队" : "蓝队"}获胜！`,
      match.winner ?? undefined,
    ),
  );
}

function pickWinnerOnTime(match: MatchEngineState): TeamName {
  if (match.teams.red.hpCurrent !== match.teams.blue.hpCurrent) {
    return match.teams.red.hpCurrent > match.teams.blue.hpCurrent ? "red" : "blue";
  }

  if (match.totalCorrect.red !== match.totalCorrect.blue) {
    return match.totalCorrect.red > match.totalCorrect.blue ? "red" : "blue";
  }

  return match.lastHitTeam ?? "red";
}

function createLogEvent(
  type: DemoMatchEvent["type"],
  text: string,
  team?: TeamName,
  targetTeam?: TeamName,
  damage?: number,
): DemoMatchEvent {
  return {
    id: crypto.randomUUID(),
    type,
    text,
    team,
    targetTeam,
    damage,
    createdAt: new Date().toISOString(),
  };
}

function createProtocolEvent<TType extends MatchEvent["type"]>(
  match: MatchEngineState,
  type: TType,
  payload: Extract<MatchEvent, { type: TType }>["payload"],
): Extract<MatchEvent, { type: TType }> {
  match.protocolSeq += 1;

  return {
    seq: match.protocolSeq,
    type,
    serverTime: Date.now(),
    payload,
  } as Extract<MatchEvent, { type: TType }>;
}

function findMember(
  state: MatchEngineState,
  playerId: string,
): DemoMember | null {
  const player = state.players.find((entry) => entry.playerId === playerId);

  if (!player) {
    return null;
  }

  return {
    playerId: player.playerId,
    nickname: player.nickname ?? "玩家",
    team: player.team,
    joinedAt: state.createdAt,
  };
}

function resolveAdvantagedTeam(teamCounts: TeamCounts): TeamName {
  return teamCounts.red <= teamCounts.blue ? "red" : "blue";
}

function renderHpText(matchTeams: MatchEngineState["teams"]) {
  return `红队 ${matchTeams.red.hpCurrent} / 蓝队 ${matchTeams.blue.hpCurrent}`;
}
