"use client";

import { useEffect, useRef, useState } from "react";

import { openCoordinatorSocket } from "@/lib/game/client/coordinator-client";
import {
  getMatchSnapshot,
  restartRoom as restartDemoRoom,
  submitAnswer as submitDemoAnswer,
  tickMatch as tickDemoMatch,
} from "@/lib/supabase/game-store";
import type {
  CoordinatorCommand,
  CoordinatorMatchSnapshot,
  CoordinatorMessage,
} from "@/lib/game/protocol/coordinator";
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

export function createMatchSocketFactory(
  openSocket: typeof openCoordinatorSocket,
) {
  return async (input: {
    roomCode: string;
    playerId: string;
    nickname: string;
  }) => openSocket(input);
}

/**
 * MatchSession 把 battle 页需要的两类能力都收口在同一处：
 * - 维护 coordinator 推送的 match snapshot
 * - 负责 submit_answer 命令与弱网重连后的状态恢复
 */
export function useMatchSession(input: {
  roomCode: string;
  playerId: string;
  nickname: string;
  initialSnapshot?: CoordinatorMatchSnapshot | null;
}) {
  const { initialSnapshot = null, nickname, playerId, roomCode } = input;
  const [connected, setConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<CoordinatorMatchSnapshot | null>(initialSnapshot);
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
        const nextSnapshot = await getMatchSnapshot(initialSnapshot?.match?.id ?? "");

        if (disposed) {
          return;
        }

        setConnected(true);
        setSnapshot(nextSnapshot as CoordinatorMatchSnapshot);
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

    const openMatchSocket = createMatchSocketFactory(openCoordinatorSocket);
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

      if (message.type === "match.snapshot") {
        setSnapshot(message.payload);
        return;
      }

      if (message.type === "room.snapshot") {
        setSnapshot((current) => {
          if (!current) {
            return current;
          }

          return {
            ...current,
            room: message.payload.room,
            members: message.payload.members,
            match: message.payload.match,
            viewer: message.payload.viewer,
            session: message.payload.session,
          };
        });
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
      const socket = await openMatchSocket({ roomCode, playerId, nickname });

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
      rejectPending("对局会话已关闭");

      if (reconnectTimerRef.current !== null) {
        window.clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }

      socketRef.current?.close();
      socketRef.current = null;
    };
  }, [canConnect, initialSnapshot?.match?.id, nickname, playerId, roomCode, useLocalDemoMode]);

  useEffect(() => {
    if (!useLocalDemoMode) {
      return;
    }

    const matchId = snapshot?.match?.id;
    const match = snapshot?.match;
    const viewer = snapshot?.viewer;
    const room = snapshot?.room;

    if (!matchId || !match || !viewer || !room) {
      return;
    }

    if (viewer.playerId !== room.hostPlayerId || match.phase === "finished") {
      return;
    }

    let deadline = Date.parse(match.endsAt);

    if (match.phase === "countdown") {
      deadline = Date.parse(match.countdownEndsAt);
    }

    if (match.phase === "active") {
      deadline = Math.min(deadline, Date.parse(match.questionDeadlineAt));
    }

    const delay = Math.max(0, deadline - Date.now() + 50);
    const timer = window.setTimeout(() => {
      tickDemoMatch(matchId).catch(() => undefined);
    }, delay);

    return () => {
      window.clearTimeout(timer);
    };
  }, [snapshot, useLocalDemoMode]);

  const sendCommand = (
    command:
      | Omit<Extract<CoordinatorCommand, { type: "match.submit_answer" }>, "commandId">
      | Omit<Extract<CoordinatorCommand, { type: "room.restart" }>, "commandId">
      | Omit<Extract<CoordinatorCommand, { type: "match.tick" }>, "commandId">,
  ) =>
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
    command:
      | Omit<Extract<CoordinatorCommand, { type: "match.submit_answer" }>, "commandId">
      | Omit<Extract<CoordinatorCommand, { type: "room.restart" }>, "commandId">
      | Omit<Extract<CoordinatorCommand, { type: "match.tick" }>, "commandId">,
  ): Promise<CommandResult> => {
    const matchId = snapshot?.match?.id;

    if (command.type === "room.restart") {
      if (!roomCode) {
        throw new Error("ROOM_NOT_FOUND");
      }

      await restartDemoRoom(roomCode);
      setSnapshot((await getMatchSnapshot(matchId ?? "")) as CoordinatorMatchSnapshot);
      return { ok: true, message: "房间已重置" };
    }

    if (command.type === "match.tick") {
      if (!matchId) {
        throw new Error("MATCH_NOT_FOUND");
      }

      await tickDemoMatch(matchId);
      setSnapshot((await getMatchSnapshot(matchId)) as CoordinatorMatchSnapshot);
      return { ok: true, message: "已同步" };
    }

    if (!matchId) {
      throw new Error("MATCH_NOT_FOUND");
    }

    const result = await submitDemoAnswer(matchId, command.payload.answer);
    setSnapshot((await getMatchSnapshot(matchId)) as CoordinatorMatchSnapshot);
    return result;
  };

  return {
    connected,
    snapshot,
    submitAnswer: (answer: {
      value?: string;
      quotient?: string;
      remainder?: string;
    }) =>
      useLocalDemoMode
        ? sendLocalCommand({
            type: "match.submit_answer",
            payload: {
              answer,
            },
          })
        : sendCommand({
            type: "match.submit_answer",
            payload: {
              answer,
            },
          }),
    restartRoom: () =>
      useLocalDemoMode
        ? sendLocalCommand({
            type: "room.restart",
          })
        : sendCommand({
            type: "room.restart",
          }),
    tickMatch: () =>
      useLocalDemoMode
        ? sendLocalCommand({
            type: "match.tick",
          })
        : sendCommand({
            type: "match.tick",
          }),
  };
}
