import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createRoom as createDemoRoom,
  readPlayerSession as readDemoPlayerSession,
} from "@/lib/demo/store";

class FakeSocket {
  readyState = 0;
  private listeners = new Map<string, Set<(event?: unknown) => void>>();

  addEventListener(type: string, listener: (event?: unknown) => void) {
    const entries = this.listeners.get(type) ?? new Set();
    entries.add(listener);
    this.listeners.set(type, entries);
  }

  close = vi.fn(() => {
    this.readyState = 3;
  });

  send = vi.fn();

  emitOpen() {
    this.readyState = 1;
    this.listeners.get("open")?.forEach((listener) => listener());
  }

  emitClose() {
    this.readyState = 3;
    this.listeners.get("close")?.forEach((listener) => listener());
  }

  emitMessage(data: unknown) {
    this.listeners.get("message")?.forEach((listener) =>
      listener({ data: JSON.stringify(data) }),
    );
  }
}

const { openCoordinatorSocket } = vi.hoisted(() => ({
  openCoordinatorSocket: vi.fn(),
}));

vi.mock("@/lib/game/client/coordinator-client", () => ({
  openCoordinatorSocket,
}));

import { createRoomSocketFactory, useRoomSession } from "@/lib/game/client/use-room-session";

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe("useRoomSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    openCoordinatorSocket.mockReset();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://supabase.example.com";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
    window.localStorage.clear();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  });

  it("forwards room session input to the room socket opener", async () => {
    const openSocket = vi.fn(
      async () => ({ close: vi.fn() }) as unknown as WebSocket,
    );
    const factory = createRoomSocketFactory(openSocket);

    await factory({
      roomCode: "ABCD",
      playerId: "player-1",
      nickname: "阿杰",
    });

    expect(openSocket).toHaveBeenCalledWith({
      roomCode: "ABCD",
      playerId: "player-1",
      nickname: "阿杰",
    });
  });

  it("reconnects after socket close and accepts the latest room snapshot", async () => {
    const firstSocket = new FakeSocket();
    const secondSocket = new FakeSocket();

    openCoordinatorSocket
      .mockResolvedValueOnce(firstSocket as unknown as WebSocket)
      .mockResolvedValueOnce(secondSocket as unknown as WebSocket);

    const { result } = renderHook(() =>
      useRoomSession({
        roomCode: "ABCD",
        playerId: "player-1",
        nickname: "阿杰",
      }),
    );

    await flushAsyncWork();
    expect(openCoordinatorSocket).toHaveBeenCalledTimes(1);

    act(() => {
      firstSocket.emitOpen();
      firstSocket.emitMessage({
        type: "room.snapshot",
        payload: {
          room: {
            id: "room-1",
            code: "ABCD",
            gradeLabel: "小学二年级",
            capacity: 2,
            hostPlayerId: "player-1",
            status: "open",
            activeMatchId: null,
            createdAt: "2026-04-16T10:00:00.000Z",
          },
          members: [
            {
              playerId: "player-1",
              nickname: "阿杰",
              team: "red",
              joinedAt: "2026-04-16T10:00:00.000Z",
            },
          ],
          match: null,
          viewer: {
            playerId: "player-1",
            nickname: "阿杰",
            team: "red",
            joinedAt: "2026-04-16T10:00:00.000Z",
          },
          canStart: false,
          session: {
            playerId: "player-1",
            nickname: "阿杰",
          },
        },
      });
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.snapshot?.viewer?.team).toBe("red");

    act(() => {
      firstSocket.emitClose();
      vi.advanceTimersByTime(650);
    });

    await flushAsyncWork();
    expect(openCoordinatorSocket).toHaveBeenCalledTimes(2);

    act(() => {
      secondSocket.emitOpen();
      secondSocket.emitMessage({
        type: "room.snapshot",
        payload: {
          room: {
            id: "room-1",
            code: "ABCD",
            gradeLabel: "小学二年级",
            capacity: 2,
            hostPlayerId: "player-1",
            status: "locked",
            activeMatchId: "match-1",
            createdAt: "2026-04-16T10:00:00.000Z",
          },
          members: [
            {
              playerId: "player-1",
              nickname: "阿杰",
              team: "blue",
              joinedAt: "2026-04-16T10:00:00.000Z",
            },
          ],
          match: null,
          viewer: {
            playerId: "player-1",
            nickname: "阿杰",
            team: "blue",
            joinedAt: "2026-04-16T10:00:00.000Z",
          },
          canStart: true,
          session: {
            playerId: "player-1",
            nickname: "阿杰",
          },
        },
      });
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.snapshot?.room?.activeMatchId).toBe("match-1");
    expect(result.current.snapshot?.viewer?.team).toBe("blue");
  });

  it("falls back to the local demo room session when supabase env is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const room = createDemoRoom({ capacity: 2, nickname: "阿杰" });
    const session = readDemoPlayerSession();

    const { result } = renderHook(() =>
      useRoomSession({
        roomCode: room.code,
        playerId: session?.playerId ?? "",
        nickname: session?.nickname ?? "",
      }),
    );

    await flushAsyncWork();

    expect(openCoordinatorSocket).not.toHaveBeenCalled();
    expect(result.current.connected).toBe(true);
    expect(result.current.snapshot?.room?.code).toBe(room.code);
    expect(result.current.snapshot?.viewer?.nickname).toBe("阿杰");
  });

  it("adopts a fresher parent snapshot when realtime misses a room member update", async () => {
    const socket = new FakeSocket();

    openCoordinatorSocket.mockResolvedValue(socket as unknown as WebSocket);

    const hostOnlySnapshot = {
      room: {
        id: "room-1",
        code: "ABCD",
        gradeLabel: "小学二年级",
        capacity: 2 as const,
        hostPlayerId: "player-1",
        status: "open" as const,
        activeMatchId: null,
        createdAt: "2026-04-16T10:00:00.000Z",
      },
      members: [
        {
          playerId: "player-1",
          nickname: "阿杰",
          team: "red" as const,
          joinedAt: "2026-04-16T10:00:00.000Z",
        },
      ],
      match: null,
      viewer: {
        playerId: "player-1",
        nickname: "阿杰",
        team: "red" as const,
        joinedAt: "2026-04-16T10:00:00.000Z",
      },
      canStart: false,
      session: {
        playerId: "player-1",
        nickname: "阿杰",
      },
    };

    const fullSnapshot = {
      ...hostOnlySnapshot,
      members: [
        ...hostOnlySnapshot.members,
        {
          playerId: "player-2",
          nickname: "小蓝",
          team: "blue" as const,
          joinedAt: "2026-04-16T10:00:05.000Z",
        },
      ],
      canStart: true,
    };

    const { result, rerender } = renderHook(
      ({ initialSnapshot }) =>
        useRoomSession({
          roomCode: "ABCD",
          playerId: "player-1",
          nickname: "阿杰",
          initialSnapshot,
        }),
      {
        initialProps: {
          initialSnapshot: hostOnlySnapshot,
        },
      },
    );

    await flushAsyncWork();
    act(() => {
      socket.emitOpen();
    });

    expect(result.current.snapshot?.members).toHaveLength(1);
    expect(result.current.snapshot?.canStart).toBe(false);

    rerender({
      initialSnapshot: fullSnapshot,
    });

    await flushAsyncWork();
    expect(result.current.snapshot?.members).toHaveLength(2);
    expect(result.current.snapshot?.members[1]?.nickname).toBe("小蓝");
    expect(result.current.snapshot?.canStart).toBe(true);
  });
});
