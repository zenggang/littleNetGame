import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  push,
  getMatchSnapshot,
  restartRoom,
  submitAnswer,
  matchSessionRestart,
  matchSessionSubmit,
  matchSessionSnapshot,
  stagePropsSpy,
} = vi.hoisted(() => ({
  push: vi.fn(),
  getMatchSnapshot: vi.fn(),
  restartRoom: vi.fn(),
  submitAnswer: vi.fn(),
  matchSessionRestart: vi.fn(),
  matchSessionSubmit: vi.fn(),
  matchSessionSnapshot: { current: null as Record<string, unknown> | null },
  stagePropsSpy: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ matchId: "match-1" }),
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/use-hydrated", () => ({
  useHydrated: () => true,
}));

vi.mock("@/components/battle-runtime/PhaserBattleStage", () => ({
  PhaserBattleStage: (props: Record<string, unknown>) => {
    stagePropsSpy(props);
    return <div>mock-stage</div>;
  },
}));

vi.mock("@/components/battle-runtime/BattleHud", () => ({
  BattleHud: ({
    children,
    prompt,
    hint,
  }: {
    children: React.ReactNode;
    prompt: string;
    hint: string;
  }) => (
    <div>
      <div>{prompt}</div>
      <div>{hint}</div>
      {children}
    </div>
  ),
}));

vi.mock("@/components/game/question-form", () => ({
  QuestionForm: () => <div>question-form</div>,
}));

vi.mock("@/lib/game/client/use-match-session", () => ({
  useMatchSession: () => ({
    connected: true,
    snapshot: matchSessionSnapshot.current,
    submitAnswer: matchSessionSubmit,
    restartRoom: matchSessionRestart,
  }),
}));

vi.mock("@/lib/supabase/game-store", () => ({
  getMatchSnapshot,
  restartRoom,
  submitAnswer,
  toUserMessage: (error: Error) => error.message,
}));

import BattlePage from "@/app/battle/[matchId]/page";
import { BATTLE_RESULT_REDIRECT_DELAY_MS } from "@/app/battle/[matchId]/page";

function createBattleSnapshot(
  overrides: Partial<Awaited<ReturnType<typeof getMatchSnapshot>>> = {},
) {
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
    },
    ...overrides,
  };
}

describe("BattlePage", () => {
  beforeEach(() => {
    push.mockReset();
    getMatchSnapshot.mockReset();
    restartRoom.mockReset();
    submitAnswer.mockReset();
    matchSessionRestart.mockReset();
    matchSessionSubmit.mockReset();
    stagePropsSpy.mockReset();

    const snapshot = createBattleSnapshot();
    getMatchSnapshot.mockResolvedValue(snapshot);
    matchSessionSnapshot.current = snapshot;
    matchSessionRestart.mockResolvedValue({ ok: true, message: "房间已重置" });
  });

  it("uses the coordinator restart command instead of the legacy restart RPC", async () => {
    const user = userEvent.setup();

    render(<BattlePage />);

    await screen.findByText("返回房间");
    await user.click(screen.getByRole("button", { name: "返回房间" }));

    await waitFor(() => {
      expect(matchSessionRestart).toHaveBeenCalled();
      expect(push).toHaveBeenCalledWith("/room/ABCD");
      expect(restartRoom).not.toHaveBeenCalled();
    });
  });

  it("holds the finishing scene briefly before navigating to the result page", async () => {
    let requestAnimationFrameSpy: ReturnType<typeof vi.spyOn> | null = null;
    let cancelAnimationFrameSpy: ReturnType<typeof vi.spyOn> | null = null;
    let setTimeoutSpy: ReturnType<typeof vi.spyOn> | null = null;

    try {
      const baseSnapshot = createBattleSnapshot();
      const snapshot = createBattleSnapshot({
        match: {
          ...baseSnapshot.match,
          phase: "finished",
          winner: "red",
          winReason: "hp_zero",
          endedAt: "2026-04-16T10:00:58.000Z",
        },
      });
      getMatchSnapshot.mockResolvedValue(snapshot);
      matchSessionSnapshot.current = snapshot;
      requestAnimationFrameSpy = vi
        .spyOn(window, "requestAnimationFrame")
        .mockImplementation((callback: FrameRequestCallback) => {
          callback(0);
          return 1;
        });
      cancelAnimationFrameSpy = vi
        .spyOn(window, "cancelAnimationFrame")
        .mockImplementation(() => undefined);
      setTimeoutSpy = vi.spyOn(window, "setTimeout");

      await act(async () => {
        render(<BattlePage />);
        await Promise.resolve();
      });

      expect(screen.getByText("返回房间")).toBeInTheDocument();
      expect(push).not.toHaveBeenCalled();
      const redirectTimer = setTimeoutSpy.mock.calls.find(([, delay]) => (
        delay === BATTLE_RESULT_REDIRECT_DELAY_MS
      ));

      expect(redirectTimer).toBeTruthy();
      expect(push).not.toHaveBeenCalled();

      await act(async () => {
        const callback = redirectTimer?.[0];

        if (typeof callback === "function") {
          callback();
        }
      });

      expect(push).toHaveBeenCalledWith("/result/match-1");
    } finally {
      setTimeoutSpy?.mockRestore();
      requestAnimationFrameSpy?.mockRestore();
      cancelAnimationFrameSpy?.mockRestore();
    }
  });
});
