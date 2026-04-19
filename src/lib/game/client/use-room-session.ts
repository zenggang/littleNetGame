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
  const [connectionError, setConnectionError] = useState("");
  const [snapshot, setSnapshot] = useState<CoordinatorRoomSnapshot | null>(initialSnapshot);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const pendingRef = useRef(new Map<string, PendingCommand>());
  const canConnect = Boolean(playerId && nickname && roomCode);
  const useLocalDemoMode = !hasSupabaseEnvConfigured();
  const resolvedSnapshot = resolvePreferredRoomSnapshot(snapshot, initialSnapshot);

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
          setConnectionError("");
          setSnapshot((nextSnapshot as CoordinatorRoomSnapshot | null));
          return;
        }

        setConnected(true);
        setConnectionError("");
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
      try {
        const socket = await openRoomSocket({ roomCode, playerId, nickname });

        if (disposed) {
          socket.close();
          return;
        }

        socketRef.current = socket;
        setConnectionError("");
        socket.addEventListener("open", () => {
          setConnected(true);
          setConnectionError("");
        }, { once: true });
        socket.addEventListener("message", handleMessage);
        socket.addEventListener("close", () => {
          setConnected(false);
          rejectPending("协调层连接已断开");
          scheduleReconnect();
        }, { once: true });
      } catch (error) {
        if (disposed) {
          return;
        }

        socketRef.current = null;
        setConnected(false);
        const message = error instanceof Error
          ? error.message
          : "COORDINATOR_CONNECT_BOOTSTRAP_FAILED";
        setConnectionError(message);

        if (message !== "COORDINATOR_NOT_READY") {
          scheduleReconnect();
        }
      }
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
        reject(new Error(connectionError || "协调层未连接"));
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
    connectionError,
    snapshot: resolvedSnapshot,
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

function resolvePreferredRoomSnapshot(
  liveSnapshot: CoordinatorRoomSnapshot | null,
  fetchedSnapshot: CoordinatorRoomSnapshot | null,
) {
  if (!liveSnapshot) {
    return fetchedSnapshot;
  }

  if (!fetchedSnapshot) {
    return liveSnapshot;
  }

  /**
   * websocket 是房间页的主通道，但移动端 WebView 偶发漏掉 room.snapshot 广播时，
   * 外层直接拉取回来的 snapshot 往往才是“更新后的真相”。
   *
   * 这里不盲目用 fetched 覆盖 live，而是只在它明显更“向前推进”时才接管：
   * - 成员数变多
   * - 已经拿到 activeMatchId
   *
   * 但 `canStart` 不能只靠 fetched 提前抬高。
   * 原因是开局动作最终仍由 coordinator 的权威房间态判定，
   * 如果这里只因为数据库快照“看起来凑齐了两边人数”就展示成可开战，
   * 页面会出现“按钮亮了，但点下去后端仍然返回 CANNOT_START”的错觉。
   */
  if (fetchedSnapshot.room?.activeMatchId && !liveSnapshot.room?.activeMatchId) {
    return fetchedSnapshot;
  }

  if (fetchedSnapshot.members.length > liveSnapshot.members.length) {
    return {
      ...fetchedSnapshot,
      canStart: liveSnapshot.canStart,
    };
  }

  return liveSnapshot;
}
