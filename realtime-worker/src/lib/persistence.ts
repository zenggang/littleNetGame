import { insertMatchReport } from "./supabase-admin";

type PersistenceEnv = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

export async function persistMatchReport(
  env: PersistenceEnv,
  input: {
    matchId: string;
    roomCode: string;
    winnerTeam: "red" | "blue";
    winReason: "hp_zero" | "time_up";
    durationMs: number;
    totalCorrect: Record<"red" | "blue", number>;
    finalHp: Record<"red" | "blue", number>;
    finalEventLog: unknown[];
  },
) {
  await insertMatchReport(env, input);
}
