"use client";

type GameEntryModalProps = {
  title: "创建游戏" | "加入游戏";
  open: boolean;
  roomCode: string;
  onRoomCodeChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export function GameEntryModal({
  title,
  open,
  roomCode,
  onRoomCodeChange,
  onClose,
  onConfirm,
}: GameEntryModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="gameModalBackdrop">
      <section aria-label={title} className="gameModalPanel" role="dialog">
        <header className="gameModalHeader">
          <h2>{title}</h2>
          <button onClick={onClose} type="button">
            关闭
          </button>
        </header>
        {title === "加入游戏" ? (
          <input
            onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
            placeholder="输入 4 位房间码"
            value={roomCode}
          />
        ) : null}
        <button className="primaryButton" onClick={onConfirm} type="button">
          {title === "创建游戏" ? "立即建房" : "进入房间"}
        </button>
      </section>
    </div>
  );
}
