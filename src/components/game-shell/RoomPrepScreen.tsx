import type { CSSProperties } from "react";

import type { DemoMember } from "@/lib/demo/store";
import { getAvailableGameAsset } from "@/lib/game/assets/asset-manifest";
import type { TeamName } from "@/lib/game/types";

type Props = {
  roomCode: string;
  roomLabel?: string;
  capacity?: number;
  canStart: boolean;
  isHost: boolean;
  canJoinTeam?: boolean;
  currentPlayerId?: string;
  redMembers: DemoMember[];
  blueMembers: DemoMember[];
  busy?: boolean;
  error?: string;
  waitingText?: string;
  onCopyCode?: () => void;
  onJoinTeam: (team: TeamName) => void;
  onStart: () => void;
};

const TEAM_SCENE = getAvailableGameAsset("scene.team.prepare");
const RED_PLATFORM = getAvailableGameAsset("units.platform.red.camp");
const BLUE_PLATFORM = getAvailableGameAsset("units.platform.blue.camp");
const VS_BADGE = getAvailableGameAsset("ui.badge.vs");

type RoomPrepStyle = CSSProperties & {
  "--room-team-bg": string;
  "--room-red-platform": string;
  "--room-blue-platform": string;
  "--room-vs-badge": string;
};

function renderCampMembers(
  members: DemoMember[],
  slotCount: number,
  currentPlayerId = "",
) {
  const emptySlots = Math.max(0, slotCount - members.length);

  return (
    <>
      {members.map((member) => (
        <li
          key={member.playerId}
          className="roomCampMember"
          data-current={member.playerId === currentPlayerId}
        >
          <span>{member.nickname}</span>
          {member.playerId === currentPlayerId ? <em>你</em> : null}
        </li>
      ))}
      {Array.from({ length: emptySlots }, (_, index) => (
        <li key={`empty-${index}`} className="roomCampEmpty">
          还没人站这边
        </li>
      ))}
    </>
  );
}

export function RoomPrepScreen({
  roomCode,
  roomLabel = "",
  capacity = 2,
  canStart,
  isHost,
  canJoinTeam = true,
  currentPlayerId = "",
  redMembers,
  blueMembers,
  busy = false,
  error = "",
  waitingText = "等待房主开始。你可以继续编队。",
  onCopyCode,
  onJoinTeam,
  onStart,
}: Props) {
  /**
   * 当前房间只暴露总容量，编队 UI 以每边 ceil(capacity / 2) 个槽位呈现。
   * 这保持了旧分队逻辑不变，同时让等待状态更像战前站位。
   */
  const campSlotCount = Math.max(1, Math.ceil(capacity / 2));
  const totalMembers = redMembers.length + blueMembers.length;

  return (
    <section
      className="roomPrepShell"
      data-scene-key={TEAM_SCENE.key}
      style={{
        "--room-team-bg": `url("${TEAM_SCENE.path}")`,
        "--room-red-platform": `url("${RED_PLATFORM.path}")`,
        "--room-blue-platform": `url("${BLUE_PLATFORM.path}")`,
        "--room-vs-badge": `url("${VS_BADGE.path}")`,
      } as RoomPrepStyle}
    >
      <header className="roomPrepHeader">
        <div className="roomPrepHeaderCopy">
          <p className="roomPrepCode">房间 {roomCode}</p>
          {roomLabel ? <p className="roomPrepLabel">{roomLabel}</p> : null}
        </div>
        <div className="roomPrepRoster">
          <span>已集结</span>
          <strong>
            {totalMembers}/{capacity}
          </strong>
        </div>
        <button className="ghostButton" onClick={onCopyCode} type="button">
          复制 / 邀请
        </button>
      </header>

      <div className="roomPrepBattlefield">
        <div className="roomPrepStatus">
          <span>战前编队室</span>
          <strong>{canStart ? "可开战" : "继续编队"}</strong>
        </div>

        <div className="roomCampGrid">
          <article className="roomCamp roomCampRed">
            <div className="roomCampHeader">
              <span>进攻阵营</span>
              <h2>红队营地</h2>
            </div>
            <ul className="roomCampMembers">
              {renderCampMembers(redMembers, campSlotCount, currentPlayerId)}
            </ul>
            <button
              className="ghostButton"
              disabled={!canJoinTeam || busy}
              onClick={() => onJoinTeam("red")}
              type="button"
            >
              {!canJoinTeam ? "先进入房间" : "加入红队"}
            </button>
          </article>

          <div className="roomCampVs" aria-hidden="true">
            <span>VS</span>
          </div>

          <article className="roomCamp roomCampBlue">
            <div className="roomCampHeader">
              <span>护盾阵营</span>
              <h2>蓝队营地</h2>
            </div>
            <ul className="roomCampMembers">
              {renderCampMembers(blueMembers, campSlotCount, currentPlayerId)}
            </ul>
            <button
              className="ghostButton"
              disabled={!canJoinTeam || busy}
              onClick={() => onJoinTeam("blue")}
              type="button"
            >
              {!canJoinTeam ? "先进入房间" : "加入蓝队"}
            </button>
          </article>
        </div>
      </div>

      {isHost ? (
        <button
          aria-label="房主开始对战"
          className="gamePaintButton gamePaintButtonRed roomHostStartButton"
          disabled={!canStart || busy}
          onClick={onStart}
          type="button"
        >
          房主开始对战
        </button>
      ) : (
        <p className="roomPrepHint">{waitingText}</p>
      )}

      {error ? (
        <p aria-live="assertive" className="roomPrepError" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
