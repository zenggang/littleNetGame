import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import HomePage from "@/app/page";

const mocks = vi.hoisted(() => ({
  createRoom: vi.fn(),
  joinRoom: vi.fn(),
  push: vi.fn(),
  readPlayerSession: vi.fn(),
  toUserMessage: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mocks.push,
  }),
}));

vi.mock("@/lib/supabase/game-store", () => ({
  createRoom: mocks.createRoom,
  joinRoom: mocks.joinRoom,
  readPlayerSession: mocks.readPlayerSession,
  toUserMessage: mocks.toUserMessage,
}));

describe("HomePage", () => {
  beforeEach(() => {
    mocks.createRoom.mockReset();
    mocks.joinRoom.mockReset();
    mocks.push.mockReset();
    mocks.readPlayerSession.mockReset();
    mocks.toUserMessage.mockReset();
    mocks.readPlayerSession.mockResolvedValue(null);
  });

  it("creates a room with the selected capacity and routes to the returned room", async () => {
    const user = userEvent.setup();
    mocks.createRoom.mockResolvedValue({ code: "ZXCV" });

    render(<HomePage />);

    await user.type(screen.getByPlaceholderText("输入一个短昵称"), "阿杰");
    await user.click(screen.getByRole("button", { name: "创建游戏" }));
    await user.click(screen.getByRole("button", { name: "6 人房" }));
    await user.click(screen.getByRole("button", { name: "立即建房" }));

    await waitFor(() => {
      expect(mocks.createRoom).toHaveBeenCalledWith({ capacity: 6, nickname: "阿杰" });
    });
    expect(mocks.push).toHaveBeenCalledWith("/room/ZXCV");
  });

  it("joins using the trimmed uppercase room code and routes with the normalized code", async () => {
    const user = userEvent.setup();
    mocks.joinRoom.mockResolvedValue(undefined);

    render(<HomePage />);

    await user.type(screen.getByPlaceholderText("输入一个短昵称"), "阿杰");
    await user.click(screen.getByRole("button", { name: "加入游戏" }));
    await user.type(screen.getByPlaceholderText("输入 4 位房间码"), " abcd ");
    await user.click(screen.getByRole("button", { name: "进入房间" }));

    await waitFor(() => {
      expect(mocks.joinRoom).toHaveBeenCalledWith({ nickname: "阿杰", roomCode: "ABCD" });
    });
    expect(mocks.push).toHaveBeenCalledWith("/room/ABCD");
  });

  it("keeps failure feedback visible after the join modal closes", async () => {
    const user = userEvent.setup();
    mocks.joinRoom.mockRejectedValue(new Error("ROOM_NOT_FOUND"));
    mocks.toUserMessage.mockReturnValue("没找到这个房间。");

    render(<HomePage />);

    await user.type(screen.getByPlaceholderText("输入一个短昵称"), "阿杰");
    await user.click(screen.getByRole("button", { name: "加入游戏" }));
    await user.type(screen.getByPlaceholderText("输入 4 位房间码"), "abcd");
    await user.click(screen.getByRole("button", { name: "进入房间" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("没找到这个房间。");
    await user.click(screen.getByRole("button", { name: "关闭" }));

    expect(screen.queryByRole("dialog", { name: "加入游戏" })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("没找到这个房间。");
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
