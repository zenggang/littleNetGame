import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { writeCachedMatchReport } from "@/lib/game/result/local-report-cache";

const {
  push,
  getMatchReport,
  getMatchSnapshot,
  restartRoom,
} = vi.hoisted(() => ({
  push: vi.fn(),
  getMatchReport: vi.fn(),
  getMatchSnapshot: vi.fn(),
  restartRoom: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useParams: () => ({ matchId: "match-1" }),
  useRouter: () => ({ push }),
}));

vi.mock("@/lib/supabase/game-store", () => ({
  getMatchReport,
  getMatchSnapshot,
  restartRoom,
  toUserMessage: (error: Error) => error.message,
}));

import ResultPage from "@/app/result/[matchId]/page";

describe("ResultPage", () => {
  beforeEach(() => {
    push.mockReset();
    getMatchReport.mockReset();
    getMatchSnapshot.mockReset();
    restartRoom.mockReset();
    window.sessionStorage.clear();
  });

  it("routes back to the room for rematch without calling the legacy restart RPC", async () => {
    const user = userEvent.setup();
    getMatchReport.mockResolvedValue({
      room_code: "ABCD",
      winner_team: "red",
      win_reason: "hp_zero",
      duration_ms: 62_000,
      total_correct: { red: 6, blue: 4 },
      final_hp: { red: 32, blue: 0 },
      final_event_log: [
        {
          type: "answer_correct",
          text: "红队抢先答对了，发起进攻！",
          team: "red",
          targetTeam: "blue",
          damage: 10,
          createdAt: "2026-04-16T10:00:54.000Z",
        },
      ],
    });

    render(<ResultPage />);

    await screen.findByText("红队胜利");
    expect(screen.getByRole("main")).toHaveAttribute("data-scene-key", "scene.score.report");
    expect(screen.getByRole("main")).toHaveStyle({
      "--score-report-bg": 'url("/game-assets/scenes/score-bg.png")',
    });
    expect(screen.getByLabelText("关键战况")).toHaveTextContent("关键一击");
    expect(screen.getByLabelText("结算操作")).toHaveTextContent("再来一局");
    await user.click(screen.getByRole("button", { name: "再来一局" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/room/ABCD");
      expect(restartRoom).not.toHaveBeenCalled();
    });
  });

  it("uses the cached final report when the durable report query is unavailable", async () => {
    getMatchReport.mockRejectedValue(new Error("match_reports unavailable"));
    writeCachedMatchReport("match-1", {
      roomCode: "ABCD",
      winner: "blue",
      winReason: "time_up",
      teams: {
        red: { hpCurrent: 14 },
        blue: { hpCurrent: 28 },
      },
      totalCorrect: { red: 5, blue: 7 },
      durationMs: 63_000,
      finalEventLog: [],
    });

    render(<ResultPage />);

    expect(await screen.findByText("蓝队胜利")).toBeInTheDocument();
    expect(screen.getByText("Battle Report")).toBeInTheDocument();
    expect(screen.getAllByText("时间裁决")).toHaveLength(2);
    expect(screen.getByText("392")).toBeInTheDocument();
    expect(screen.getByText("784")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
    expect(getMatchSnapshot).not.toHaveBeenCalled();
  });
});
