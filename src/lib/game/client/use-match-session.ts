"use client";

import { useEffect, useRef, useState } from "react";

import { openCoordinatorSocket } from "@/lib/game/client/coordinator-client";
import type {
  CoordinatorCommand,
  CoordinatorMatchSnapshot,
  CoordinatorMessage,
} from "@/lib/game/protocol/coordinator";

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

  useEffect(() => {
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
  }, [canConnect, nickname, playerId, roomCode]);

  const sendCommand = (
    command: Omit<Extract<CoordinatorCommand, { type: "match.submit_answer" }>, "commandId">,
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

  return {
    connected,
    snapshot,
    submitAnswer: (answer: {
      value?: string;
      quotient?: string;
      remainder?: string;
    }) =>
      sendCommand({
        type: "match.submit_answer",
        payload: {
          answer,
        },
      }),
  };
}
