"use client";

import { useState } from "react";

import type { MathQuestion } from "@/lib/game/types";

type QuestionFormProps = {
  question: MathQuestion;
  disabled?: boolean;
  onSubmit: (payload: {
    value?: string;
    quotient?: string;
    remainder?: string;
  }) => void;
};

export function QuestionForm({
  question,
  disabled = false,
  onSubmit,
}: QuestionFormProps) {
  const [singleValue, setSingleValue] = useState("");
  const [quotient, setQuotient] = useState("");
  const [remainder, setRemainder] = useState("");

  const reset = () => {
    setSingleValue("");
    setQuotient("");
    setRemainder("");
  };

  return (
    <form
      className="questionForm"
      onSubmit={(event) => {
        event.preventDefault();

        const payload =
          question.answerKind === "single-number"
            ? { value: singleValue }
            : { quotient, remainder };

        onSubmit(payload);
        reset();
      }}
    >
      {question.answerKind === "single-number" ? (
        <input
          value={singleValue}
          onChange={(event) => setSingleValue(event.target.value)}
          inputMode="numeric"
          className="answerInput largeInput"
          placeholder="输入答案"
          disabled={disabled}
        />
      ) : (
        <div className="doubleInput">
          <label>
            商
            <input
              value={quotient}
              onChange={(event) => setQuotient(event.target.value)}
              inputMode="numeric"
              className="answerInput"
              placeholder="商"
              disabled={disabled}
            />
          </label>
          <label>
            余数
            <input
              value={remainder}
              onChange={(event) => setRemainder(event.target.value)}
              inputMode="numeric"
              className="answerInput"
              placeholder="余数"
              disabled={disabled}
            />
          </label>
        </div>
      )}

      <button className="primaryButton" type="submit" disabled={disabled}>
        发射箭矢
      </button>
    </form>
  );
}
