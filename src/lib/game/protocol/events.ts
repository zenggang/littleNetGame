import type { InputSchema } from "@/lib/game/content/types";
import type { TeamName } from "@/lib/game/types";

export type MatchEvent =
  | {
      seq: number;
      type: "match.question_opened";
      serverTime: number;
      payload: {
        question: {
          id: string;
          prompt: string;
          inputSchema: InputSchema;
          damage: number;
          deadlineAt: string;
        };
      };
    }
  | {
      seq: number;
      type: "match.answer_resolved";
      serverTime: number;
      payload: {
        attackerTeam: TeamName;
        targetTeam: TeamName;
        damage: number;
        hp: Record<TeamName, number>;
      };
    }
  | {
      seq: number;
      type: "match.finished";
      serverTime: number;
      payload: {
        winner: TeamName;
        reason: "hp_zero" | "time_up";
      };
    };
