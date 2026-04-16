"use client";

import { useEffect, useRef } from "react";
import * as Phaser from "phaser";

import { BattleScene } from "@/components/battle-runtime/scenes/BattleScene";
import type { MatchState } from "@/lib/game/protocol/state";

export function PhaserBattleStage({ state }: { state: MatchState }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const initialStateRef = useRef(state);
  const sceneRef = useRef<BattleScene | null>(null);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }

    const scene = new BattleScene(initialStateRef.current);
    sceneRef.current = scene;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: 390,
      height: 420,
      backgroundColor: "transparent",
      parent: rootRef.current,
      scene,
      render: {
        antialias: true,
      },
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
      },
    });

    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.updateState(state);
  }, [state]);

  return <div className="battleStageMount" ref={rootRef} />;
}
