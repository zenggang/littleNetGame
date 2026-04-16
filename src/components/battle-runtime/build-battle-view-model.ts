import type { MatchState } from "@/lib/game/protocol/state";

type BattleViewModel = {
  topBarLabel: string;
  topBarTimerLabel: string;
  bottomPanelMode: "answer" | "result";
  questionCard: null | {
    prompt: string;
    damage: number;
    secondsLeft: number;
  };
};

export function buildBattleViewModel(
  state: MatchState,
  now: number,
): BattleViewModel {
  const questionCard = state.currentQuestion
    ? {
        prompt: state.currentQuestion.prompt,
        damage: state.currentQuestion.damage,
        secondsLeft: Math.max(
          0,
          Math.ceil((Date.parse(state.currentQuestion.deadlineAt) - now) / 1000),
        ),
      }
    : null;

  return {
    topBarLabel: `红 ${state.teams.red.hpCurrent} / 蓝 ${state.teams.blue.hpCurrent}`,
    topBarTimerLabel: questionCard
      ? `${questionCard.secondsLeft} 秒`
      : state.phase === "finished"
        ? "已结束"
        : "准备中",
    bottomPanelMode: state.phase === "finished" ? "result" : "answer",
    questionCard,
  };
}
