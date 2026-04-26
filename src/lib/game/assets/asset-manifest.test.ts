import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

import {
  GAME_ASSET_MANIFEST,
  getAvailableGameAsset,
  getGameAsset,
  type GameAssetKey,
} from "@/lib/game/assets/asset-manifest";

const requiredSceneKeys: GameAssetKey[] = [
  "scene.home.main",
  "scene.team.prepare",
  "scene.battle.play",
  "scene.score.report",
];

const firstBatchKeys: GameAssetKey[] = [
  "ui.logo.main",
  "ui.button.start",
  "ui.button.create",
  "ui.button.join",
  "ui.button.hostStart",
  "ui.button.invite",
  "ui.button.ready",
  "ui.button.clear",
  "ui.button.fire",
  "ui.badge.vs",
  "ui.banner.red",
  "ui.banner.blue",
  "ui.hud.hp.red",
  "ui.hud.hp.blue",
  "ui.hud.timer",
  "ui.question.screen",
  "ui.answer.slot",
  "ui.digit.0",
  "ui.digit.1",
  "ui.digit.2",
  "ui.digit.3",
  "ui.digit.4",
  "ui.digit.5",
  "ui.digit.6",
  "ui.digit.7",
  "ui.digit.8",
  "ui.digit.9",
  "ui.skill.shield",
  "ui.skill.heal",
  "ui.skill.burst",
  "ui.skill.combo",
  "ui.result.banner.redVictory",
  "ui.result.banner.blueVictory",
  "ui.medal.mvp",
  "ui.result.comparePanel",
  "ui.result.timeline",
  "ui.button.rematch",
  "ui.button.lobby",
  "ui.button.share",
  "units.base.red.main",
  "units.base.blue.main",
  "units.platform.red.camp",
  "units.platform.blue.camp",
  "units.soldier.red.idle",
  "units.soldier.blue.idle",
  "fx.arrow.red.7",
  "fx.arrow.blue.4",
  "fx.shield",
  "fx.burst",
  "fx.combo",
];

describe("game asset manifest", () => {
  it("registers the four complete scene backgrounds with runtime metadata", () => {
    for (const key of requiredSceneKeys) {
      const asset = getAvailableGameAsset(key);

      assert.equal(asset.status, "available");
      assert.equal(asset.assetSize?.width, 1672);
      assert.equal(asset.assetSize?.height, 941);
      assert.equal(asset.sourceSize.width, 1672);
      assert.equal(asset.sourceSize.height, 941);
      assert.equal(asset.sourceRect.kind, "full");
      assert.equal(asset.fitPolicy, "full-bleed-cover");
      assert.equal(asset.runtimeLayer, "react-dom-background");
      assert.equal(asset.safeZones.length > 0, true);
      assert.equal(asset.aspect, 1672 / 941);
      assert.equal(asset.path.startsWith("/game-assets/scenes/"), true);
      assert.equal(existsSync(path.join(process.cwd(), "public", asset.path)), true);
    }
  });

  it("registers first-batch ui, unit, and fx keys without forcing blocked sheet crops", () => {
    for (const key of firstBatchKeys) {
      const asset = getGameAsset(key);

      assert.equal(asset.key, key);
      assert.equal(asset.source.length > 0, true);
      assert.equal(asset.sourceSize.width > 0, true);
      assert.equal(asset.sourceSize.height > 0, true);
      assert.equal(asset.fitPolicy.length > 0, true);
      assert.equal(asset.runtimeLayer.length > 0, true);
      assert.ok(Array.isArray(asset.safeZones));

      if (asset.status === "available") {
        assert.notEqual(asset.path, null);
        assert.equal(existsSync(path.join(process.cwd(), "public", asset.path)), true);
      } else {
        // Blocked entries are intentional: imageSheet1 has no alpha, so these
        // keys document missing transparent exports instead of shipping
        // checkerboard-backed foregrounds as finished game assets.
        assert.equal(asset.path, null);
        assert.match(asset.blockedReason ?? "", /alpha|transparent|export|checkerboard/i);
      }
    }
  });

  it("keeps manifest keys unique", () => {
    const keys = GAME_ASSET_MANIFEST.map((asset) => asset.key);
    assert.equal(new Set(keys).size, keys.length);
  });
});
