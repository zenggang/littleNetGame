import type { TeamName } from "@/lib/game/types";

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

type SpritePlacement = {
  key: string;
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
};

type CampAssetLayout = {
  base: SpritePlacement;
  turret: SpritePlacement;
};

/**
 * BattleScene 内部只认稳定的 Phaser asset key。
 * 这里把 key 和 team 的对应关系集中起来，后续替换资源文件时不会把场景代码变成一堆硬编码字符串。
 */
export const BATTLE_STAGE_ASSET_KEYS = {
  red: {
    base: "battle-asset-red-base",
    turret: "battle-asset-red-turret",
  },
  blue: {
    base: "battle-asset-blue-base",
    turret: "battle-asset-blue-turret",
  },
} as const;

/**
 * 运行时资源全部走 public/battle-assets，保持 Next 静态资源路径稳定。
 * BattleScene preload 时只需要读取这里，不需要关心磁盘上的真实组织方式。
 */
export const BATTLE_STAGE_ASSET_PATHS = {
  red: {
    base: "/battle-assets/red-base-runtime.png",
    turret: "/battle-assets/red-turret-runtime.png",
  },
  blue: {
    base: "/battle-assets/blue-base-runtime.png",
    turret: "/battle-assets/blue-turret-runtime.png",
  },
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

/**
 * 这里直接返回“舞台该怎么摆资源”，而不是把尺寸判断散在 BattleScene。
 * 目标只有一个：即使缩到手机竖屏对战页，小基地和炮塔也要保住清楚轮廓。
 */
export function getCampAssetLayout(viewport: StageViewport, team: TeamName): CampAssetLayout {
  const bounds = getCampBounds(viewport, team);

  return {
    base: {
      key: BATTLE_STAGE_ASSET_KEYS[team].base,
      x: bounds.centerX,
      y: bounds.y + bounds.height * 0.48,
      displayWidth: bounds.width * 1.04,
      displayHeight: bounds.height * 0.78,
    },
    turret: {
      key: BATTLE_STAGE_ASSET_KEYS[team].turret,
      x: team === "red" ? bounds.x + bounds.width * 0.28 : bounds.right - bounds.width * 0.28,
      y: bounds.bottom - bounds.height * 0.1,
      displayWidth: bounds.width * 0.64,
      displayHeight: bounds.width * 0.56,
    },
  };
}
