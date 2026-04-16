"use client";

type RoomCapacity = 2 | 3 | 4 | 6;

type GameEntryModalProps = {
  title: "创建游戏" | "加入游戏";
  open: boolean;
  capacity?: RoomCapacity;
  message?: string;
  roomCode: string;
  submitting?: boolean;
  onCapacityChange?: (value: RoomCapacity) => void;
  onRoomCodeChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

const ROOM_CAPACITY_OPTIONS: RoomCapacity[] = [2, 3, 4, 6];

export function GameEntryModal({
  title,
  open,
  capacity = 2,
  message = "",
  roomCode,
  submitting = false,
  onCapacityChange = () => undefined,
  onRoomCodeChange,
  onClose,
  onConfirm,
}: GameEntryModalProps) {
  if (!open) {
    return null;
  }

  const confirmLabel = submitting
    ? title === "创建游戏"
      ? "创建中..."
      : "加入中..."
    : title === "创建游戏"
      ? "立即建房"
      : "进入房间";

  return (
    <div className="gameModalBackdrop">
      <section aria-label={title} className="gameModalPanel" role="dialog">
        <header className="gameModalHeader">
          <h2>{title}</h2>
          <button disabled={submitting} onClick={onClose} type="button">
            关闭
          </button>
        </header>
        {title === "创建游戏" ? (
          <div className="gameCapacityGrid" role="group" aria-label="房间容量">
            {/* 建房仍沿用旧首页的 2/3/4/6 人容量，只是把选择入口收进了弹窗。 */}
            {ROOM_CAPACITY_OPTIONS.map((value) => (
              <button
                key={value}
                aria-pressed={capacity === value}
                className="gameCapacityButton"
                disabled={submitting}
                onClick={() => onCapacityChange(value)}
                type="button"
              >
                {value} 人房
              </button>
            ))}
          </div>
        ) : (
          <input
            disabled={submitting}
            onChange={(event) => onRoomCodeChange(event.target.value.toUpperCase())}
            placeholder="输入 4 位房间码"
            value={roomCode}
          />
        )}
        {message ? (
          <p aria-live="assertive" className="gameModalMessage" role="alert">
            {message}
          </p>
        ) : null}
        <button className="primaryButton" disabled={submitting} onClick={onConfirm} type="button">
          {confirmLabel}
        </button>
      </section>
    </div>
  );
}
