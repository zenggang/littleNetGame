"use client";

import { useEffect, useRef } from "react";

import type { BattleStageCue } from "@/components/battle-runtime/build-battle-view-model";
import type { BattleScene } from "@/components/battle-runtime/scenes/BattleScene";
import type { MatchState } from "@/lib/game/protocol/state";

type PhaserGame = import("phaser").Game;

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
  const gameRef = useRef<PhaserGame | null>(null);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    let cancelled = false;
    let observer: ResizeObserver | null = null;

    /**
     * Phaser 及 BattleScene 都会触发浏览器环境依赖。
     * 这里改成 effect 内动态加载，避免 webpack 在服务端预执行时踩到 window is not defined。
     */
    void Promise.all([
      import("phaser"),
      import("@/components/battle-runtime/scenes/BattleScene"),
    ]).then(([Phaser, battleSceneModule]) => {
      if (cancelled || !rootRef.current) {
        return;
      }

      const initialWidth = Math.max(rootRef.current.clientWidth, 320);
      const initialHeight = Math.max(rootRef.current.clientHeight, 460);
      const scene = new battleSceneModule.BattleScene(initialStateRef.current);
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
      observer = new ResizeObserver((entries) => {
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
    });

    return () => {
      cancelled = true;
      observer?.disconnect();
      sceneRef.current = null;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.updateState(state, cue);
  }, [cue, state]);

  return <div className="battleStageMount" ref={rootRef} />;
}
