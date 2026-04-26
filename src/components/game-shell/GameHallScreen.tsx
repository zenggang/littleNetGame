"use client";

import type { CSSProperties } from "react";
import { useState } from "react";
import Image from "next/image";

import { GameEntryModal } from "@/components/game-shell/GameEntryModal";
import { getAvailableGameAsset } from "@/lib/game/assets/asset-manifest";

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

const HALL_SCENE = getAvailableGameAsset("scene.home.main");
const HALL_LOGO = getAvailableGameAsset("ui.logo.main");

type GameHallStyle = CSSProperties & {
  "--game-hall-bg": string;
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
    <section
      className="gameHallShell"
      data-scene-key={HALL_SCENE.key}
      style={{
        "--game-hall-bg": `url("${HALL_SCENE.path}")`,
      } as GameHallStyle}
    >
      <div className="gameHallHero">
        <div className="gameHallCoverArt" aria-hidden="true" />
        <Image
          alt=""
          aria-hidden="true"
          className="gameHallLogo"
          height={116}
          priority
          src={HALL_LOGO.path}
          width={314}
        />
        <div className="gameHallTitleBlock">
          <h1>小小数学战场</h1>
          <p>开房 · 拉人 · 列阵 · 开打</p>
        </div>
      </div>

      <div className="gameHallActions">
        <button
          aria-label="创建游戏"
          className="gamePaintButton gamePaintButtonRed gameHallCreateButton"
          disabled={submitting}
          onClick={() => setModal("create")}
          type="button"
        >
          创建游戏
        </button>
        <button
          aria-label="加入游戏"
          className="gamePaintButton gamePaintButtonBlue gameHallJoinButton"
          disabled={submitting}
          onClick={() => setModal("join")}
          type="button"
        >
          加入游戏
        </button>
      </div>

      <label className="gameHallCommander">
        <span>指挥官</span>
        <input
          onChange={(event) => onNicknameChange(event.target.value)}
          placeholder="输入一个短昵称"
          value={nickname}
        />
      </label>

      {message ? (
        <p aria-live="polite" className="gameHallMessage" role="status">
          {message}
        </p>
      ) : null}

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
