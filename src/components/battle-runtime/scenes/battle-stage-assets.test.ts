import { describe, expect, it } from "vitest";

import {
  BATTLE_STAGE_ASSET_KEYS,
  getCampAssetLayout,
  getCampBounds,
} from "./battle-stage-assets";

describe("battle stage assets", () => {
  it("maps every runtime asset to a stable Phaser key", () => {
    expect(BATTLE_STAGE_ASSET_KEYS.red.base).toBe("battle-asset-red-base");
    expect(BATTLE_STAGE_ASSET_KEYS.blue.base).toBe("battle-asset-blue-base");
    expect(BATTLE_STAGE_ASSET_KEYS.red.turret).toBe("battle-asset-red-turret");
    expect(BATTLE_STAGE_ASSET_KEYS.blue.turret).toBe("battle-asset-blue-turret");
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

  it("returns large readable base and turret boxes for a small battle viewport", () => {
    const viewport = { width: 390, height: 560 };
    const red = getCampAssetLayout(viewport, "red");
    const blue = getCampAssetLayout(viewport, "blue");

    expect(red.base.displayWidth).toBeGreaterThan(110);
    expect(red.turret.displayWidth).toBeGreaterThan(70);
    expect(red.base.x).toBeLessThan(blue.base.x);
    expect(red.turret.x).toBeLessThan(blue.turret.x);
  });
});
