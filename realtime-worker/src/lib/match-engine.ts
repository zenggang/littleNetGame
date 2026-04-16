import { evaluateAnswer } from "../../../src/lib/game/evaluators";
import { createInitialTeams } from "../../../src/lib/game/match";
import type { MatchEvent } from "../../../src/lib/game/protocol/events";
import type { MatchMode, TeamName } from "../../../src/lib/game/types";

type MatchEngineState = {
  mode: MatchMode;
  roomCode: string;
  players: Array<{ playerId: string; team: TeamName }>;
  teams: ReturnType<typeof createInitialTeams>;
  questionLocked: boolean;
  seq: number;
};

export function createMatchEngine(input: {
  mode: MatchMode;
  roomCode: string;
  players: Array<{ playerId: string; team: TeamName }>;
}) {
  return {
    mode: input.mode,
    roomCode: input.roomCode,
    players: input.players,
    teams: createInitialTeams(input.mode),
    questionLocked: false,
    seq: 0,
  } satisfies MatchEngineState;
}

export function submitAnswer(
  state: MatchEngineState,
  input: {
    playerId: string;
    answer: Record<string, string | number | undefined>;
    evaluatorId: `math-${string}` | `chinese-${string}` | `english-${string}`;
    correctAnswer: Record<string, unknown>;
    damage: number;
  },
) {
  if (state.questionLocked) {
    return { state, events: [] as MatchEvent[] };
  }

  const player = state.players.find((entry) => entry.playerId === input.playerId);

  if (!player) {
    throw new Error("Unknown player");
  }

  const correct = evaluateAnswer(
    input.evaluatorId,
    input.answer,
    input.correctAnswer,
  );

  if (!correct) {
    return { state, events: [] as MatchEvent[] };
  }

  state.questionLocked = true;
  const targetTeam: TeamName = player.team === "red" ? "blue" : "red";
  state.teams[targetTeam].hpCurrent = Math.max(
    0,
    state.teams[targetTeam].hpCurrent - input.damage,
  );
  state.seq += 1;

  return {
    state,
    events: [
      {
        seq: state.seq,
        type: "match.answer_resolved",
        serverTime: Date.now(),
        payload: {
          attackerTeam: player.team,
          targetTeam,
          damage: input.damage,
          hp: {
            red: state.teams.red.hpCurrent,
            blue: state.teams.blue.hpCurrent,
          },
        },
      },
    ] satisfies MatchEvent[],
  };
}
