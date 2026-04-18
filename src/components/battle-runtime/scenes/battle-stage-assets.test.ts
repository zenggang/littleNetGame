import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BATTLE_STAGE_ASSET_KEYS,
  getCampAssetLayout,
  getCampBounds,
} from "./battle-stage-assets";

describe("battle stage assets", () => {
  it("maps every runtime asset to a stable Phaser key", () => {
    assert.equal(BATTLE_STAGE_ASSET_KEYS.red.base, "battle-asset-red-base");
    assert.equal(BATTLE_STAGE_ASSET_KEYS.blue.base, "battle-asset-blue-base");
    assert.equal(BATTLE_STAGE_ASSET_KEYS.red.turret, "battle-asset-red-turret");
    assert.equal(BATTLE_STAGE_ASSET_KEYS.blue.turret, "battle-asset-blue-turret");
  });

  it("keeps red and blue camps inside the stage with mirrored placement", () => {
    const viewport = { width: 390, height: 560 };
    const red = getCampBounds(viewport, "red");
    const blue = getCampBounds(viewport, "blue");

    assert.ok(red.x < viewport.width * 0.5);
    assert.ok(blue.x > viewport.width * 0.5);
    assert.equal(red.width, blue.width);
    assert.equal(red.height, blue.height);
  });

  it("returns large readable base and turret boxes for a small battle viewport", () => {
    const viewport = { width: 390, height: 560 };
    const red = getCampAssetLayout(viewport, "red");
    const blue = getCampAssetLayout(viewport, "blue");

    assert.ok(red.base.displayWidth > 110);
    assert.ok(red.turret.displayWidth > 70);
    assert.ok(red.base.x < blue.base.x);
    assert.ok(red.turret.x < blue.turret.x);
  });
});
