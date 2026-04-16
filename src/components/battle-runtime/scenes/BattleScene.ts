import * as Phaser from "phaser";

import type { BattleStageCue } from "@/components/battle-runtime/build-battle-view-model";
import type { MatchState } from "@/lib/game/protocol/state";
import type { TeamName } from "@/lib/game/types";

type CampPalette = {
  frame: number;
  accent: number;
  banner: number;
  glow: number;
  text: string;
};

const CAMP_PALETTES: Record<TeamName, CampPalette> = {
  red: {
    frame: 0xcf6040,
    accent: 0xffc171,
    banner: 0xe94b3c,
    glow: 0xff996d,
    text: "#7f2e18",
  },
  blue: {
    frame: 0x3a7de3,
    accent: 0xa8efff,
    banner: 0x2c9ff9,
    glow: 0x8dd6ff,
    text: "#1d4e9c",
  },
};

export class BattleScene extends Phaser.Scene {
  private matchState: MatchState;
  private ready = false;
  private baseLayer?: Phaser.GameObjects.Graphics;
  private overlayLayer?: Phaser.GameObjects.Container;
  private labels: Phaser.GameObjects.Text[] = [];
  private viewport = { width: 390, height: 560 };
  private lastCueId: string | null = null;

  constructor(initialState: MatchState) {
    super("battle-scene");
    this.matchState = initialState;
  }

  create() {
    this.baseLayer = this.add.graphics();
    this.overlayLayer = this.add.container(0, 0);
    this.viewport = {
      width: this.scale.width || this.viewport.width,
      height: this.scale.height || this.viewport.height,
    };
    this.ready = true;
    this.renderState();
  }

  /**
   * 页面外层会在 ResizeObserver 中同步容器尺寸，这里只做舞台重绘，
   * 保证同一套战场构图在不同本地调试窗口里都保持竖屏观感。
   */
  resizeStage(width: number, height: number) {
    this.viewport = { width, height };

    if (this.ready) {
      this.renderState();
    }
  }

  /**
   * Scene 接收的不是裸 state，而是“静态状态 + 一次性 cue”。
   * 这样 React 哪怕多次重渲，只要 cue id 没变，Phaser 就不会重复播放命中或超时演出。
   */
  updateState(nextState: MatchState, cue: BattleStageCue | null) {
    this.matchState = nextState;

    if (!this.ready) {
      return;
    }

    this.renderState();

    if (cue && cue.id !== this.lastCueId) {
      this.lastCueId = cue.id;
      this.playCue(cue);
    }
  }

  private renderState() {
    if (!this.baseLayer) {
      return;
    }

    const { width, height } = this.viewport;
    const base = this.baseLayer;
    const leftCamp = this.getCampBounds("red");
    const rightCamp = this.getCampBounds("blue");

    base.clear();
    this.clearLabels();

    // 顶部天空到底部地面的渐变，保持“玩具战场”而不是普通网页卡片的第一眼观感。
    base.fillGradientStyle(0x99d7ff, 0xcff1ff, 0xf6c978, 0xc77b35, 1);
    base.fillRect(0, 0, width, height);

    base.fillStyle(0xffffff, 0.18);
    base.fillEllipse(width * 0.5, height * 0.18, width * 0.38, height * 0.15);
    base.fillStyle(0xfff6d8, 0.28);
    base.fillEllipse(width * 0.5, height * 0.54, width * 0.18, width * 0.18);

    base.fillStyle(0xf0d3a2, 0.92);
    base.fillRoundedRect(width * 0.18, height * 0.5, width * 0.64, height * 0.1, 28);
    base.fillStyle(0xd9a65c, 0.46);
    base.fillRoundedRect(width * 0.24, height * 0.52, width * 0.52, height * 0.028, 18);

    this.drawCamp("red", leftCamp);
    this.drawCamp("blue", rightCamp);
    this.drawCenterMedallion(width, height);
    this.drawPhaseAccent(width, height);
  }

