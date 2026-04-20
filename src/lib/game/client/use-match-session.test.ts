import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createRoom as createDemoRoom,
  getMatchSnapshot as getDemoMatchSnapshot,
  readPlayerSession as readDemoPlayerSession,
  startMatch as startDemoMatch,
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

import { createMatchSocketFactory, useMatchSession } from "@/lib/game/client/use-match-session";

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve();
  });
}

function createActiveCoordinatorSnapshot() {
  return {
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
    members: [],
    viewer: {
      playerId: "player-1",
      nickname: "阿杰",
      team: "red",
      joinedAt: "2026-04-16T10:00:00.000Z",
    },
    session: {
      playerId: "player-1",
      nickname: "阿杰",
    },
    match: {
      id: "match-1",
      roomCode: "ABCD",
      mode: "1v1",
      phase: "active",
      teams: {
        red: { name: "red", hpMax: 100, hpCurrent: 100, damageMultiplier: 1 },
        blue: { name: "blue", hpMax: 100, hpCurrent: 92, damageMultiplier: 1 },
      },
      totalCorrect: { red: 1, blue: 0 },
      currentQuestion: {
        key: "q-1",
        difficulty: 2,
        type: "addition",
        prompt: "27 + 15 = ?",
        answerKind: "single-number",
        damage: 8,
        correctAnswer: { value: 42 },
        meta: {},
      },
      questionIndex: 2,
      questionDeadlineAt: "2099-04-16T10:00:08.000Z",
      countdownEndsAt: "2026-04-16T10:00:03.000Z",
      endsAt: "2099-04-16T10:01:03.000Z",
      recentPrompts: ["27 + 15 = ?"],
      winner: null,
      winReason: null,
      lastHitTeam: "red",
      cooldowns: {},
      events: [],
      createdAt: "2026-04-16T10:00:00.000Z",
      endedAt: null,
      protocolSeq: 0,
    },
  };
}

