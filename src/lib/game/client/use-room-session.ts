"use client";

import { useEffect, useState } from "react";

import { openCoordinatorSocket } from "@/lib/game/client/coordinator-client";

export function useRoomSession(input: {
  roomCode: string;
  playerId: string;
  nickname: string;
}) {
  const { nickname, playerId, roomCode } = input;
  const [socketConnected, setSocketConnected] = useState(false);
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
      nextSocket.addEventListener("open", () => setSocketConnected(true));
      nextSocket.addEventListener("close", () => {
        setSocketConnected(false);
      });
    });

    return () => {
      cancelled = true;
      socket?.close();
    };
  }, [canConnect, nickname, playerId, roomCode]);

  return { connected: canConnect && socketConnected };
}
