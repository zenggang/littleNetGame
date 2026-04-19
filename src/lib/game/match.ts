import { getBalanceConfig } from "@/lib/game/config";
import type { MatchMode, TeamName, TeamState } from "@/lib/game/types";

export function createInitialTeams(
  mode: MatchMode,
  advantagedTeam: TeamName = "red",
): Record<TeamName, TeamState> {
  const config = getBalanceConfig(mode, advantagedTeam);

  return {
    red: {
      name: "red",
      hpMax: config.red.hp,
      hpCurrent: config.red.hp,
      damageMultiplier: config.red.damageMultiplier,
    },
    blue: {
      name: "blue",
      hpMax: config.blue.hp,
      hpCurrent: config.blue.hp,
      damageMultiplier: config.blue.damageMultiplier,
    },
  };
}

export function applyQuestionOutcome(input: {
  teams: Record<TeamName, TeamState>;
  attacker: TeamName | null;
  damage: number;
  wasCorrect: boolean;
  penaltyDamage: number;
}): {
  teams: Record<TeamName, TeamState>;
  winner: TeamName | null;
  reason: "hp_zero" | "timeout" | "correct";
} {
  const teams = {
    red: { ...input.teams.red },
    blue: { ...input.teams.blue },
  };

  if (input.wasCorrect && input.attacker) {
    const defender: TeamName = input.attacker === "red" ? "blue" : "red";
    const scaledDamage = Math.round(
      input.damage * teams[input.attacker].damageMultiplier,
    );

    teams[defender].hpCurrent = clampHp(
      teams[defender].hpCurrent - scaledDamage,
      teams[defender].hpMax,
    );

    return {
      teams,
      winner: pickWinner(teams, input.attacker),
      reason: teams[defender].hpCurrent === 0 ? "hp_zero" : "correct",
    };
  }

  teams.red.hpCurrent = clampHp(teams.red.hpCurrent - input.penaltyDamage, teams.red.hpMax);
  teams.blue.hpCurrent = clampHp(
    teams.blue.hpCurrent - input.penaltyDamage,
    teams.blue.hpMax,
  );

  return {
    teams,
    winner: pickWinner(teams, null),
    reason: teams.red.hpCurrent === 0 || teams.blue.hpCurrent === 0 ? "hp_zero" : "timeout",
  };
}

/**
 * 答错惩罚是“单方自损”，和超时双方扣血、答对攻击对面都不是同一种结算。
 * 这里单独收口，避免调用方用 timeout 分支模拟答错时误伤双方或污染胜负归因。
 */
export function applyTeamPenalty(input: {
  teams: Record<TeamName, TeamState>;
  team: TeamName;
  penaltyDamage: number;
}): {
  teams: Record<TeamName, TeamState>;
  winner: TeamName | null;
  reason: "hp_zero" | "penalty";
} {
  const teams = {
    red: { ...input.teams.red },
    blue: { ...input.teams.blue },
  };

  teams[input.team].hpCurrent = clampHp(
    teams[input.team].hpCurrent - input.penaltyDamage,
    teams[input.team].hpMax,
  );

  return {
    teams,
    winner: pickWinner(teams, null),
    reason: teams[input.team].hpCurrent === 0 ? "hp_zero" : "penalty",
  };
}

function pickWinner(
  teams: Record<TeamName, TeamState>,
  attacker: TeamName | null,
): TeamName | null {
  if (teams.red.hpCurrent > 0 && teams.blue.hpCurrent > 0) {
    return null;
  }

  if (teams.red.hpCurrent === 0 && teams.blue.hpCurrent === 0) {
    return attacker;
  }

  return teams.red.hpCurrent > 0 ? "red" : "blue";
}

function clampHp(value: number, max: number): number {
  return Math.max(0, Math.min(max, value));
}
