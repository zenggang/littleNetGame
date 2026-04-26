import { describe, expect, it } from "vitest";

import { buildBattleViewModel } from "@/components/battle-runtime/build-battle-view-model";
import type { CoordinatorMatchSnapshot } from "@/lib/game/protocol/coordinator";

describe("buildBattleViewModel", () => {
  const createMatch = (
    overrides: Partial<NonNullable<CoordinatorMatchSnapshot["match"]>> = {},
  ): NonNullable<CoordinatorMatchSnapshot["match"]> => ({
    id: "match-1",
    roomCode: "ABCD",
    mode: "1v1",
    phase: "active",
    teams: {
      red: { name: "red", hpCurrent: 100, hpMax: 100, damageMultiplier: 1 },
      blue: { name: "blue", hpCurrent: 90, hpMax: 100, damageMultiplier: 1 },
    },
    totalCorrect: { red: 1, blue: 0 },
    currentQuestion: {
      key: "q-1",
      difficulty: 2,
      type: "addition",
      prompt: "27 + 16 = ?",
      answerKind: "single-number",
      damage: 10,
      correctAnswer: { value: 43 },
      meta: {},
    },
    questionIndex: 2,
    questionDeadlineAt: "2026-04-16T10:00:08.000Z",
    countdownEndsAt: "2026-04-16T09:59:59.000Z",
    endsAt: "2026-04-16T10:01:03.000Z",
    recentPrompts: ["27 + 16 = ?"],
    winner: null,
    winReason: null,
    lastHitTeam: "red",
    cooldowns: {},
    events: [],
    createdAt: "2026-04-16T10:00:00.000Z",
    endedAt: null,
    ...overrides,
  });

  it("surfaces the top bar, control desk copy, and bottom question card", () => {
    const match = createMatch();

    const viewModel = buildBattleViewModel({
      match,
      previousMatch: null,
      viewerTeam: "red",
      now: Date.parse("2026-04-16T10:00:04.000Z"),
      isCoolingDown: false,
      feedback: "",
      error: "",
    });

    expect(viewModel.topBarLabel).toBe("红 2800 / 蓝 2520");
    expect(viewModel.topBarTimerLabel).toBe("总 59 秒");
    expect(viewModel.topBarPhaseLabel).toBe("抢答开火");
    expect(viewModel.redHpLabel).toBe("2800 / 2800");
    expect(viewModel.blueHpLabel).toBe("2520 / 2800");
    expect(viewModel.questionCard?.prompt).toBe("27 + 16 = ?");
    expect(viewModel.questionCard?.secondsLeft).toBe(4);
    expect(viewModel.questionCard?.deckLabel).toBe("当前弹药题");
    expect(viewModel.questionCard?.damageLabel).toBe("箭矢威力 10");
    expect(viewModel.questionCard?.secondsLeftLabel).toBe("装填窗口 4s");
    expect(viewModel.questionCard?.hint).toBe("解出答案，把数字箭矢打进对面护盾");
    expect(viewModel.questionCard?.submitLabel).toBe("发射箭矢");
    expect(viewModel.footerMessage).toBe("保持专注，把这一发数字箭矢装好。");
  });

  it("surfaces the viewer team label", () => {
    const viewModel = buildBattleViewModel({
      match: createMatch(),
      previousMatch: null,
      viewerTeam: "blue",
      now: Date.parse("2026-04-16T10:00:04.000Z"),
      isCoolingDown: false,
      feedback: "",
      error: "",
    });

    expect(viewModel.viewerTeamLabel).toBe("你是蓝队");
  });

  it("builds a hit cue when one side loses hp after a correct answer", () => {
    const previousMatch = createMatch({
      currentQuestion: {
        key: "q-1",
        difficulty: 2,
        type: "addition",
        prompt: "27 + 16 = ?",
        answerKind: "single-number",
        damage: 10,
        correctAnswer: { value: 43 },
        meta: {},
      },
      questionIndex: 2,
      teams: {
        red: { name: "red", hpCurrent: 100, hpMax: 100, damageMultiplier: 1 },
        blue: { name: "blue", hpCurrent: 90, hpMax: 100, damageMultiplier: 1 },
      },
      lastHitTeam: null,
    });

    const match = createMatch({
      currentQuestion: {
        key: "q-2",
        difficulty: 2,
        type: "addition",
        prompt: "31 + 11 = ?",
        answerKind: "single-number",
        damage: 8,
        correctAnswer: { value: 42 },
        meta: {},
      },
      questionIndex: 3,
      teams: {
        red: { name: "red", hpCurrent: 100, hpMax: 100, damageMultiplier: 1 },
        blue: { name: "blue", hpCurrent: 80, hpMax: 100, damageMultiplier: 1 },
      },
      lastHitTeam: "red",
    });

    const viewModel = buildBattleViewModel({
      match,
      previousMatch,
      viewerTeam: "red",
      now: Date.parse("2026-04-16T10:00:04.000Z"),
      isCoolingDown: false,
      feedback: "",
      error: "",
    });

    expect(viewModel.stageCue).toEqual({
      id: "hit:q-2:red:blue:10",
      kind: "hit",
      attackerTeam: "red",
      targetTeam: "blue",
      damage: 10,
    });
    expect(viewModel.stageBannerLabel).toBe("红队数字箭矢命中");
  });

  it("builds a blue-to-red hit cue from the latest correct-answer event", () => {
    const previousMatch = createMatch({
      currentQuestion: {
        key: "q-2",
        difficulty: 2,
        type: "addition",
        prompt: "31 + 11 = ?",
        answerKind: "single-number",
        damage: 8,
        correctAnswer: { value: 42 },
        meta: {},
      },
      questionIndex: 3,
      teams: {
        red: { name: "red", hpCurrent: 100, hpMax: 100, damageMultiplier: 1 },
        blue: { name: "blue", hpCurrent: 80, hpMax: 100, damageMultiplier: 1 },
      },
      lastHitTeam: "red",
    });

    const match = createMatch({
      currentQuestion: {
        key: "q-3",
        difficulty: 2,
        type: "addition",
        prompt: "19 + 8 = ?",
        answerKind: "single-number",
        damage: 9,
        correctAnswer: { value: 27 },
        meta: {},
      },
      questionIndex: 4,
      teams: {
        red: { name: "red", hpCurrent: 92, hpMax: 100, damageMultiplier: 1 },
        blue: { name: "blue", hpCurrent: 80, hpMax: 100, damageMultiplier: 1 },
      },
      lastHitTeam: "red",
      events: [
        {
          id: "hp-1",
          type: "hp_changed",
          text: "红队 92 / 蓝队 80",
          team: "blue",
          targetTeam: "red",
          damage: 8,
          createdAt: "2026-04-16T10:00:04.000Z",
        },
        {
          id: "hit-1",
          type: "answer_correct",
          text: "小蓝抢先答对了，蓝队发起进攻！",
          team: "blue",
          targetTeam: "red",
          damage: 8,
          createdAt: "2026-04-16T10:00:04.000Z",
        },
      ],
    });

    const viewModel = buildBattleViewModel({
      match,
      previousMatch,
      viewerTeam: "blue",
      now: Date.parse("2026-04-16T10:00:04.000Z"),
      isCoolingDown: false,
      feedback: "",
      error: "",
    });

    expect(viewModel.stageCue).toEqual({
      id: "hit:q-3:blue:red:8:hit-1",
      kind: "hit",
      attackerTeam: "blue",
      targetTeam: "red",
      damage: 8,
    });
  });


  it("builds a timeout cue when both camps lose hp on question rollover", () => {
    const previousMatch = createMatch({
      currentQuestion: {
        key: "q-2",
        difficulty: 2,
        type: "division",
        prompt: "17 ÷ 5 = ?",
        answerKind: "quotient-remainder",
        damage: 6,
        correctAnswer: { quotient: 3, remainder: 2 },
        meta: {},
      },
      questionIndex: 3,
      teams: {
        red: { name: "red", hpCurrent: 92, hpMax: 100, damageMultiplier: 1 },
        blue: { name: "blue", hpCurrent: 88, hpMax: 100, damageMultiplier: 1 },
      },
      lastHitTeam: "red",
    });

    const match = createMatch({
      currentQuestion: {
        key: "q-3",
        difficulty: 2,
        type: "addition",
        prompt: "19 + 8 = ?",
        answerKind: "single-number",
        damage: 9,
        correctAnswer: { value: 27 },
        meta: {},
      },
      questionIndex: 4,
      teams: {
        red: { name: "red", hpCurrent: 90, hpMax: 100, damageMultiplier: 1 },
        blue: { name: "blue", hpCurrent: 86, hpMax: 100, damageMultiplier: 1 },
      },
    });

    const viewModel = buildBattleViewModel({
      match,
      previousMatch,
      viewerTeam: "blue",
      now: Date.parse("2026-04-16T10:00:07.000Z"),
      isCoolingDown: false,
      feedback: "",
      error: "",
    });

    expect(viewModel.stageCue).toEqual({
      id: "timeout:q-3:2:2",
      kind: "timeout",
      redDamage: 2,
      blueDamage: 2,
    });
    expect(viewModel.questionCard?.hint).toBe("弹药过载，双方护盾同时受损");
    expect(viewModel.stageBannerLabel).toBe("弹药过载");
  });

  it("builds a wrong-answer cue when one camp loses hp without changing question", () => {
    const previousMatch = createMatch({
      currentQuestion: {
        key: "q-2",
        difficulty: 2,
        type: "addition",
        prompt: "27 + 16 = ?",
        answerKind: "single-number",
        damage: 8,
        correctAnswer: { value: 43 },
        meta: {},
      },
      questionIndex: 2,
      teams: {
        red: { name: "red", hpCurrent: 100, hpMax: 100, damageMultiplier: 1 },
        blue: { name: "blue", hpCurrent: 90, hpMax: 100, damageMultiplier: 1 },
      },
    });

    const match = createMatch({
      currentQuestion: previousMatch.currentQuestion,
      questionIndex: 2,
      teams: {
        red: { name: "red", hpCurrent: 96, hpMax: 100, damageMultiplier: 1 },
        blue: { name: "blue", hpCurrent: 90, hpMax: 100, damageMultiplier: 1 },
      },
      events: [
        {
          id: "event-1",
          type: "answer_wrong",
          text: "阿杰答错了，红队受到 4 点反噬。",
          team: "red",
          targetTeam: "red",
          damage: 4,
          createdAt: "2026-04-16T10:00:04.000Z",
        },
      ],
    });

    const viewModel = buildBattleViewModel({
      match,
      previousMatch,
      viewerTeam: "red",
      now: Date.parse("2026-04-16T10:00:04.000Z"),
      isCoolingDown: true,
      feedback: "",
      error: "",
    });

    expect(viewModel.stageCue).toEqual({
      id: "wrong:q-2:red:4:event-1",
      kind: "wrong-answer",
      team: "red",
      damage: 4,
    });
    expect(viewModel.stageBannerLabel).toBe("红队装填失误");
    expect(viewModel.footerMessage).toBe("装填失误产生反噬，冷却结束后再抢。");
  });
});
