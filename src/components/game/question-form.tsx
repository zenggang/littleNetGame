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
  return (
    <QuestionFormFields
      key={question.key}
      disabled={disabled}
      flash={flash}
      onSubmit={onSubmit}
      question={question}
      submitLabel={submitLabel}
    />
  );
}

function QuestionFormFields({
  question,
  disabled,
  submitLabel,
  flash,
  onSubmit,
}: Required<QuestionFormProps>) {
  const [singleValue, setSingleValue] = useState("");
  const [quotient, setQuotient] = useState("");
  const [remainder, setRemainder] = useState("");
  const [activeRemainderSlot, setActiveRemainderSlot] = useState<"quotient" | "remainder">("quotient");

  const reset = () => {
    setSingleValue("");
    setQuotient("");
    setRemainder("");
    setActiveRemainderSlot("quotient");
  };
  const singleNumberOptions = buildSingleNumberOptions(question);
  const isSingleNumber = question.answerKind === "single-number";
  const isAnswerReady = isSingleNumber
    ? singleValue.length > 0
    : quotient.length > 0 && remainder.length > 0;
  const fireDisabled = disabled || !isAnswerReady;

  const fillRemainderSlot = (digit: number) => {
    const nextDigit = String(digit);

    if (activeRemainderSlot === "quotient") {
      setQuotient(nextDigit);
      setActiveRemainderSlot("remainder");
      return;
    }

    setRemainder(nextDigit);
  };

  return (
    <form
      className="questionForm"
      data-flash={flash}
      onSubmit={(event) => {
        event.preventDefault();

        const payload =
          isSingleNumber
            ? { value: singleValue }
            : { quotient, remainder };

        onSubmit(payload);
        reset();
      }}
    >
      {isSingleNumber ? (
        <div className="battleAnswerRack" role="group" aria-label="答案装填槽">
          {singleNumberOptions.map((option) => (
            <button
              key={option}
              aria-pressed={singleValue === String(option)}
              className="battleAnswerOption"
              disabled={disabled}
              onClick={() => setSingleValue(String(option))}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <div className="remainderLoader">
          <div className="remainderSlots" role="group" aria-label="余数题装填槽">
            <button
              aria-pressed={activeRemainderSlot === "quotient"}
              className="battleAnswerSlot"
              disabled={disabled}
              onClick={() => setActiveRemainderSlot("quotient")}
              type="button"
            >
              <span className="battleAnswerLabel">商槽</span>
              <strong>{quotient || "商"}</strong>
            </button>
            <button
              aria-pressed={activeRemainderSlot === "remainder"}
              className="battleAnswerSlot"
              disabled={disabled}
              onClick={() => setActiveRemainderSlot("remainder")}
              type="button"
            >
              <span className="battleAnswerLabel">余数槽</span>
              <strong>{remainder || "余数"}</strong>
            </button>
          </div>
          <div className="battleDigitPad" role="group" aria-label="数字装填键盘">
            {DIGIT_OPTIONS.map((digit) => (
              <button
                key={digit}
                className="battleDigitButton"
                disabled={disabled}
                onClick={() => fillRemainderSlot(digit)}
                type="button"
              >
                {digit}
              </button>
            ))}
          </div>
          <button
            className="battleClearButton"
            disabled={disabled || (!quotient && !remainder)}
            onClick={reset}
            type="button"
          >
            清空装填
          </button>
        </div>
      )}

      <button className="battleFireButton" type="submit" disabled={fireDisabled}>
        <span className="battleFireButtonGlow" aria-hidden="true" />
        <span className="battleFireButtonLabel">{submitLabel}</span>
      </button>
    </form>
  );
}

const DIGIT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0];

function buildSingleNumberOptions(question: MathQuestion) {
  if (question.answerKind !== "single-number" || !("value" in question.correctAnswer)) {
    return [];
  }

  const correct = question.correctAnswer.value;
  const offsets = correct < 10 ? [-2, 0, 2, 4] : [-10, 0, 10, 20];
  const options = offsets
    .map((offset) => correct + offset)
    .filter((value) => value >= 0);

  /**
   * 选项槽只负责快速装填，不改变判题逻辑。
   * 极小数字题可能因为去掉负数导致选项不足，此处补齐递增干扰项。
   */
  for (let next = correct + 1; options.length < 4; next += 1) {
    if (!options.includes(next)) {
      options.push(next);
    }
  }

  return Array.from(new Set(options)).slice(0, 4);
}
