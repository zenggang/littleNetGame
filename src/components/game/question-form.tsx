"use client";

import { useState } from "react";

import type { MathQuestion } from "@/lib/game/types";

type QuestionFormProps = {
  question: MathQuestion;
  disabled?: boolean;
  submitLabel: string;
  flash: "idle" | "success" | "wrong";
  onSubmit: (payload: {
    value?: string;
    quotient?: string;
    remainder?: string;
  }) => void;
};

export function QuestionForm({
  question,
  disabled = false,
  submitLabel,
  flash,
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
      data-flash={flash}
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
        <label className="battleAnswerSlot">
          <span className="battleAnswerLabel">答案装填槽</span>
          <input
            value={singleValue}
            onChange={(event) => setSingleValue(event.target.value)}
            inputMode="numeric"
            className="answerInput largeInput"
            placeholder="填入答案"
            disabled={disabled}
          />
        </label>
      ) : (
        <div className="doubleInput">
          <label className="battleAnswerSlot">
            <span className="battleAnswerLabel">商槽位</span>
            <input
              value={quotient}
              onChange={(event) => setQuotient(event.target.value)}
              inputMode="numeric"
              className="answerInput"
              placeholder="商"
              disabled={disabled}
            />
          </label>
          <label className="battleAnswerSlot">
            <span className="battleAnswerLabel">余数槽位</span>
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

      <button className="battleFireButton" type="submit" disabled={disabled}>
        <span className="battleFireButtonGlow" aria-hidden="true" />
        <span className="battleFireButtonLabel">{submitLabel}</span>
      </button>
    </form>
  );
}
