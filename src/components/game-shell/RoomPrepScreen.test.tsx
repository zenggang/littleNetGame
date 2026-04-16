import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { RoomPrepScreen } from "@/components/game-shell/RoomPrepScreen";

describe("RoomPrepScreen", () => {
  it("shows both camps and the host battle CTA", () => {
    render(
      <RoomPrepScreen
        blueMembers={[{ playerId: "2", nickname: "蓝一号", team: "blue", joinedAt: "" }]}
        canStart
        isHost
        onJoinTeam={vi.fn()}
        onStart={vi.fn()}
        redMembers={[{ playerId: "1", nickname: "红一号", team: "red", joinedAt: "" }]}
        roomCode="ABCD"
      />,
    );

    expect(screen.getByText("红队营地")).toBeInTheDocument();
    expect(screen.getByText("蓝队营地")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "房主开始对战" })).toBeEnabled();
  });
});
