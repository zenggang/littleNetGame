import { describe, expect, it } from "vitest";

import { getContentPack, listRoomPresets } from "@/lib/game/content/catalog";
import { evaluateAnswer } from "@/lib/game/evaluators";

describe("content catalog", () => {
  it("exposes the grade-2 math starter pack and matching evaluator", () => {
    const preset = listRoomPresets()[0];
    const pack = getContentPack(preset.contentPackId);

    expect(preset.subject).toBe("math");
    expect(pack.grade).toBe("g2");
    expect(pack.questionTypes).toEqual([
      "single-number",
      "quotient-remainder",
    ]);
    expect(
      evaluateAnswer("math-single-number", { value: "42" }, { value: 42 }),
    ).toBe(true);
  });
});
