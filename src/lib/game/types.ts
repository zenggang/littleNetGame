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

// AnswerKind stays local to question generation so gameplay types do not depend on content catalog types.
export type AnswerKind = "single-number" | "quotient-remainder";

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
