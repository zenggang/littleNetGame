export type GameAssetStatus = "available" | "blocked";

export type GameAssetLayer =
  | "react-dom-background"
  | "react-dom-ui"
  | "react-dom-hud"
  | "phaser-world"
  | "phaser-fx";

export type GameAssetFitPolicy =
  | "contain-first"
  | "full-bleed-cover"
  | "intrinsic"
  | "nine-slice-candidate"
  | "effect-sprite";

export type GameAssetKey =
  | SceneAssetKey
  | UiAssetKey
  | UnitAssetKey
  | FxAssetKey;

export type SceneAssetKey =
  | "scene.home.main"
  | "scene.team.prepare"
  | "scene.battle.play"
  | "scene.score.report";

export type UiAssetKey =
  | "ui.logo.main"
  | "ui.button.start"
  | "ui.button.create"
  | "ui.button.join"
  | "ui.button.hostStart"
  | "ui.button.invite"
  | "ui.button.ready"
  | "ui.button.clear"
  | "ui.button.fire"
  | "ui.badge.vs"
  | "ui.banner.red"
  | "ui.banner.blue"
  | "ui.hud.hp.red"
  | "ui.hud.hp.blue"
  | "ui.hud.timer"
  | "ui.question.screen"
  | "ui.answer.slot"
  | `ui.digit.${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
  | "ui.skill.shield"
  | "ui.skill.heal"
  | "ui.skill.burst"
  | "ui.skill.combo"
  | "ui.result.banner.redVictory"
  | "ui.result.banner.blueVictory"
  | "ui.medal.mvp"
  | "ui.result.comparePanel"
  | "ui.result.timeline"
  | "ui.button.rematch"
  | "ui.button.lobby"
  | "ui.button.share";

export type UnitAssetKey =
  | "units.base.red.main"
  | "units.base.blue.main"
  | "units.base.red.level3"
  | "units.base.blue.level3"
  | "units.platform.red.camp"
  | "units.platform.blue.camp"
  | "units.turret.base"
  | "units.turret.upgrade"
  | "units.road.battle"
  | "units.soldier.red.idle"
  | "units.soldier.blue.idle";

export type FxAssetKey =
  | "fx.arrow.red.7"
  | "fx.arrow.blue.4"
  | "fx.shield"
  | "fx.heal"
  | "fx.burst"
  | "fx.combo"
  | "fx.damage.blocked";

export type GameAssetSafeZone = {
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  unit: "ratio";
  purpose: string;
};

type GameAssetSourceRect =
  | {
      kind: "full";
      x: 0;
      y: 0;
      width: number;
      height: number;
    }
  | {
      kind: "legacy-derived";
      x: null;
      y: null;
      width: number;
      height: number;
      note: string;
    }
  | {
      kind: "blocked";
      x: null;
      y: null;
      width: null;
      height: null;
      note: string;
    };

export type GameAssetManifestEntry = {
  key: GameAssetKey;
  status: GameAssetStatus;
  path: string | null;
  source: string;
  sourceSize: {
    width: number;
    height: number;
  };
  assetSize: {
    width: number;
    height: number;
  } | null;
  sourceRect: GameAssetSourceRect;
  aspect: number | null;
  fitPolicy: GameAssetFitPolicy;
  runtimeLayer: GameAssetLayer;
  safeZones: GameAssetSafeZone[];
  usage: string;
  interactive: boolean;
  animated: boolean;
  blockedReason?: string;
};

const SCENE_SIZE = { width: 1672, height: 941 } as const;
const IMAGE_SHEET_SIZE = { width: 1308, height: 1203 } as const;

const fullSceneRect = {
  kind: "full",
  x: 0,
  y: 0,
  ...SCENE_SIZE,
} satisfies GameAssetSourceRect;

const homeSceneSafeZones: GameAssetSafeZone[] = [
  {
    name: "title-and-primary-actions",
    x: 0.2,
    y: 0.04,
    width: 0.6,
    height: 0.32,
    unit: "ratio",
    purpose: "Keep logo, lobby title, and start/create/join controls readable.",
  },
  {
    name: "battlefield-entry",
    x: 0.08,
    y: 0.3,
    width: 0.84,
    height: 0.6,
    unit: "ratio",
    purpose: "Preserve the castle plaza and red/blue battle entrance.",
  },
];

const teamSceneSafeZones: GameAssetSafeZone[] = [
  {
    name: "left-camp",
    x: 0.04,
    y: 0.16,
    width: 0.4,
    height: 0.72,
    unit: "ratio",
    purpose: "Preserve the left team camp, player slots, and ready state.",
  },
  {
    name: "right-camp",
    x: 0.56,
    y: 0.16,
    width: 0.4,
    height: 0.72,
    unit: "ratio",
    purpose: "Preserve the right team camp, player slots, and ready state.",
  },
  {
    name: "versus-center",
    x: 0.42,
    y: 0.2,
    width: 0.16,
    height: 0.58,
    unit: "ratio",
    purpose: "Keep the central VS relationship visible on all viewports.",
  },
];

const battleSceneSafeZones: GameAssetSafeZone[] = [
  {
    name: "phaser-world",
    x: 0,
    y: 0,
    width: 1,
    height: 0.58,
    unit: "ratio",
    purpose: "Phaser may render projectiles, hit effects, shields, and state overlays here.",
  },
  {
    name: "dom-answer-console",
    x: 0,
    y: 0.58,
    width: 1,
    height: 0.42,
    unit: "ratio",
    purpose: "React DOM owns question text, answer slots, digit choices, and fire controls.",
  },
];

const scoreSceneSafeZones: GameAssetSafeZone[] = [
  {
    name: "victory-banner",
    x: 0.16,
    y: 0.04,
    width: 0.68,
    height: 0.22,
    unit: "ratio",
    purpose: "Keep the victory banner, crown, and winner signal uncropped.",
  },
  {
    name: "report-body",
    x: 0.1,
    y: 0.24,
    width: 0.8,
    height: 0.66,
    unit: "ratio",
    purpose: "Preserve MVP, comparison panels, timeline, and rematch actions.",
  },
];

function sceneAsset(
  key: SceneAssetKey,
  path: string,
  source: string,
  usage: string,
  safeZones: GameAssetSafeZone[],
): GameAssetManifestEntry {
  return {
    key,
    status: "available",
    path,
    source,
    sourceSize: SCENE_SIZE,
    assetSize: SCENE_SIZE,
    sourceRect: fullSceneRect,
    aspect: SCENE_SIZE.width / SCENE_SIZE.height,
    fitPolicy: "full-bleed-cover",
    runtimeLayer: "react-dom-background",
    safeZones,
    usage,
    interactive: false,
    animated: false,
  };
}

function derivedAsset(
  key: Exclude<GameAssetKey, SceneAssetKey>,
  path: string,
  assetSize: { width: number; height: number },
  runtimeLayer: GameAssetLayer,
  usage: string,
  options: {
    fitPolicy?: GameAssetFitPolicy;
    interactive?: boolean;
    animated?: boolean;
  } = {},
): GameAssetManifestEntry {
  return {
    key,
    status: "available",
    path,
    source: "public/imageSheet1.png",
    sourceSize: IMAGE_SHEET_SIZE,
    assetSize,
    sourceRect: {
      kind: "legacy-derived",
      x: null,
      y: null,
      ...assetSize,
      note: "Transparent PNG migrated from public/sheet-assets; original imageSheet1 coordinates were not recoverable from the committed crop.",
    },
    aspect: assetSize.width / assetSize.height,
    fitPolicy: options.fitPolicy ?? "intrinsic",
    runtimeLayer,
    safeZones: [],
    usage,
    interactive: options.interactive ?? false,
    animated: options.animated ?? false,
  };
}

function blockedAsset(
  key: Exclude<GameAssetKey, SceneAssetKey>,
  runtimeLayer: GameAssetLayer,
  usage: string,
  blockedReason: string,
  options: {
    fitPolicy?: GameAssetFitPolicy;
    interactive?: boolean;
    animated?: boolean;
  } = {},
): GameAssetManifestEntry {
  return {
    key,
    status: "blocked",
    path: null,
    source: "public/imageSheet1.png",
    sourceSize: IMAGE_SHEET_SIZE,
    assetSize: null,
    sourceRect: {
      kind: "blocked",
      x: null,
      y: null,
      width: null,
      height: null,
      note: blockedReason,
    },
    aspect: null,
    fitPolicy: options.fitPolicy ?? "intrinsic",
    runtimeLayer,
    safeZones: [],
    usage,
    interactive: options.interactive ?? false,
    animated: options.animated ?? false,
    blockedReason,
  };
}

const digitAssets = Array.from({ length: 10 }, (_, digit) =>
  blockedAsset(
    `ui.digit.${digit as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`,
    "react-dom-hud",
    `Digit ${digit} key for the answer loading console.`,
    "imageSheet1.png has no alpha channel; do not ship checkerboard-backed digit foregrounds until transparent exports are available.",
    { interactive: true },
  ),
);

export const GAME_ASSET_MANIFEST = [
  sceneAsset(
    "scene.home.main",
    "/game-assets/scenes/home-bg.png",
    "public/home_bg.png",
    "Home lobby background. Must stay full-bleed while preserving the lobby focal area.",
    homeSceneSafeZones,
  ),
  sceneAsset(
    "scene.team.prepare",
    "/game-assets/scenes/team-bg.png",
    "public/team_bg.png",
    "Team preparation room background. Must preserve both camps.",
    teamSceneSafeZones,
  ),
  sceneAsset(
    "scene.battle.play",
    "/game-assets/scenes/battle-bg.png",
    "public/battle_bg.png",
    "Battle background with upper battlefield and lower answer console.",
    battleSceneSafeZones,
  ),
  sceneAsset(
    "scene.score.report",
    "/game-assets/scenes/score-bg.png",
    "public/score_bg.png",
    "Score report background with victory banner and report body.",
    scoreSceneSafeZones,
  ),
  derivedAsset("ui.logo.main", "/game-assets/ui/logo-main.png", { width: 314, height: 116 }, "react-dom-ui", "Main lobby logo."),
  derivedAsset("ui.button.start", "/game-assets/ui/button-start.png", { width: 125, height: 58 }, "react-dom-ui", "Primary start battle button.", { interactive: true }),
  derivedAsset("ui.button.create", "/game-assets/ui/button-create.png", { width: 128, height: 58 }, "react-dom-ui", "Create room button.", { interactive: true }),
  derivedAsset("ui.button.join", "/game-assets/ui/button-join.png", { width: 126, height: 58 }, "react-dom-ui", "Join room button.", { interactive: true }),
  derivedAsset("ui.button.hostStart", "/game-assets/ui/button-host-start.png", { width: 130, height: 58 }, "react-dom-ui", "Host start match button.", { interactive: true }),
  blockedAsset("ui.button.invite", "react-dom-ui", "Invite teammate button.", "No transparent invite button export exists yet; keep this blocked instead of reusing an unrelated button.", { interactive: true }),
  blockedAsset("ui.button.ready", "react-dom-ui", "Ready state button.", "No transparent ready button export exists yet; keep this blocked instead of reusing an unrelated button.", { interactive: true }),
  blockedAsset("ui.button.clear", "react-dom-hud", "Clear answer slot button.", "No transparent clear button export exists yet; React text/icon fallback may be used until an asset is exported.", { interactive: true }),
  blockedAsset("ui.button.fire", "react-dom-hud", "Fire loaded answer button.", "No transparent fire button export exists yet; do not use checkerboard-backed sheet crops.", { interactive: true }),
  derivedAsset("ui.badge.vs", "/game-assets/ui/badge-vs.png", { width: 78, height: 88 }, "react-dom-ui", "Central VS badge."),
  derivedAsset("ui.banner.red", "/game-assets/ui/banner-red.png", { width: 112, height: 48 }, "react-dom-ui", "Red team banner."),
  derivedAsset("ui.banner.blue", "/game-assets/ui/banner-blue.png", { width: 112, height: 48 }, "react-dom-ui", "Blue team banner."),
  blockedAsset("ui.hud.hp.red", "react-dom-hud", "Red side HP HUD strip.", "No transparent red HP strip export exists yet; avoid CSS-painted final replacement until asset is available."),
  blockedAsset("ui.hud.hp.blue", "react-dom-hud", "Blue side HP HUD strip.", "No transparent blue HP strip export exists yet; avoid CSS-painted final replacement until asset is available."),
  blockedAsset("ui.hud.timer", "react-dom-hud", "Battle timer HUD strip.", "No transparent timer strip export exists yet."),
  derivedAsset("ui.question.screen", "/game-assets/ui/control-panel.png", { width: 310, height: 264 }, "react-dom-hud", "Question display panel candidate.", { fitPolicy: "nine-slice-candidate" }),
  derivedAsset("ui.answer.slot", "/game-assets/ui/resources-panel.png", { width: 374, height: 250 }, "react-dom-hud", "Answer slot or resource tray candidate.", { fitPolicy: "nine-slice-candidate", interactive: true }),
  ...digitAssets,
  derivedAsset("ui.skill.shield", "/game-assets/ui/skill-shield.png", { width: 70, height: 70 }, "react-dom-hud", "Shield skill button.", { interactive: true }),
  derivedAsset("ui.skill.heal", "/game-assets/ui/skill-heal.png", { width: 70, height: 70 }, "react-dom-hud", "Heal skill button.", { interactive: true }),
  derivedAsset("ui.skill.burst", "/game-assets/ui/skill-burst.png", { width: 72, height: 72 }, "react-dom-hud", "Burst skill button.", { interactive: true }),
  derivedAsset("ui.skill.combo", "/game-assets/ui/skill-combo.png", { width: 72, height: 72 }, "react-dom-hud", "Combo skill button.", { interactive: true }),
  blockedAsset("ui.result.banner.redVictory", "react-dom-ui", "Red victory report banner.", "No dedicated transparent victory banner export exists yet; team banner is not equivalent."),
  blockedAsset("ui.result.banner.blueVictory", "react-dom-ui", "Blue victory report banner.", "No dedicated transparent victory banner export exists yet; team banner is not equivalent."),
  derivedAsset("ui.medal.mvp", "/game-assets/ui/medal-red.png", { width: 58, height: 58 }, "react-dom-ui", "MVP medal candidate."),
  derivedAsset("ui.result.comparePanel", "/game-assets/ui/result-panel.png", { width: 362, height: 278 }, "react-dom-ui", "Score comparison panel.", { fitPolicy: "nine-slice-candidate" }),
  derivedAsset("ui.result.timeline", "/game-assets/ui/room-panel.png", { width: 248, height: 264 }, "react-dom-ui", "Battle timeline panel candidate.", { fitPolicy: "nine-slice-candidate" }),
  blockedAsset("ui.button.rematch", "react-dom-ui", "Rematch button.", "No transparent rematch button export exists yet; do not repurpose start button as final art.", { interactive: true }),
  blockedAsset("ui.button.lobby", "react-dom-ui", "Return lobby button.", "No transparent lobby button export exists yet.", { interactive: true }),
  blockedAsset("ui.button.share", "react-dom-ui", "Share report button.", "No transparent share button export exists yet.", { interactive: true }),
  derivedAsset("units.base.red.main", "/game-assets/units/base-red-main.png", { width: 132, height: 174 }, "phaser-world", "Red main base foreground."),
  derivedAsset("units.base.blue.main", "/game-assets/units/base-blue-main.png", { width: 132, height: 174 }, "phaser-world", "Blue main base foreground."),
  derivedAsset("units.base.red.level3", "/game-assets/units/base-red-level3.png", { width: 92, height: 102 }, "phaser-world", "Red upgraded base candidate."),
  derivedAsset("units.base.blue.level3", "/game-assets/units/base-blue-level3.png", { width: 92, height: 102 }, "phaser-world", "Blue upgraded base candidate."),
  derivedAsset("units.platform.red.camp", "/game-assets/units/platform-red-camp.png", { width: 142, height: 122 }, "react-dom-ui", "Red team camp platform."),
  derivedAsset("units.platform.blue.camp", "/game-assets/units/platform-blue-camp.png", { width: 142, height: 122 }, "react-dom-ui", "Blue team camp platform."),
  derivedAsset("units.turret.base", "/game-assets/units/turret-base.png", { width: 84, height: 88 }, "phaser-world", "Base turret foreground candidate."),
  derivedAsset("units.turret.upgrade", "/game-assets/units/turret-upgrade.png", { width: 84, height: 92 }, "phaser-world", "Upgraded turret foreground candidate."),
  derivedAsset("units.road.battle", "/game-assets/units/battle-road.png", { width: 92, height: 128 }, "phaser-world", "Battle road foreground candidate."),
  derivedAsset("units.soldier.red.idle", "/game-assets/units/soldier-red-idle.png", { width: 54, height: 91 }, "phaser-world", "Red idle soldier.", { animated: false }),
  derivedAsset("units.soldier.blue.idle", "/game-assets/units/soldier-blue-idle.png", { width: 54, height: 91 }, "phaser-world", "Blue idle soldier.", { animated: false }),
  derivedAsset("fx.arrow.red.7", "/game-assets/fx/arrow-red-7.png", { width: 86, height: 38 }, "phaser-fx", "Red numeric arrow projectile.", { fitPolicy: "effect-sprite", animated: true }),
  derivedAsset("fx.arrow.blue.4", "/game-assets/fx/arrow-blue-4.png", { width: 86, height: 38 }, "phaser-fx", "Blue numeric arrow projectile.", { fitPolicy: "effect-sprite", animated: true }),
  derivedAsset("fx.shield", "/game-assets/fx/shield.png", { width: 70, height: 70 }, "phaser-fx", "Shield hit or defense feedback.", { fitPolicy: "effect-sprite", animated: true }),
  derivedAsset("fx.heal", "/game-assets/fx/heal.png", { width: 70, height: 70 }, "phaser-fx", "Heal feedback.", { fitPolicy: "effect-sprite", animated: true }),
  derivedAsset("fx.burst", "/game-assets/fx/burst.png", { width: 72, height: 72 }, "phaser-fx", "Burst feedback.", { fitPolicy: "effect-sprite", animated: true }),
  derivedAsset("fx.combo", "/game-assets/fx/combo.png", { width: 72, height: 72 }, "phaser-fx", "Combo feedback.", { fitPolicy: "effect-sprite", animated: true }),
  blockedAsset("fx.damage.blocked", "phaser-fx", "Damage number feedback.", "No transparent damage-number export exists yet; keep blocked until a clean alpha asset is supplied.", { fitPolicy: "effect-sprite", animated: true }),
] as const satisfies readonly GameAssetManifestEntry[];

export const GAME_ASSET_BY_KEY = Object.fromEntries(
  GAME_ASSET_MANIFEST.map((asset) => [asset.key, asset]),
) as Record<GameAssetKey, GameAssetManifestEntry>;

export function getGameAsset(key: GameAssetKey): GameAssetManifestEntry {
  return GAME_ASSET_BY_KEY[key];
}

export function getAvailableGameAsset(
  key: GameAssetKey,
): GameAssetManifestEntry & { status: "available"; path: string } {
  const asset = getGameAsset(key);

  if (asset.status !== "available" || asset.path === null) {
    throw new Error(`Game asset ${key} is blocked: ${asset.blockedReason ?? "no runtime asset path"}`);
  }

  return asset as GameAssetManifestEntry & { status: "available"; path: string };
}
