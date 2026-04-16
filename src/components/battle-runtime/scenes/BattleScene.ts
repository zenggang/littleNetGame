import * as Phaser from "phaser";

import type { MatchState } from "@/lib/game/protocol/state";

export class BattleScene extends Phaser.Scene {
  private matchState: MatchState;
  private graphics?: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private ready = false;

  constructor(initialState: MatchState) {
    super("battle-scene");
    this.matchState = initialState;
  }

  create() {
    this.graphics = this.add.graphics();
    this.ready = true;
    this.renderState();
  }

  updateState(nextState: MatchState) {
    this.matchState = nextState;

    if (this.ready) {
      this.renderState();
    }
  }

  private renderState() {
    if (!this.graphics) {
      return;
    }

    this.graphics.clear();
    this.labels.forEach((label) => label.destroy());
    this.labels = [];

    // 用简单的几何图形先把战场主层建立起来，后续再替换成更完整的战斗演出与素材。
    this.graphics.fillGradientStyle(0xbfe4ff, 0xbfe4ff, 0xc18b4f, 0x9f6436, 1);
    this.graphics.fillRect(0, 0, 390, 420);

    this.graphics.fillStyle(0xf7f0df, 0.92);
    this.graphics.fillRoundedRect(24, 110, 112, 170, 18);
    this.graphics.fillRoundedRect(254, 110, 112, 170, 18);

    this.graphics.fillStyle(0xc8452f, 1);
    this.graphics.fillRoundedRect(42, 232, 76, 12, 6);
    this.graphics.fillStyle(0x2a69d6, 1);
    this.graphics.fillRoundedRect(272, 232, 76, 12, 6);

    this.graphics.fillStyle(0xfff5e6, 0.92);
    this.graphics.fillCircle(195, 182, 28);

    this.addLabel(44, 132, "红队营地", "#341d14", "18px sans-serif");
    this.addLabel(273, 132, "蓝队营地", "#341d14", "18px sans-serif");
    this.addLabel(
      44,
      164,
      `${this.matchState.teams.red.hpCurrent} / ${this.matchState.teams.red.hpMax}`,
      "#7d3824",
      "24px sans-serif",
    );
    this.addLabel(
      273,
      164,
      `${this.matchState.teams.blue.hpCurrent} / ${this.matchState.teams.blue.hpMax}`,
      "#215ab7",
      "24px sans-serif",
    );
    this.addLabel(184, 170, "VS", "#8a4a23", "18px sans-serif");

    if (this.matchState.currentQuestion) {
      this.addLabel(75, 320, this.matchState.currentQuestion.prompt, "#1f1711", "26px sans-serif");
    }
  }

  private addLabel(
    x: number,
    y: number,
    text: string,
    color: string,
    font: string,
  ) {
    const label = this.add.text(x, y, text, {
      color,
      font,
      fontStyle: "700",
    });

    this.labels.push(label);
  }
}
