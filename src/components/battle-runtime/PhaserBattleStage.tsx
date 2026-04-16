"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

import { BattleScene } from "@/components/battle-runtime/scenes/BattleScene";
import type { BattleStageCue } from "@/components/battle-runtime/build-battle-view-model";
import type { MatchState } from "@/lib/game/protocol/state";

type PhaserBattleStageProps = {
  state: MatchState;
  cue: BattleStageCue | null;
};

export function PhaserBattleStage({
  state,
  cue,
}: PhaserBattleStageProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const initialStateRef = useRef(state);
  const sceneRef = useRef<BattleScene | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const initialWidth = Math.max(rootRef.current.clientWidth, 320);
    const initialHeight = Math.max(rootRef.current.clientHeight, 460);
    const scene = new BattleScene(initialStateRef.current);
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: initialWidth,
      height: initialHeight,
      backgroundColor: "transparent",
      parent: rootRef.current,
      scene,
      render: {
        antialias: true,
      },
      scale: {
        mode: Phaser.Scale.NONE,
        autoCenter: Phaser.Scale.NO_CENTER,
      },
    });
    gameRef.current = game;

    /**
     * battle 舞台现在优先适配竖屏容器，而不是把一个固定画布硬塞进卡片。
     * ResizeObserver 只负责尺寸同步，真正的绘制和动画仍由 Scene 内部统一控制。
     */
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];

      if (!entry) {
        return;
      }

      const nextWidth = Math.max(Math.round(entry.contentRect.width), 320);
      const nextHeight = Math.max(Math.round(entry.contentRect.height), 460);

      game.scale.resize(nextWidth, nextHeight);
      scene.resizeStage(nextWidth, nextHeight);
    });

    observer.observe(rootRef.current);

    return () => {
      observer.disconnect();
      sceneRef.current = null;
      gameRef.current = null;
      game.destroy(true);
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.updateState(state, cue);
  }, [cue, state]);

  return <div className="battleStageMount" ref={rootRef} />;
}
