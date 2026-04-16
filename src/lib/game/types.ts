import type { InputSchema } from "@/lib/game/content/types";

export type TeamName = "red" | "blue";

export type MatchMode = "1v1" | "1v2" | "1v3" | "2v2" | "3v3";

export type TeamCounts = Record<TeamName, number>;

export type TeamConfig = {
  hp: number;
  damageMultiplier: number;
};

export type TeamState = {
  name: TeamName;
  hpMax: number;
  hpCurrent: number;
  damageMultiplier: number;
};

export type QuestionDifficulty = 1 | 2 | 3 | 4;

export type QuestionType =
  | "addition"
  | "subtraction"
  | "multiplication"
  | "division"
  | "remainder-division";

// Keep runtime answer kinds aligned with the shared content input schema.
export type AnswerKind = Exclude<InputSchema, "single-choice">;

export type MathQuestion = {
  key: string;
  difficulty: QuestionDifficulty;
  type: QuestionType;
  prompt: string;
  answerKind: AnswerKind;
  damage: number;
  correctAnswer:
    | { value: number }
    | {
        quotient: number;
        remainder: number;
      };
  meta: {
    dividend?: number;
    divisor?: number;
  };
};
