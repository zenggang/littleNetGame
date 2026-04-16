import { describe, expect, it } from "vitest";

import { buildBattleViewModel } from "@/components/battle-runtime/build-battle-view-model";
import { createEmptyMatchState } from "@/lib/game/protocol/state";

describe("buildBattleViewModel", () => {
  it("surfaces the top bar, battle banner, and bottom question card", () => {
    const state = {
      ...createEmptyMatchState(),
      phase: "active" as const,
      currentQuestion: {
        id: "q-1",
        prompt: "27 + 16 = ?",
        inputSchema: "single-number" as const,
        damage: 10,
        deadlineAt: "2026-04-16T10:00:08.000Z",
      },
      teams: {
        red: { hpCurrent: 100, hpMax: 100 },
        blue: { hpCurrent: 90, hpMax: 100 },
      },
    };

    const viewModel = buildBattleViewModel(
      state,
      Date.parse("2026-04-16T10:00:04.000Z"),
    );

    expect(viewModel.topBarLabel).toBe("红 100 / 蓝 90");
    expect(viewModel.questionCard?.prompt).toBe("27 + 16 = ?");
    expect(viewModel.bottomPanelMode).toBe("answer");
  });
});
