import type { MatchState } from "@/lib/game/protocol/state";

export function matchStateFromSnapshot(snapshot: {
  match: {
    phase: "countdown" | "active" | "finished";
    currentQuestion: {
      key: string;
      prompt: string;
      answerKind: "single-number" | "quotient-remainder";
      damage: number;
    };
    questionDeadlineAt: string;
    teams: {
      red: { hpCurrent: number; hpMax: number };
      blue: { hpCurrent: number; hpMax: number };
    };
    winner: "red" | "blue" | null;
  };
}): MatchState {
  return {
    lastSeq: 0,
    phase: snapshot.match.phase,
    currentQuestion: {
      id: snapshot.match.currentQuestion.key,
      prompt: snapshot.match.currentQuestion.prompt,
      inputSchema: snapshot.match.currentQuestion.answerKind,
      damage: snapshot.match.currentQuestion.damage,
      deadlineAt: snapshot.match.questionDeadlineAt,
    },
    teams: {
      red: { ...snapshot.match.teams.red },
      blue: { ...snapshot.match.teams.blue },
    },
    winner: snapshot.match.winner,
  };
}