  private drawCamp(team: TeamName, bounds: Phaser.Geom.Rectangle) {
    if (!this.baseLayer) {
      return;
    }

    const palette = CAMP_PALETTES[team];
    const hp = this.matchState.teams[team];
    const isWinner = this.matchState.phase === "finished" && this.matchState.winner === team;
    const isLoser =
      this.matchState.phase === "finished" &&
      this.matchState.winner !== null &&
      this.matchState.winner !== team;
    const base = this.baseLayer;
    const towerWidth = bounds.width * 0.22;
    const towerHeight = bounds.height * 0.38;
    const mainY = bounds.y + bounds.height * 0.24;
    const mainHeight = bounds.height * 0.58;
    const hpRatio = Math.max(0, Math.min(1, hp.hpCurrent / hp.hpMax));
    const hpBarWidth = bounds.width * 0.74;
    const hpBarX = bounds.x + bounds.width * 0.13;
    const hpBarY = bounds.y + bounds.height * 0.8;

    if (isWinner) {
      base.fillStyle(palette.glow, 0.18);
      base.fillEllipse(bounds.centerX, bounds.centerY, bounds.width * 1.18, bounds.height * 1.08);
    }

    base.fillStyle(0x2f1e14, 0.12);
    base.fillRoundedRect(bounds.x + 6, bounds.y + 12, bounds.width, bounds.height, 28);

    base.fillStyle(0xfaf6ec, 0.92);
    base.fillRoundedRect(bounds.x, mainY, bounds.width, mainHeight, 28);
    base.lineStyle(4, palette.frame, 0.3);
    base.strokeRoundedRect(bounds.x, mainY, bounds.width, mainHeight, 28);

    base.fillStyle(0xf7efe0, 0.96);
    base.fillRoundedRect(bounds.x + bounds.width * 0.04, mainY - towerHeight * 0.44, towerWidth, towerHeight, 18);
    base.fillRoundedRect(
      bounds.right - bounds.width * 0.04 - towerWidth,
      mainY - towerHeight * 0.44,
      towerWidth,
      towerHeight,
      18,
    );
    base.lineStyle(4, palette.frame, 0.26);
    base.strokeRoundedRect(bounds.x + bounds.width * 0.04, mainY - towerHeight * 0.44, towerWidth, towerHeight, 18);
    base.strokeRoundedRect(
      bounds.right - bounds.width * 0.04 - towerWidth,
      mainY - towerHeight * 0.44,
      towerWidth,
      towerHeight,
      18,
    );

    base.fillStyle(palette.banner, 1);
    if (team === "red") {
      base.fillTriangle(
        bounds.x + bounds.width * 0.18,
        mainY - towerHeight * 0.44 - 8,
        bounds.x + bounds.width * 0.18 + 26,
        mainY - towerHeight * 0.44 + 4,
        bounds.x + bounds.width * 0.18,
        mainY - towerHeight * 0.44 + 18,
      );
    } else {
      base.fillTriangle(
        bounds.right - bounds.width * 0.18,
        mainY - towerHeight * 0.44 - 8,
        bounds.right - bounds.width * 0.18 - 26,
        mainY - towerHeight * 0.44 + 4,
        bounds.right - bounds.width * 0.18,
        mainY - towerHeight * 0.44 + 18,
      );
    }

    base.fillStyle(palette.frame, 0.9);
    base.fillRoundedRect(
      bounds.x + bounds.width * 0.14,
      bounds.y + bounds.height * 0.56,
      bounds.width * 0.72,
      bounds.height * 0.08,
      16,
    );
    base.fillStyle(0x2a231d, 0.18);
    base.fillRoundedRect(hpBarX, hpBarY, hpBarWidth, 12, 6);
    base.fillStyle(palette.frame, 1);
    base.fillRoundedRect(hpBarX, hpBarY, hpBarWidth * hpRatio, 12, 6);

    if (isLoser) {
      base.fillStyle(0x1a1210, 0.18);
      base.fillRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 28);
    }

    this.addLabel(bounds.centerX, bounds.y + bounds.height * 0.14, team === "red" ? "红队营地" : "蓝队营地", {
      color: palette.text,
      fontSize: `${Math.round(this.viewport.width * 0.05)}px`,
      align: "center",
    }).setOrigin(0.5);

