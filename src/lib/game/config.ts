import type { MatchMode, TeamConfig, TeamCounts, TeamName } from "@/lib/game/types";

export const ROOM_CAPACITIES = [2, 3, 4, 6] as const;

const BASE_BALANCE: Record<MatchMode, { advantaged: TeamConfig; standard: TeamConfig }> =
  {
    "1v1": {
      advantaged: { hp: 100, damageMultiplier: 1 },
      standard: { hp: 100, damageMultiplier: 1 },
    },
    "1v2": {
      advantaged: { hp: 120, damageMultiplier: 1.5 },
      standard: { hp: 100, damageMultiplier: 1 },
    },
    "1v3": {
      advantaged: { hp: 140, damageMultiplier: 1.8 },
      standard: { hp: 100, damageMultiplier: 1 },
    },
    "2v2": {
      advantaged: { hp: 100, damageMultiplier: 1 },
      standard: { hp: 100, damageMultiplier: 1 },
    },
    "3v3": {
      advantaged: { hp: 120, damageMultiplier: 1 },
      standard: { hp: 120, damageMultiplier: 1 },
    },
  };

export function resolveTeamCounts(teams: TeamName[]): TeamCounts {
  return teams.reduce<TeamCounts>(
    (counts, team) => {
      counts[team] += 1;
      return counts;
    },
    { red: 0, blue: 0 },
  );
}

export function detectMatchMode(teams: TeamCounts): MatchMode | null {
  const values = [teams.red, teams.blue].sort((left, right) => left - right);
  const key = `${values[0]}v${values[1]}` as MatchMode;

  if (values[0] === 0) {
    return null;
  }

  return key in BASE_BALANCE ? key : null;
}

export function canStartMatch(input: {
  capacity: number;
  teams: TeamCounts;
}): boolean {
  if (!ROOM_CAPACITIES.includes(input.capacity as (typeof ROOM_CAPACITIES)[number])) {
    return false;
  }

  const total = input.teams.red + input.teams.blue;
  if (total !== input.capacity) {
    return false;
  }

  return detectMatchMode(input.teams) !== null;
}

export function getBalanceConfig(
  mode: MatchMode,
  advantagedTeam: TeamName = "red",
): Record<TeamName, TeamConfig> {
  const entry = BASE_BALANCE[mode];

  if (mode === "1v1" || mode === "2v2" || mode === "3v3") {
    return {
      red: entry.standard,
      blue: entry.standard,
    };
  }

  const otherTeam: TeamName = advantagedTeam === "red" ? "blue" : "red";

  return {
    [advantagedTeam]: entry.advantaged,
    [otherTeam]: entry.standard,
  } as Record<TeamName, TeamConfig>;
}
