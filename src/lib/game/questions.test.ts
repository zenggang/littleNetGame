import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createSequenceRandom,
  generateQuestion,
  isAnswerCorrect,
} from "@/lib/game/questions";

describe("question generation", () => {
  it("builds a level 1 addition question inside second-grade bounds", () => {
    const random = createSequenceRandom([0.01, 0.02, 0.33, 0.44]);
    const question = generateQuestion(random, []);

    assert.equal(question.difficulty, 1);
    assert.match(question.prompt, /\d+ \+ \d+ = \?/);
    assert.equal(question.damage, 6);
  });

  it("builds a remainder division question with quotient and remainder answers", () => {
    const random = createSequenceRandom([0.95, 0.1, 0.2, 0.3, 0.4]);
    const question = generateQuestion(random, []);

    assert.equal(question.difficulty, 4);
    assert.equal(question.answerKind, "quotient-remainder");
    assert.equal(typeof question.correctAnswer.quotient, "number");
    assert.equal(typeof question.correctAnswer.remainder, "number");
    assert.equal(
      question.correctAnswer.remainder < question.meta.divisor,
      true,
    );
  });

  it("checks normal and remainder answers correctly", () => {
    assert.equal(
      isAnswerCorrect(
        {
          answerKind: "single-number",
          correctAnswer: { value: 15 },
        },
        { value: "15" },
      ),
      true,
    );

    assert.equal(
      isAnswerCorrect(
        {
          answerKind: "quotient-remainder",
          correctAnswer: { quotient: 3, remainder: 2 },
        },
        { quotient: "3", remainder: "2" },
      ),
      true,
    );

    assert.equal(
      isAnswerCorrect(
        {
          answerKind: "quotient-remainder",
          correctAnswer: { quotient: 3, remainder: 2 },
        },
        { quotient: "3", remainder: "1" },
      ),
      false,
    );
  });

  it("accepts full-width numeric answers from mobile input methods", () => {
    assert.equal(
      isAnswerCorrect(
        {
          answerKind: "single-number",
          correctAnswer: { value: 42 },
        },
        { value: "４２" },
      ),
      true,
    );

    assert.equal(
      isAnswerCorrect(
        {
          answerKind: "quotient-remainder",
          correctAnswer: { quotient: 3, remainder: 2 },
        },
        { quotient: "３", remainder: "２" },
      ),
      true,
    );
  });
});
