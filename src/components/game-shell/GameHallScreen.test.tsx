import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GameHallScreen } from "@/components/game-shell/GameHallScreen";

describe("GameHallScreen", () => {
  it("opens the join modal from the main lobby action", async () => {
    const user = userEvent.setup();

    render(
      <GameHallScreen
        nickname="阿杰"
        onNicknameChange={vi.fn()}
        onCreate={vi.fn()}
        onJoin={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "加入游戏" }));

    expect(screen.getByRole("dialog", { name: "加入游戏" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入 4 位房间码")).toBeInTheDocument();
  });
});
