type SupabaseAdminEnv = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

export async function insertMatchReport(
  env: SupabaseAdminEnv,
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
  const response = await fetch(`${env.SUPABASE_URL}/rest/v1/match_reports`, {
    method: "POST",
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      match_id: input.matchId,
      room_code: input.roomCode,
      winner_team: input.winnerTeam,
      win_reason: input.winReason,
      duration_ms: input.durationMs,
      total_correct: input.totalCorrect,
      final_hp: input.finalHp,
      final_event_log: input.finalEventLog,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to persist match report: ${response.status}`);
  }
}
