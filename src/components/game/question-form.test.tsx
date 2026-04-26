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
  it("clears selected answer option when the active question changes", async () => {
    const user = userEvent.setup();
    const { rerender } = render(
      <QuestionForm
        flash="idle"
        onSubmit={vi.fn()}
        question={createQuestion()}
        submitLabel="发射箭矢"
      />,
    );

    await user.click(screen.getByRole("button", { name: "19" }));
    expect(screen.getByRole("button", { name: "19" })).toHaveAttribute("aria-pressed", "true");

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

    expect(screen.getByRole("button", { name: "72" })).toHaveAttribute("aria-pressed", "false");
  });

  it("submits the selected answer option as the fire payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <QuestionForm
        flash="idle"
        onSubmit={onSubmit}
        question={createQuestion()}
        submitLabel="发射箭矢"
      />,
    );

    await user.click(screen.getByRole("button", { name: "19" }));
    await user.click(screen.getByRole("button", { name: "发射箭矢" }));

    expect(onSubmit).toHaveBeenCalledWith({ value: "19" });
  });

  it("uses digit slots for quotient-remainder answers without text inputs", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    render(
      <QuestionForm
        flash="idle"
        onSubmit={onSubmit}
        question={createQuestion({
          answerKind: "quotient-remainder",
          prompt: "17 ÷ 5 = ? ……余几？",
          correctAnswer: { quotient: 3, remainder: 2 },
        })}
        submitLabel="发射箭矢"
      />,
    );

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /发射箭矢/ })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(screen.getByRole("button", { name: /发射箭矢/ }));

    expect(onSubmit).toHaveBeenCalledWith({ quotient: "3", remainder: "2" });
  });
});
