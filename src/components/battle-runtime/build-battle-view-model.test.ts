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

    expect(viewModel.topBarLabel).toBe("红 100 / 蓝 90");
    expect(viewModel.topBarTimerLabel).toBe("总 59 秒");
    expect(viewModel.topBarPhaseLabel).toBe("抢答开火");
    expect(viewModel.questionCard?.prompt).toBe("27 + 16 = ?");
    expect(viewModel.questionCard?.secondsLeft).toBe(4);
    expect(viewModel.questionCard?.hint).toBe("抢在对面前面答出来");
    expect(viewModel.questionCard?.submitLabel).toBe("发射箭矢");
    expect(viewModel.footerMessage).toBe("保持专注，抢在别人前面答出来。");
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
    expect(viewModel.stageBannerLabel).toBe("红队命中");
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
    expect(viewModel.questionCard?.hint).toBe("超时会让双方一起掉血");
    expect(viewModel.stageBannerLabel).toBe("超时惩罚");
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
    expect(viewModel.stageBannerLabel).toBe("红队失手");
    expect(viewModel.footerMessage).toBe("答错受伤，装填结束后再抢。");
  });
});
