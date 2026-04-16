import type { EvaluatorId } from "@/lib/game/content/types";

type Evaluator = (
  answer: Record<string, string | number | undefined>,
  correctAnswer: Record<string, unknown>,
) => boolean;

// String ids let content packs bind evaluator behavior without importing question code directly.
const evaluators = {
  "math-single-number": (answer, correctAnswer) => {
    const answerValue = readNonNegativeInteger(answer, "value");
    const correctValue = readNonNegativeInteger(correctAnswer, "value");

    return answerValue !== null && correctValue !== null && answerValue === correctValue;
  },
  "math-quotient-remainder": (answer, correctAnswer) => {
    const answerQuotient = readNonNegativeInteger(answer, "quotient");
    const answerRemainder = readNonNegativeInteger(answer, "remainder");
    const correctQuotient = readNonNegativeInteger(correctAnswer, "quotient");
    const correctRemainder = readNonNegativeInteger(correctAnswer, "remainder");

    return (
      answerQuotient !== null &&
      answerRemainder !== null &&
      correctQuotient !== null &&
      correctRemainder !== null &&
      answerQuotient === correctQuotient &&
      answerRemainder === correctRemainder
    );
  },
} satisfies Partial<Record<EvaluatorId, Evaluator>>;

export function evaluateAnswer(
  evaluatorId: EvaluatorId,
  answer: Record<string, string | number | undefined>,
  correctAnswer: Record<string, unknown>,
) {
  const evaluator = evaluators[evaluatorId];

  if (!evaluator) {
    throw new Error(`Unknown evaluator: ${evaluatorId}`);
  }

  return evaluator(answer, correctAnswer);
}

function readNonNegativeInteger(
  values: Record<string, unknown>,
  field: string,
): number | null {
  const value = values[field];

  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0 ? value : null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!/^[0-9]+$/.test(normalized)) {
    return null;
  }

  return Number.parseInt(normalized, 10);
}
