import type { MatchEvent } from "@/lib/game/protocol/events";
import type { MatchState } from "@/lib/game/protocol/state";

export function reduceMatchEvent(state: MatchState, event: MatchEvent): MatchState {
  // Stale or duplicate events must not rewind the local match state.
  if (event.seq <= state.lastSeq) {
    return state;
  }

  if (event.type === "match.question_opened") {
    return {
      ...state,
      lastSeq: event.seq,
      phase: "active",
      currentQuestion: event.payload.question,
    };
  }

  if (
    event.type === "match.answer_resolved" ||
    event.type === "match.answer_rejected" ||
    event.type === "match.question_timed_out"
  ) {
    return {
      ...state,
      lastSeq: event.seq,
      teams: {
        red: { ...state.teams.red, hpCurrent: event.payload.hp.red },
        blue: { ...state.teams.blue, hpCurrent: event.payload.hp.blue },
      },
    };
  }

  return {
    ...state,
    lastSeq: event.seq,
    phase: "finished",
    winner: event.payload.winner,
  };
}
