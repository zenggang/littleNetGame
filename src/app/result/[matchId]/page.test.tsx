import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

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
      final_event_log: [],
    });

    render(<ResultPage />);

    await screen.findByText("红队胜利");
    await user.click(screen.getByRole("button", { name: "再来一局" }));

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/room/ABCD");
      expect(restartRoom).not.toHaveBeenCalled();
    });
  });
});
