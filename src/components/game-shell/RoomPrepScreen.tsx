import type { DemoMember } from "@/lib/demo/store";
import type { TeamName } from "@/lib/game/types";

type Props = {
  roomCode: string;
  roomLabel?: string;
  canStart: boolean;
  isHost: boolean;
  canJoinTeam?: boolean;
  redMembers: DemoMember[];
  blueMembers: DemoMember[];
  busy?: boolean;
  error?: string;
  waitingText?: string;
  onCopyCode?: () => void;
  onJoinTeam: (team: TeamName) => void;
  onStart: () => void;
};

function renderCampMembers(members: DemoMember[]) {
  if (members.length === 0) {
    return <li className="roomCampEmpty">还没人站这边</li>;
  }

  return members.map((member) => (
    <li key={member.playerId} className="roomCampMember">
      {member.nickname}
    </li>
  ));
}

export function RoomPrepScreen({
  roomCode,
  roomLabel = "",
  canStart,
  isHost,
  canJoinTeam = true,
  redMembers,
  blueMembers,
  busy = false,
  error = "",
  waitingText = "等待房主开始。你可以继续编队。",
  onCopyCode,
  onJoinTeam,
  onStart,
}: Props) {
  return (
    <section className="roomPrepShell">
      <header className="roomPrepHeader">
        <div className="roomPrepHeaderCopy">
          <p className="roomPrepCode">房间 {roomCode}</p>
          {roomLabel ? <p className="roomPrepLabel">{roomLabel}</p> : null}
        </div>
        <button className="ghostButton" onClick={onCopyCode} type="button">
          复制 / 邀请
        </button>
      </header>

      <div className="roomPrepBattlefield">
        <div className="roomPrepStatus">
          <span>战前编队</span>
          <strong>{canStart ? "可开战" : "继续编队"}</strong>
        </div>

        <div className="roomCampGrid">
          <article className="roomCamp roomCampRed">
            <h2>红队营地</h2>
            <ul className="roomCampMembers">{renderCampMembers(redMembers)}</ul>
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
            VS
          </div>

          <article className="roomCamp roomCampBlue">
            <h2>蓝队营地</h2>
            <ul className="roomCampMembers">{renderCampMembers(blueMembers)}</ul>
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
        <button className="primaryButton" disabled={!canStart || busy} onClick={onStart} type="button">
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