describe("useMatchSession", () => {
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

  it("forwards match session input to the match socket opener", async () => {
    const openSocket = vi.fn(
      async () => ({ close: vi.fn() }) as unknown as WebSocket,
    );
    const factory = createMatchSocketFactory(openSocket);

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

  it("clears stale match state when the room snapshot no longer has an active match", async () => {
    const socket = new FakeSocket();

    openCoordinatorSocket.mockResolvedValue(socket as unknown as WebSocket);

    const { result } = renderHook(() =>
      useMatchSession({
        roomCode: "ABCD",
        playerId: "player-1",
        nickname: "阿杰",
      }),
    );

    await flushAsyncWork();

    act(() => {
      socket.emitOpen();
      socket.emitMessage({
        type: "match.snapshot",
        payload: createActiveCoordinatorSnapshot(),
      });
    });

    expect(result.current.snapshot?.match?.id).toBe("match-1");

    act(() => {
      const current = createActiveCoordinatorSnapshot();
      socket.emitMessage({
        type: "room.snapshot",
        payload: {
          ...current,
          room: {
            ...current.room,
            status: "open",
            activeMatchId: null,
          },
          match: null,
        },
      });
    });

    expect(result.current.snapshot?.match).toBeNull();
  });

  it("sends a match tick command through the coordinator socket", async () => {
    const socket = new FakeSocket();

    openCoordinatorSocket.mockResolvedValue(socket as unknown as WebSocket);

    const { result } = renderHook(() =>
      useMatchSession({
        roomCode: "ABCD",
        playerId: "player-1",
        nickname: "阿杰",
      }),
    );

    await flushAsyncWork();

    act(() => {
      socket.emitOpen();
    });

    void result.current.tickMatch().catch(() => undefined);

    expect(socket.send).toHaveBeenCalledWith(
      expect.stringContaining("\"type\":\"match.tick\""),
    );
  });

  it("applies match events without waiting for a fresh snapshot", async () => {
    const socket = new FakeSocket();

    openCoordinatorSocket.mockResolvedValue(socket as unknown as WebSocket);

    const { result } = renderHook(() =>
      useMatchSession({
        roomCode: "ABCD",
        playerId: "player-1",
        nickname: "阿杰",
      }),
    );

    await flushAsyncWork();

    act(() => {
      socket.emitOpen();
      socket.emitMessage({
        type: "match.snapshot",
        payload: createActiveCoordinatorSnapshot(),
      });
      socket.emitMessage({
        type: "match.event",
        payload: {
          seq: 1,
          type: "match.answer_resolved",
          serverTime: Date.parse("2026-04-16T10:00:04.000Z"),
          payload: {
            attackerTeam: "red",
            targetTeam: "blue",
            damage: 8,
            hp: {
              red: 100,
              blue: 84,
            },
          },
        },
      });
    });

    expect(result.current.snapshot?.match?.teams.blue.hpCurrent).toBe(84);
    expect(result.current.snapshot?.match?.totalCorrect.red).toBe(2);
    expect(result.current.snapshot?.match?.lastHitTeam).toBe("red");
    expect(result.current.snapshot?.match?.protocolSeq).toBe(1);
    expect(result.current.snapshot?.match?.events[0]).toMatchObject({
      type: "answer_correct",
      team: "red",
      targetTeam: "blue",
      damage: 8,
    });
    expect(result.current.snapshot?.match?.events[1]).toMatchObject({
      type: "hp_changed",
      team: "red",
      targetTeam: "blue",
      damage: 8,
    });
  });

  it("applies wrong-answer penalty events and cooldown locally", async () => {
    const socket = new FakeSocket();

    openCoordinatorSocket.mockResolvedValue(socket as unknown as WebSocket);

    const { result } = renderHook(() =>
      useMatchSession({
        roomCode: "ABCD",
        playerId: "player-1",
        nickname: "阿杰",
      }),
    );

    await flushAsyncWork();

    act(() => {
      socket.emitOpen();
      socket.emitMessage({
        type: "match.snapshot",
        payload: createActiveCoordinatorSnapshot(),
      });
      socket.emitMessage({
        type: "match.event",
        payload: {
          seq: 1,
          type: "match.answer_rejected",
          serverTime: Date.parse("2026-04-16T10:00:04.000Z"),
          payload: {
            playerId: "player-1",
            team: "red",
            damage: 4,
            cooldownUntil: Date.parse("2026-04-16T10:00:05.000Z"),
            hp: {
              red: 96,
              blue: 92,
            },
          },
        },
      });
    });

    expect(result.current.snapshot?.match?.teams.red.hpCurrent).toBe(96);
    expect(result.current.snapshot?.match?.cooldowns["player-1"]).toBe(
      Date.parse("2026-04-16T10:00:05.000Z"),
    );
    expect(result.current.snapshot?.match?.protocolSeq).toBe(1);
    expect(result.current.snapshot?.match?.events[0]).toMatchObject({
      type: "answer_wrong",
      team: "red",
      targetTeam: "red",
      damage: 4,
    });
    expect(result.current.snapshot?.match?.events[1]).toMatchObject({
      type: "hp_changed",
      team: "red",
      targetTeam: "red",
      damage: 4,
    });
  });

  it("requests a sync when event seq jumps forward", async () => {
    const socket = new FakeSocket();

    openCoordinatorSocket.mockResolvedValue(socket as unknown as WebSocket);

    const { result } = renderHook(() =>
      useMatchSession({
        roomCode: "ABCD",
        playerId: "player-1",
        nickname: "阿杰",
      }),
    );

    await flushAsyncWork();

    act(() => {
      socket.emitOpen();
      socket.emitMessage({
        type: "match.snapshot",
        payload: {
          ...createActiveCoordinatorSnapshot(),
          match: {
            ...createActiveCoordinatorSnapshot().match,
            protocolSeq: 1,
          },
        },
      });
      socket.emitMessage({
        type: "match.event",
        payload: {
          seq: 3,
          type: "match.finished",
          serverTime: Date.parse("2026-04-16T10:00:40.000Z"),
          payload: {
            winner: "red",
            reason: "hp_zero",
          },
        },
      });
    });

    expect(socket.send).toHaveBeenCalledWith(
      expect.stringContaining("\"type\":\"sync.request\""),
    );
    expect(result.current.snapshot?.match?.phase).toBe("active");
    expect(result.current.snapshot?.match?.protocolSeq).toBe(1);
  });

  it("requests a sync when an unknown seq baseline receives a later event", async () => {
    const socket = new FakeSocket();

    openCoordinatorSocket.mockResolvedValue(socket as unknown as WebSocket);

    renderHook(() =>
      useMatchSession({
        roomCode: "ABCD",
        playerId: "player-1",
        nickname: "阿杰",
      }),
    );

    await flushAsyncWork();

    act(() => {
      socket.emitOpen();
      socket.emitMessage({
        type: "match.snapshot",
        payload: createActiveCoordinatorSnapshot(),
      });
      socket.emitMessage({
        type: "match.event",
        payload: {
          seq: 5,
          type: "match.finished",
          serverTime: Date.parse("2026-04-16T10:00:40.000Z"),
          payload: {
            winner: "red",
            reason: "hp_zero",
          },
        },
      });
    });

    expect(socket.send).toHaveBeenCalledWith(
      expect.stringContaining("\"type\":\"sync.request\""),
    );
  });

  it("clears stale match state when the room is reopened by another player", async () => {
    const socket = new FakeSocket();

    openCoordinatorSocket.mockResolvedValue(socket as unknown as WebSocket);

    const { result } = renderHook(() =>
      useMatchSession({
        roomCode: "ABCD",
        playerId: "player-1",
        nickname: "阿杰",
      }),
    );

    await flushAsyncWork();

    act(() => {
      socket.emitOpen();
      socket.emitMessage({
        type: "match.snapshot",
        payload: createActiveCoordinatorSnapshot(),
      });
      socket.emitMessage({
        type: "room.event",
        payload: {
          type: "room.reopened",
          payload: {
            canStart: true,
            clearMatch: true,
          },
        },
      });
    });

    expect(result.current.snapshot?.room?.status).toBe("open");
    expect(result.current.snapshot?.room?.activeMatchId).toBeNull();
    expect(result.current.snapshot?.match).toBeNull();
  });


  it("reconnects after socket close and refreshes the latest match snapshot", async () => {
    const firstSocket = new FakeSocket();
    const secondSocket = new FakeSocket();

    openCoordinatorSocket
      .mockResolvedValueOnce(firstSocket as unknown as WebSocket)
      .mockResolvedValueOnce(secondSocket as unknown as WebSocket);

    const { result } = renderHook(() =>
      useMatchSession({
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
        type: "match.snapshot",
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
          members: [],
          viewer: {
            playerId: "player-1",
            nickname: "阿杰",
            team: "red",
            joinedAt: "2026-04-16T10:00:00.000Z",
          },
          session: {
            playerId: "player-1",
            nickname: "阿杰",
          },
          match: {
            id: "match-1",
            roomCode: "ABCD",
            mode: "1v1",
            phase: "active",
            teams: {
              red: { name: "red", hpMax: 100, hpCurrent: 100, damageMultiplier: 1 },
              blue: { name: "blue", hpMax: 100, hpCurrent: 92, damageMultiplier: 1 },
            },
            totalCorrect: { red: 1, blue: 0 },
            currentQuestion: {
              key: "q-1",
              difficulty: 2,
              type: "addition",
              prompt: "27 + 15 = ?",
              answerKind: "single-number",
              damage: 8,
              correctAnswer: { value: 42 },
              meta: {},
            },
            questionIndex: 2,
            questionDeadlineAt: "2099-04-16T10:00:08.000Z",
            countdownEndsAt: "2026-04-16T10:00:03.000Z",
            endsAt: "2099-04-16T10:01:03.000Z",
            recentPrompts: ["27 + 15 = ?"],
            winner: null,
            winReason: null,
            lastHitTeam: "red",
            cooldowns: {},
            events: [],
            createdAt: "2026-04-16T10:00:00.000Z",
            endedAt: null,
            protocolSeq: 0,
          },
        },
      });
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.snapshot?.match?.teams.blue.hpCurrent).toBe(92);

    act(() => {
      firstSocket.emitClose();
      vi.advanceTimersByTime(650);
    });

    await flushAsyncWork();
    expect(openCoordinatorSocket).toHaveBeenCalledTimes(2);

    act(() => {
      secondSocket.emitOpen();
      secondSocket.emitMessage({
        type: "match.snapshot",
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
          members: [],
          viewer: {
            playerId: "player-1",
            nickname: "阿杰",
            team: "red",
            joinedAt: "2026-04-16T10:00:00.000Z",
          },
          session: {
            playerId: "player-1",
            nickname: "阿杰",
          },
          match: {
            id: "match-1",
            roomCode: "ABCD",
            mode: "1v1",
            phase: "finished",
            teams: {
              red: { name: "red", hpMax: 100, hpCurrent: 88, damageMultiplier: 1 },
              blue: { name: "blue", hpMax: 100, hpCurrent: 0, damageMultiplier: 1 },
            },
            totalCorrect: { red: 3, blue: 1 },
            currentQuestion: {
              key: "q-2",
              difficulty: 3,
              type: "multiplication",
              prompt: "6 × 4 = ?",
              answerKind: "single-number",
              damage: 10,
              correctAnswer: { value: 24 },
              meta: {},
            },
            questionIndex: 3,
            questionDeadlineAt: "2099-04-16T10:00:18.000Z",
            countdownEndsAt: "2026-04-16T10:00:03.000Z",
            endsAt: "2099-04-16T10:01:03.000Z",
            recentPrompts: ["6 × 4 = ?"],
            winner: "red",
            winReason: "hp_zero",
            lastHitTeam: "red",
            cooldowns: {},
            events: [],
            createdAt: "2026-04-16T10:00:00.000Z",
            endedAt: "2026-04-16T10:00:52.000Z",
            protocolSeq: 4,
          },
        },
      });
    });

    expect(result.current.connected).toBe(true);
    expect(result.current.snapshot?.match?.phase).toBe("finished");
    expect(result.current.snapshot?.match?.winner).toBe("red");
  });

  it("uses the local demo match session and drives countdown into active phase", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const room = createDemoRoom({ capacity: 2, nickname: "阿杰" });
    const store = JSON.parse(
      window.localStorage.getItem("little-net-game:demo-store") ?? "{}",
    ) as {
      roomMembers: Record<string, Array<{
        playerId: string;
        nickname: string;
        team: "red" | "blue";
        joinedAt: string;
      }>>;
    };
    store.roomMembers[room.code].push({
      playerId: "guest-1",
      nickname: "小蓝",
      team: "blue",
      joinedAt: new Date().toISOString(),
    });
    window.localStorage.setItem("little-net-game:demo-store", JSON.stringify(store));

    const match = startDemoMatch(room.code);
    const session = readDemoPlayerSession();

    const { result } = renderHook(() =>
      useMatchSession({
        roomCode: room.code,
        playerId: session?.playerId ?? "",
        nickname: session?.nickname ?? "",
        initialSnapshot: getDemoMatchSnapshot(match.id) as never,
      }),
    );

    await flushAsyncWork();

    expect(openCoordinatorSocket).not.toHaveBeenCalled();
    expect(result.current.connected).toBe(true);
    expect(result.current.snapshot?.match?.id).toBe(match.id);
    expect(result.current.snapshot?.match?.phase).toBe("countdown");

    act(() => {
      vi.advanceTimersByTime(3_100);
    });
    await flushAsyncWork();

    expect(result.current.snapshot?.match?.phase).toBe("active");
  });
});
