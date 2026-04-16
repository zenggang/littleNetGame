"use client";

import { useState } from "react";

import { GameEntryModal } from "@/components/game-shell/GameEntryModal";

type RoomCapacity = 2 | 3 | 4 | 6;

type Props = {
  capacity?: RoomCapacity;
  message?: string;
  nickname: string;
  roomCode?: string;
  submitting?: boolean;
  onCapacityChange?: (value: RoomCapacity) => void;
  onNicknameChange: (value: string) => void;
  onRoomCodeChange?: (value: string) => void;
  onCreate: () => void;
  onJoin: () => void;
};

export function GameHallScreen({
  capacity = 2,
  message = "",
  nickname,
  roomCode = "",
  submitting = false,
  onCapacityChange = () => undefined,
  onNicknameChange,
  onRoomCodeChange = () => undefined,
  onCreate,
  onJoin,
}: Props) {
  const [modal, setModal] = useState<null | "create" | "join">(null);

  return (
    <section className="gameHallShell">
      <div className="gameHallHero">
        <p className="gameHallTag">开房、拉人、列阵、开打</p>
        <h1>小小数学战场</h1>
        <input
          onChange={(event) => onNicknameChange(event.target.value)}
          placeholder="输入一个短昵称"
          value={nickname}
        />
      </div>

      <div className="gameHallActions">
        <button
          className="primaryButton"
          disabled={submitting}
          onClick={() => setModal("create")}
          type="button"
        >
          创建游戏
        </button>
        <button
          className="secondaryButton"
          disabled={submitting}
          onClick={() => setModal("join")}
          type="button"
        >
          加入游戏
        </button>
      </div>

      <GameEntryModal
        capacity={capacity}
        message={message}
        onClose={() => setModal(null)}
        onCapacityChange={onCapacityChange}
        onConfirm={onCreate}
        onRoomCodeChange={() => undefined}
        open={modal === "create"}
        roomCode=""
        submitting={submitting}
        title="创建游戏"
      />

      <GameEntryModal
        message={message}
        onClose={() => setModal(null)}
        onConfirm={onJoin}
        onRoomCodeChange={onRoomCodeChange}
        open={modal === "join"}
        roomCode={roomCode}
        submitting={submitting}
        title="加入游戏"
      />
    </section>
  );
}
