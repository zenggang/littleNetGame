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

  it("keeps the create flow capacity choices inside the create modal", async () => {
    const user = userEvent.setup();
    const onCapacityChange = vi.fn();

    render(
      <GameHallScreen
        capacity={2}
        nickname="阿杰"
        onCapacityChange={onCapacityChange}
        onCreate={vi.fn()}
        onJoin={vi.fn()}
        onNicknameChange={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "创建游戏" }));

    expect(screen.getByRole("dialog", { name: "创建游戏" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "2 人房" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "6 人房" }));

    expect(onCapacityChange).toHaveBeenCalledWith(6);
  });

  it("shows visible submitting and error feedback inside the active modal", async () => {
    const user = userEvent.setup();
    const view = render(
      <GameHallScreen
        message=""
        nickname="阿杰"
        onCreate={vi.fn()}
        onJoin={vi.fn()}
        onNicknameChange={vi.fn()}
        roomCode="ABCD"
        submitting={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "加入游戏" }));

    view.rerender(
      <GameHallScreen
        message="没找到这个房间。"
        nickname="阿杰"
        onCreate={vi.fn()}
        onJoin={vi.fn()}
        onNicknameChange={vi.fn()}
        roomCode="ABCD"
        submitting
      />,
    );

    expect(screen.getByText("没找到这个房间。")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "加入中..." })).toBeDisabled();
  });
});
