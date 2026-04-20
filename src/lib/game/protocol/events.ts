import type { AnswerKind, MathQuestion, TeamName } from "@/lib/game/types";

export type MatchInputSchema = AnswerKind;

export type MatchEvent =
  | {
      seq: number;
      type: "match.question_opened";
      serverTime: number;
      payload: {
        question: {
          id: string;
          difficulty: MathQuestion["difficulty"];
          type: MathQuestion["type"];
          prompt: string;
          inputSchema: MatchInputSchema;
          damage: number;
          correctAnswer: MathQuestion["correctAnswer"];
          meta: MathQuestion["meta"];
          deadlineAt: string;
        };
      };
    }
  | {
      seq: number;
      type: "match.question_timed_out";
      serverTime: number;
      payload: {
        damage: number;
        hp: Record<TeamName, number>;
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
      type: "match.answer_rejected";
      serverTime: number;
      payload: {
        playerId: string;
        team: TeamName;
        damage: number;
        cooldownUntil: number;
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
