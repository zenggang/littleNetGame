type Evaluator = (
  answer: Record<string, string | number | undefined>,
  correctAnswer: Record<string, unknown>,
) => boolean;

// The evaluator registry stays string-keyed so content packs can reference it directly.
const evaluators: Record<string, Evaluator> = {
  "math-single-number": (answer, correctAnswer) =>
    Number(answer.value) === Number(correctAnswer.value),
  "math-quotient-remainder": (answer, correctAnswer) =>
    Number(answer.quotient) === Number(correctAnswer.quotient) &&
    Number(answer.remainder) === Number(correctAnswer.remainder),
};

export function evaluateAnswer(
  evaluatorId: string,
  answer: Record<string, string | number | undefined>,
  correctAnswer: Record<string, unknown>,
) {
  const evaluator = evaluators[evaluatorId];

  if (!evaluator) {
    throw new Error(`Unknown evaluator: ${evaluatorId}`);
  }

  return evaluator(answer, correctAnswer);
}
