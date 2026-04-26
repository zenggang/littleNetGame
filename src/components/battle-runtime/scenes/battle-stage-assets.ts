import type { TeamName } from "@/lib/game/types";
import { getAvailableGameAsset } from "@/lib/game/assets/asset-manifest";

type StageViewport = {
  width: number;
  height: number;
};

type CampBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  right: number;
  bottom: number;
};

/**
 * BattleScene 内部只认稳定的 Phaser asset key。
 * 这里把 key 和 team 的对应关系集中起来，后续替换资源文件时不会把场景代码变成一堆硬编码字符串。
 */
export const BATTLE_STAGE_ASSET_KEYS = {
  red: {
    arrow: "battle-fx-arrow-red",
  },
  blue: {
    arrow: "battle-fx-arrow-blue",
  },
  shield: "battle-fx-shield",
  burst: "battle-fx-burst",
} as const;

/**
 * 运行时资源全部走 manifest，保持 Phaser 侧只依赖稳定 key。
 * battle_bg 是 React 页面背景，Scene 不再重复加载静态 arena、基地或炮塔。
 */
export const BATTLE_STAGE_ASSET_PATHS = {
  red: {
    arrow: getAvailableGameAsset("fx.arrow.red.7").path,
  },
  blue: {
    arrow: getAvailableGameAsset("fx.arrow.blue.4").path,
  },
  shield: getAvailableGameAsset("fx.shield").path,
  burst: getAvailableGameAsset("fx.burst").path,
} as const;

/**
 * 阵营区域仍然沿用左右对峙的竖屏构图，但稍微放宽宽度，
 * 让正式资产在小尺寸 battle UI 里不会比旧几何块更小。
 */
export function getCampBounds(viewport: StageViewport, team: TeamName): CampBounds {
  const campWidth = viewport.width * 0.3;
  const campHeight = viewport.height * 0.42;
  const campY = viewport.height * 0.24;
  const sideGap = viewport.width * 0.07;
  const x = team === "red" ? sideGap : viewport.width - sideGap - campWidth;

  return {
    x,
    y: campY,
    width: campWidth,
    height: campHeight,
    centerX: x + campWidth * 0.5,
    centerY: campY + campHeight * 0.5,
    right: x + campWidth,
    bottom: campY + campHeight,
  };
}
