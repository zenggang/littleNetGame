import { describe, expect, it } from "vitest";

import {
  BATTLE_STAGE_ASSET_KEYS,
  BATTLE_STAGE_ASSET_PATHS,
  getCampBounds,
} from "./battle-stage-assets";

describe("battle stage assets", () => {
  it("maps every runtime asset to a stable Phaser key", () => {
    expect(BATTLE_STAGE_ASSET_KEYS.red.arrow).toBe("battle-fx-arrow-red");
    expect(BATTLE_STAGE_ASSET_KEYS.blue.arrow).toBe("battle-fx-arrow-blue");
    expect(BATTLE_STAGE_ASSET_KEYS.shield).toBe("battle-fx-shield");
    expect(BATTLE_STAGE_ASSET_KEYS.burst).toBe("battle-fx-burst");
  });

  it("keeps red and blue camps inside the stage with mirrored placement", () => {
    const viewport = { width: 390, height: 560 };
    const red = getCampBounds(viewport, "red");
    const blue = getCampBounds(viewport, "blue");

    expect(red.x).toBeLessThan(viewport.width * 0.5);
    expect(blue.x).toBeGreaterThan(viewport.width * 0.5);
    expect(red.width).toBe(blue.width);
    expect(red.height).toBe(blue.height);
  });

  it("uses manifest-backed dynamic fx assets instead of legacy static stage art", () => {
    expect(BATTLE_STAGE_ASSET_PATHS.red.arrow).toBe("/game-assets/fx/arrow-red-7.png");
    expect(BATTLE_STAGE_ASSET_PATHS.blue.arrow).toBe("/game-assets/fx/arrow-blue-4.png");
    expect(BATTLE_STAGE_ASSET_PATHS.shield).toBe("/game-assets/fx/shield.png");
    expect(BATTLE_STAGE_ASSET_PATHS.burst).toBe("/game-assets/fx/burst.png");
  });
});
