import type { MathQuestion, QuestionDifficulty, QuestionType } from "@/lib/game/types";

type RandomSource = {
  next: () => number;
};

const DAMAGE_BY_DIFFICULTY: Record<QuestionDifficulty, number> = {
  1: 6,
  2: 8,
  3: 10,
  4: 12,
};

export function createSequenceRandom(sequence: number[]): RandomSource {
  let index = 0;

  return {
    next() {
      const value = sequence[index] ?? sequence[sequence.length - 1] ?? 0.5;
      index += 1;
      return Math.min(Math.max(value, 0), 0.999_999);
    },
  };
}

export function generateQuestion(
  random: RandomSource,
  recentPrompts: string[],
): MathQuestion {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const difficulty = pickDifficulty(random);
    const question = buildQuestionByDifficulty(difficulty, random);

    if (!recentPrompts.includes(question.prompt)) {
      return question;
    }
  }

  return buildQuestionByDifficulty(1, createSequenceRandom([0.12, 0.21, 0.34]));
}

export function isAnswerCorrect(
  question: Pick<MathQuestion, "answerKind" | "correctAnswer">,
  answer: Record<string, string | number | undefined>,
): boolean {
  if (question.answerKind === "single-number" && "value" in question.correctAnswer) {
    return toNumber(answer.value) === question.correctAnswer.value;
  }

  if (
    question.answerKind === "quotient-remainder" &&
    "quotient" in question.correctAnswer
  ) {
    return (
      toNumber(answer.quotient) === question.correctAnswer.quotient &&
      toNumber(answer.remainder) === question.correctAnswer.remainder
    );
  }

  return false;
}

function pickDifficulty(random: RandomSource): QuestionDifficulty {
  return Math.min(4, Math.floor(random.next() * 4) + 1) as QuestionDifficulty;
}

function buildQuestionByDifficulty(
  difficulty: QuestionDifficulty,
  random: RandomSource,
): MathQuestion {
  switch (difficulty) {
    case 1:
      return buildLevel1Question(random);
    case 2:
      return buildLevel2Question(random);
    case 3:
      return buildLevel3Question(random);
    case 4:
      return buildRemainderQuestion(random);
  }
}

function buildLevel1Question(random: RandomSource): MathQuestion {
  const shouldAdd = random.next() < 0.5;

  if (shouldAdd) {
    const left = rollInt(random, 1, 9);
    const right = rollInt(random, 1, 9 - left);
    return singleNumberQuestion({
      difficulty: 1,
      type: "addition",
      prompt: `${left} + ${right} = ?`,
      value: left + right,
    });
  }

  const left = rollInt(random, 4, 20);
  const right = rollInt(random, 1, left);
  return singleNumberQuestion({
    difficulty: 1,
    type: "subtraction",
    prompt: `${left} - ${right} = ?`,
    value: left - right,
  });
}

function buildLevel2Question(random: RandomSource): MathQuestion {
  const shouldAdd = random.next() < 0.5;
  const left = rollInt(random, 10, 89);
  const right = rollInt(random, 10, shouldAdd ? 99 - left : left);

  if (shouldAdd) {
    return singleNumberQuestion({
      difficulty: 2,
      type: "addition",
      prompt: `${left} + ${right} = ?`,
      value: left + right,
    });
  }

  return singleNumberQuestion({
    difficulty: 2,
    type: "subtraction",
    prompt: `${left} - ${right} = ?`,
    value: left - right,
  });
}

function buildLevel3Question(random: RandomSource): MathQuestion {
  const shouldMultiply = random.next() < 0.5;

  if (shouldMultiply) {
    const left = rollInt(random, 1, 9);
    const right = rollInt(random, 1, 9);
    return singleNumberQuestion({
      difficulty: 3,
      type: "multiplication",
      prompt: `${left} × ${right} = ?`,
      value: left * right,
    });
  }

  const divisor = rollInt(random, 2, 9);
  const quotient = rollInt(random, 2, 9);
  const dividend = divisor * quotient;

  return singleNumberQuestion({
    difficulty: 3,
    type: "division",
    prompt: `${dividend} ÷ ${divisor} = ?`,
    value: quotient,
    meta: {
      dividend,
      divisor,
    },
  });
}

function buildRemainderQuestion(random: RandomSource): MathQuestion {
  const divisor = rollInt(random, 2, 9);
  const quotient = rollInt(random, 2, 9);
  const remainder = rollInt(random, 1, divisor - 1);
  const dividend = divisor * quotient + remainder;

  return {
    key: `remainder-${dividend}-${divisor}`,
    difficulty: 4,
    type: "remainder-division",
    prompt: `${dividend} ÷ ${divisor} = ? ……余几？`,
    answerKind: "quotient-remainder",
    damage: DAMAGE_BY_DIFFICULTY[4],
    correctAnswer: {
      quotient,
      remainder,
    },
    meta: {
      dividend,
      divisor,
    },
  };
}

function singleNumberQuestion(input: {
  difficulty: QuestionDifficulty;
  type: Exclude<QuestionType, "remainder-division">;
  prompt: string;
  value: number;
  meta?: MathQuestion["meta"];
}): MathQuestion {
  return {
    key: `${input.type}-${input.prompt}`,
    difficulty: input.difficulty,
    type: input.type,
    prompt: input.prompt,
    answerKind: "single-number",
    damage: DAMAGE_BY_DIFFICULTY[input.difficulty],
    correctAnswer: {
      value: input.value,
    },
    meta: input.meta ?? {},
  };
}

function rollInt(random: RandomSource, min: number, max: number): number {
  const span = max - min + 1;
  return Math.floor(random.next() * span) + min;
}

function toNumber(value: string | number | undefined): number | null {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}
