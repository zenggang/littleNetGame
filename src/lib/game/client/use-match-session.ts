"use client";

import { useEffect, useState } from "react";

import { openCoordinatorSocket } from "@/lib/game/client/coordinator-client";
import type { MatchEvent } from "@/lib/game/protocol/events";
import { reduceMatchEvent } from "@/lib/game/protocol/reducer";
import {
  createEmptyMatchState,
  type MatchState,
} from "@/lib/game/protocol/state";

export function useMatchSession(input: {
  roomCode: string;
  playerId: string;
  nickname: string;
}) {
  const { nickname, playerId, roomCode } = input;
  const [state, setState] = useState<MatchState>(createEmptyMatchState());
  const canConnect = Boolean(playerId && nickname);

  useEffect(() => {
    if (!canConnect) {
      return;
    }

    let cancelled = false;
    let socket: WebSocket | null = null;

    void openCoordinatorSocket({ roomCode, playerId, nickname }).then((nextSocket) => {
      if (cancelled) {
        nextSocket.close();
        return;
      }

      socket = nextSocket;
      nextSocket.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(event.data) as { event?: MatchEvent };

          if (!data.event) {
            return;
          }

          setState((current) => reduceMatchEvent(current, data.event!));
        } catch {
          // 当前协调层还在搭骨架阶段，先忽略非事件消息，避免把连接探活消息当成错误。
        }
      });
    });

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, [canConnect, nickname, playerId, roomCode]);

  return state;
}