    this.addLabel(bounds.centerX, bounds.y + bounds.height * 0.28, `${hp.hpCurrent} / ${hp.hpMax}`, {
      color: palette.text,
      fontSize: `${Math.round(this.viewport.width * 0.066)}px`,
      align: "center",
      fontStyle: "900",
    }).setOrigin(0.5);
  }

  private drawCenterMedallion(width: number, height: number) {
    if (!this.baseLayer) {
      return;
    }

    const centerX = width * 0.5;
    const centerY = height * 0.48;

    this.baseLayer.fillStyle(0xfff7de, 0.94);
    this.baseLayer.fillCircle(centerX, centerY, width * 0.08);
    this.baseLayer.lineStyle(6, 0xd99a45, 0.55);
    this.baseLayer.strokeCircle(centerX, centerY, width * 0.08);

    this.addLabel(centerX, centerY, "VS", {
      color: "#7b4524",
      fontSize: `${Math.round(width * 0.052)}px`,
      fontStyle: "900",
      align: "center",
    }).setOrigin(0.5);
  }

  private drawPhaseAccent(width: number, height: number) {
    if (!this.baseLayer) {
      return;
    }

    const base = this.baseLayer;

    if (this.matchState.phase === "countdown") {
      base.fillStyle(0xfffbf2, 0.4);
      base.fillRoundedRect(width * 0.34, height * 0.12, width * 0.32, height * 0.058, 18);
      this.addLabel(width * 0.5, height * 0.149, "列阵准备", {
        color: "#7f5224",
        fontSize: `${Math.round(width * 0.04)}px`,
        align: "center",
      }).setOrigin(0.5);
      return;
    }

    if (this.matchState.phase === "finished" && this.matchState.winner) {
      const winnerTeam = this.matchState.winner === "red" ? "红队" : "蓝队";

      base.fillStyle(0xfff7de, 0.54);
      base.fillRoundedRect(width * 0.26, height * 0.12, width * 0.48, height * 0.072, 22);
      this.addLabel(width * 0.5, height * 0.155, `${winnerTeam}拿下这一局`, {
        color: "#6b3f23",
        fontSize: `${Math.round(width * 0.046)}px`,
        align: "center",
        fontStyle: "900",
      }).setOrigin(0.5);
    }
  }

  private playCue(cue: BattleStageCue) {
    if (!this.overlayLayer) {
      return;
    }

    if (cue.kind === "question-opened") {
      this.spawnCenterBanner("新题装填", 0xfef4d5, "#6d4a22");
      return;
    }

    if (cue.kind === "hit") {
      this.playHitCue(cue);
      return;
    }

    if (cue.kind === "timeout") {
      this.playTimeoutCue(cue);
      return;
    }

    this.playFinishCue(cue);
  }

  private playHitCue(cue: Extract<BattleStageCue, { kind: "hit" }>) {
    const start = this.getProjectileOrigin(cue.attackerTeam);
    const end = this.getImpactPoint(cue.targetTeam);
    const arrow = this.add.container(start.x, start.y);
    const arrowShape = this.add.graphics();
    const palette = CAMP_PALETTES[cue.attackerTeam];
    const controlX = (start.x + end.x) * 0.5;
    const controlY = Math.min(start.y, end.y) - this.viewport.height * 0.2;

    arrowShape.fillStyle(palette.banner, 1);
    arrowShape.fillRoundedRect(-16, -3, 26, 6, 3);
    arrowShape.fillTriangle(12, 0, -2, -9, -2, 9);
    arrow.add(arrowShape);
    this.overlayLayer?.add(arrow);

    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 420,
      ease: "Cubic.Out",
      onUpdate: (tween) => {
        const progress = tween.getValue() ?? 0;
        const nextProgress = Math.min(1, progress + 0.015);
        const point = this.sampleQuadraticPoint(progress, start, { x: controlX, y: controlY }, end);
        const nextPoint = this.sampleQuadraticPoint(nextProgress, start, { x: controlX, y: controlY }, end);

        arrow.setPosition(point.x, point.y);
        arrow.setRotation(Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x));
      },
      onComplete: () => {
        arrow.destroy();
        this.spawnImpact(cue.targetTeam, cue.damage);
      },
    });
  }

  private playTimeoutCue(cue: Extract<BattleStageCue, { kind: "timeout" }>) {
    this.spawnCenterBanner("超时处罚", 0xffefe1, "#8e3d21");
    this.cameras.main.shake(160, 0.006);
    this.spawnImpact("red", cue.redDamage);
    this.spawnImpact("blue", cue.blueDamage);
  }

  private playFinishCue(cue: Extract<BattleStageCue, { kind: "finish" }>) {
    this.spawnCenterBanner(
      cue.winner === "red" ? "红队胜利" : "蓝队胜利",
      0xfff5da,
      cue.winner === "red" ? "#8b301c" : "#215aa9",
    );
    this.spawnCampPulse(cue.winner);
    this.cameras.main.flash(240, 255, 245, 220, true);
  }

  private spawnImpact(team: TeamName, damage: number) {
    if (!this.overlayLayer) {
      return;
    }

    const palette = CAMP_PALETTES[team];
    const point = this.getImpactPoint(team);
    const flash = this.add.graphics();
    const ring = this.add.graphics();
    const damageLabel = this.add.text(point.x, point.y - 12, `-${damage}`, {
      color: team === "red" ? "#b93d1f" : "#1d63ca",
      fontSize: `${Math.round(this.viewport.width * 0.07)}px`,
      fontStyle: "900",
      stroke: "#fff6ed",
      strokeThickness: 6,
    }).setOrigin(0.5);

    flash.fillStyle(0xffffff, 0.9);
    flash.fillCircle(0, 0, 26);
    flash.setPosition(point.x, point.y);

    ring.lineStyle(6, palette.frame, 0.8);
    ring.strokeCircle(0, 0, 18);
    ring.setPosition(point.x, point.y);

    this.overlayLayer.add([ring, flash, damageLabel]);
    this.cameras.main.shake(120, 0.005);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2.2,
      scaleY: 2.2,
      duration: 220,
      onComplete: () => flash.destroy(),
    });

    this.tweens.add({
      targets: ring,
      alpha: 0,
      scaleX: 2.8,
      scaleY: 2.8,
      duration: 280,
      onComplete: () => ring.destroy(),
    });

    this.tweens.add({
      targets: damageLabel,
      y: damageLabel.y - 42,
      alpha: 0,
      duration: 560,
      ease: "Cubic.Out",
      onComplete: () => damageLabel.destroy(),
    });
  }

  private spawnCenterBanner(text: string, fill: number, color: string) {
    if (!this.overlayLayer) {
      return;
    }

    const panel = this.add.graphics();
    const label = this.add.text(this.viewport.width * 0.5, this.viewport.height * 0.22, text, {
      color,
      fontSize: `${Math.round(this.viewport.width * 0.05)}px`,
      fontStyle: "900",
      align: "center",
    }).setOrigin(0.5);

    panel.fillStyle(fill, 0.96);
    panel.fillRoundedRect(-90, -22, 180, 44, 18);
    panel.lineStyle(4, 0xffffff, 0.62);
    panel.strokeRoundedRect(-90, -22, 180, 44, 18);
    panel.setPosition(this.viewport.width * 0.5, this.viewport.height * 0.22);
    panel.setScale(0.72);
    label.setScale(0.72);
    label.alpha = 0;

    this.overlayLayer.add([panel, label]);

    this.tweens.add({
      targets: [panel, label],
      scaleX: 1,
      scaleY: 1,
      alpha: 1,
      duration: 180,
      ease: "Back.Out",
      yoyo: false,
    });

    this.tweens.add({
      targets: [panel, label],
      alpha: 0,
      y: `-=${this.viewport.height * 0.04}`,
      delay: 520,
      duration: 260,
      onComplete: () => {
        panel.destroy();
        label.destroy();
      },
    });
  }

  private spawnCampPulse(team: TeamName) {
    if (!this.overlayLayer) {
      return;
    }

    const bounds = this.getCampBounds(team);
    const pulse = this.add.graphics();

    pulse.lineStyle(10, CAMP_PALETTES[team].glow, 0.6);
    pulse.strokeRoundedRect(bounds.x, bounds.y, bounds.width, bounds.height, 28);
    pulse.alpha = 0.9;
    this.overlayLayer.add(pulse);

    this.tweens.add({
      targets: pulse,
      alpha: 0,
      scaleX: 1.14,
      scaleY: 1.14,
      duration: 540,
      ease: "Cubic.Out",
      onComplete: () => pulse.destroy(),
    });
  }

  private getCampBounds(team: TeamName) {
    const { width, height } = this.viewport;
    const campWidth = width * 0.28;
    const campHeight = height * 0.42;
    const campY = height * 0.24;
    const sideGap = width * 0.08;
    const x = team === "red"
      ? sideGap
      : width - sideGap - campWidth;

    return new Phaser.Geom.Rectangle(x, campY, campWidth, campHeight);
  }

  private getProjectileOrigin(team: TeamName) {
    const bounds = this.getCampBounds(team);

    return {
      x: team === "red" ? bounds.right - 12 : bounds.x + 12,
      y: bounds.centerY - bounds.height * 0.08,
    };
  }

  private getImpactPoint(team: TeamName) {
    const bounds = this.getCampBounds(team);

    return {
      x: team === "red" ? bounds.x + bounds.width * 0.38 : bounds.right - bounds.width * 0.38,
      y: bounds.centerY - bounds.height * 0.04,
    };
  }

  private sampleQuadraticPoint(
    progress: number,
    start: { x: number; y: number },
    control: { x: number; y: number },
    end: { x: number; y: number },
  ) {
    return {
      x: Phaser.Math.Interpolation.QuadraticBezier(progress, start.x, control.x, end.x),
      y: Phaser.Math.Interpolation.QuadraticBezier(progress, start.y, control.y, end.y),
    };
  }

  private addLabel(
    x: number,
    y: number,
    text: string,
    style: Phaser.Types.GameObjects.Text.TextStyle,
  ) {
    const label = this.add.text(x, y, text, {
      fontFamily: "Arial",
      fontStyle: "800",
      ...style,
    });

    this.labels.push(label);
    return label;
  }

  private clearLabels() {
    this.labels.forEach((label) => label.destroy());
    this.labels = [];
  }
}
