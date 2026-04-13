import type { DemoMember } from "@/lib/demo/store";
import type { TeamName } from "@/lib/game/types";

type TeamColumnProps = {
  team: TeamName;
  members: DemoMember[];
  activePlayerId: string | null;
  onJoin?: (team: TeamName) => void;
  locked?: boolean;
  emphasized?: boolean;
  hp?: {
    current: number;
    max: number;
  };
};

export function TeamColumn({
  team,
  members,
  activePlayerId,
  onJoin,
  locked = false,
  emphasized = false,
  hp,
}: TeamColumnProps) {
  const teamLabel = team === "red" ? "红队" : "蓝队";

  return (
    <section
      className={`teamColumn ${team} ${emphasized ? "emphasized" : ""}`}
      aria-label={teamLabel}
    >
      <header className="teamHeader">
        <div>
          <p className="teamLabel">{teamLabel}</p>
          <h3>{members.length} 人</h3>
        </div>
        {hp ? (
          <div className="teamHp">
            <strong>{hp.current}</strong>
            <span>/ {hp.max}</span>
          </div>
        ) : null}
      </header>

      <ul className="teamMembers">
        {members.map((member) => (
          <li
            key={member.playerId}
            className={member.playerId === activePlayerId ? "selfMember" : ""}
          >
            <span>{member.nickname}</span>
            {member.playerId === activePlayerId ? <em>我</em> : null}
          </li>
        ))}
        {members.length === 0 ? <li className="emptyMember">还没人站这边</li> : null}
      </ul>

      {onJoin ? (
        <button className="ghostButton" onClick={() => onJoin(team)} disabled={locked}>
          {locked ? "队伍已锁定" : `加入${teamLabel}`}
        </button>
      ) : null}
    </section>
  );
}
