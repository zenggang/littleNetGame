"use client";

import { useEffect, useRef, useState } from "react";

import { openCoordinatorSocket } from "@/lib/game/client/coordinator-client";
import {
  getRoomSnapshot,
  joinRoom as joinDemoRoom,
  startMatch as startDemoMatch,
  switchTeam as switchDemoTeam,
} from "@/lib/supabase/game-store";
import type {
  CoordinatorCommand,
  CoordinatorMessage,
  CoordinatorRoomSnapshot,
} from "@/lib/game/protocol/coordinator";
import type { TeamName } from "@/lib/game/types";
import { hasSupabaseEnvConfigured } from "@/lib/supabase/env";

type CommandResult = {
  ok: boolean;
  message: string;
  matchId?: string;
};

type PendingCommand = {
  resolve: (value: CommandResult) => void;
  reject: (reason?: unknown) => void;
};

type RoomCommand =
  | Omit<Extract<CoordinatorCommand, { type: "room.join" }>, "commandId">
  | Omit<Extract<CoordinatorCommand, { type: "room.switch_team" }>, "commandId">
  | Omit<Extract<CoordinatorCommand, { type: "room.start_match" }>, "commandId">;

export function createRoomSocketFactory(
  openSocket: typeof openCoordinatorSocket,
) {
  return async (input: {
    roomCode: string;
    playerId: string;
    nickname: string;
  }) => openSocket(input);
}

/**
 * RoomSession 负责把页面从 snapshot + subscribe 迁到协调层主导：
 * - socket 断开后自动重连
 * - 统一处理 room snapshot
 * - 统一把 join / switch / start 命令转成 command.result Promise
 */
export function useRoomSession(input: {
  roomCode: string;
  playerId: string;
  nickname: string;
  initialSnapshot?: CoordinatorRoomSnapshot | null;
}) {
  const { initialSnapshot = null, nickname, playerId, roomCode } = input;
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<CoordinatorRoomSnapshot | null>(initialSnapshot);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pendingRef = useRef(new Map<string, PendingCommand>());
  const canConnect = Boolean(playerId && nickname && roomCode);
  const useLocalDemoMode = !hasSupabaseEnvConfigured();

  useEffect(() => {
    if (!roomCode) {
      return;
    }

    if (useLocalDemoMode) {
      let disposed = false;

      const syncSnapshot = async () => {
        const nextSnapshot = await getRoomSnapshot(roomCode);

        if (disposed || !nextSnapshot.session) {
          setConnected(true);
          setSnapshot((nextSnapshot as CoordinatorRoomSnapshot | null));
          return;
        }

        setConnected(true);
        setSnapshot(nextSnapshot as CoordinatorRoomSnapshot);
      };

      void syncSnapshot();

      const handleStorage = () => {
        void syncSnapshot();
      };

      window.addEventListener("storage", handleStorage);
      window.addEventListener("little-net-game:demo-store-update", handleStorage as EventListener);

      return () => {
        disposed = true;
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("little-net-game:demo-store-update", handleStorage as EventListener);
      };
    }

    if (!canConnect) {
      return;
    }

    const openRoomSocket = createRoomSocketFactory(openCoordinatorSocket);
    let disposed = false;

    const rejectPending = (reason: string) => {
      pendingRef.current.forEach((pending) => {
        pending.reject(new Error(reason));
      });
      pendingRef.current.clear();
    };

    const scheduleReconnect = () => {
      if (disposed || reconnectTimerRef.current !== null) {
        return;
      }

      reconnectTimerRef.current = window.setTimeout(() => {
        reconnectTimerRef.current = null;
        void connect();
      }, 600);
    };

    const handleMessage = (event: MessageEvent<string>) => {
      const message = JSON.parse(event.data) as CoordinatorMessage;

      if (message.type === "room.snapshot") {
        setSnapshot(message.payload);
        return;
      }

      if (message.type === "command.result") {
        const pending = pendingRef.current.get(message.payload.commandId);

        if (!pending) {
          return;
        }

        pendingRef.current.delete(message.payload.commandId);
        pending.resolve(message.payload);
      }
    };

    const connect = async () => {
      const socket = await openRoomSocket({ roomCode, playerId, nickname });

      if (disposed) {
        socket.close();
        return;
      }

      socketRef.current = socket;
      socket.addEventListener("open", () => setConnected(true), { once: true });
      socket.addEventListener("message", handleMessage);
      socket.addEventListener("close", () => {
        setConnected(false);
        rejectPending("协调层连接已断开");
        scheduleReconnect();
      }, { once: true });
    };

    void connect();

    return () => {
      disposed = true;
      setConnected(false);
      rejectPending("房间会话已关闭");

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [canConnect, nickname, playerId, roomCode, useLocalDemoMode]);

  const sendCommand = (command: RoomCommand) =>
    new Promise<CommandResult>((resolve, reject) => {
      const socket = socketRef.current;

      if (!socket || socket.readyState !== WebSocket.OPEN) {
        reject(new Error("协调层未连接"));
        return;
      }

      const commandId = crypto.randomUUID();
      pendingRef.current.set(commandId, { resolve, reject });
      socket.send(JSON.stringify({ ...command, commandId }));
    });

  const sendLocalCommand = async (
    command: RoomCommand,
  ): Promise<CommandResult> => {
    if (command.type === "room.join") {
      await joinDemoRoom({
        roomCode,
        nickname: command.payload.nickname,
      });

      setSnapshot((await getRoomSnapshot(roomCode)) as CoordinatorRoomSnapshot);
      return { ok: true, message: "已进入房间" };
    }

    if (command.type === "room.switch_team") {
      await switchDemoTeam(roomCode, command.payload.team);
      setSnapshot((await getRoomSnapshot(roomCode)) as CoordinatorRoomSnapshot);
      return { ok: true, message: "已切换阵营" };
    }

    const match = await startDemoMatch(roomCode);
    setSnapshot((await getRoomSnapshot(roomCode)) as CoordinatorRoomSnapshot);
    return { ok: true, message: "对战开始", matchId: match.id };
  };

  return {
    connected,
    snapshot,
    joinRoom: (nextNickname: string) =>
      useLocalDemoMode
        ? sendLocalCommand({
            type: "room.join",
            payload: { nickname: nextNickname },
          })
        : sendCommand({
            type: "room.join",
            payload: { nickname: nextNickname },
          }),
    switchTeam: (team: TeamName) =>
      useLocalDemoMode
        ? sendLocalCommand({
            type: "room.switch_team",
            payload: { team },
          })
        : sendCommand({
            type: "room.switch_team",
            payload: { team },
          }),
    startMatch: () =>
      useLocalDemoMode
        ? sendLocalCommand({
            type: "room.start_match",
          })
        : sendCommand({
            type: "room.start_match",
          }),
  };
}
