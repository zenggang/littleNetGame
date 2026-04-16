import type { InputSchema } from "@/lib/game/content/types";
import type { TeamName } from "@/lib/game/types";

export type MatchState = {
  lastSeq: number;
  phase: "idle" | "countdown" | "active" | "finished";
  currentQuestion: null | {
    id: string;
    prompt: string;
    inputSchema: InputSchema;
    damage: number;
    deadlineAt: string;
  };
  teams: Record<TeamName, { hpCurrent: number; hpMax: number }>;
  winner: TeamName | null;
};

export function createEmptyMatchState(): MatchState {
  return {
    lastSeq: 0,
    phase: "idle",
    currentQuestion: null,
    teams: {
      red: { hpCurrent: 100, hpMax: 100 },
      blue: { hpCurrent: 100, hpMax: 100 },
    },
    winner: null,
  };
}
