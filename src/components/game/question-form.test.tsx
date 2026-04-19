import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { QuestionForm } from "@/components/game/question-form";
import type { MathQuestion } from "@/lib/game/types";

function createQuestion(overrides: Partial<MathQuestion> = {}): MathQuestion {
  return {
    key: "q-1",
    difficulty: 2,
    type: "addition",
    prompt: "12 + 7 = ?",
    answerKind: "single-number",
    damage: 8,
    correctAnswer: { value: 19 },
    meta: {},
    ...overrides,
  };
}

describe("QuestionForm", () => {
  it("clears answer fields when the active question changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <QuestionForm
        flash="idle"
        onSubmit={vi.fn()}
        question={createQuestion()}
        submitLabel="发射箭矢"
      />,
    );

    await user.type(screen.getByPlaceholderText("填入答案"), "19");

    rerender(
      <QuestionForm
        flash="idle"
        onSubmit={vi.fn()}
        question={createQuestion({
          key: "q-2",
          prompt: "8 × 9 = ?",
          correctAnswer: { value: 72 },
        })}
        submitLabel="发射箭矢"
      />,
    );

    expect(screen.getByPlaceholderText("填入答案")).toHaveValue("");
  });
});
