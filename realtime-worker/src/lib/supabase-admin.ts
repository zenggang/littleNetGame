import type { DemoMatch, DemoMember, DemoRoom } from "../../../src/lib/demo/store";
import type { TeamName } from "../../../src/lib/game/types";

type SupabaseAdminEnv = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
};

type RawRoomRow = {
  id: string;
  code: string;
  capacity: DemoRoom["capacity"];
  grade_label: string;
  host_player_id: string;
  status: DemoRoom["status"];
  active_match_id: string | null;
  created_at: string;
};

type RawRoomMemberRow = {
  room_id: string;
  player_id: string;
  team: TeamName;
  joined_at: string;
};

type RawProfileRow = {
  id: string;
  nickname: string;
};

type RawMatchRow = {
  id: string;
  room_id: string;
  mode: DemoMatch["mode"];
  phase: DemoMatch["phase"];
  winner_team: TeamName | null;
  win_reason: DemoMatch["winReason"];
  current_question_id: string | null;
  started_at: string;
  ends_at: string | null;
  ended_at: string | null;
  last_hit_team: TeamName | null;
};

type RawMatchTeamRow = {
  team: TeamName;
  hp_max: number;
  hp_current: number;
  damage_multiplier: number;
};

type RawMatchQuestionRow = {
  id: string;
  question_index: number;
  prompt: string;
  difficulty: number;
  question_type: string;
  answer_kind: "single-number" | "quotient-remainder";
  correct_answer: DemoMatch["currentQuestion"]["correctAnswer"];
  damage: number;
  deadline_at: string;
};

type LoadedCoordinatorState = {
  room: DemoRoom;
  members: DemoMember[];
  match: DemoMatch | null;
};

type MatchReportInput = {
  matchId: string;
  roomCode: string;
  winnerTeam: "red" | "blue";
  winReason: "hp_zero" | "time_up";
  durationMs: number;
  totalCorrect: Record<"red" | "blue", number>;
  finalHp: Record<"red" | "blue", number>;
  finalEventLog: unknown[];
};

/**
 * 这层只负责 coordinator 需要的最小 Supabase 管理能力：
 * 读房间冷启动、保存成员变更、记录开局、以及在结束时产出最终结果。
 * 高频实时推进不回写到数据库，避免把新的权威链路重新降级回旧 RPC/tick 架构。
 */
export async function loadCoordinatorState(
  env: SupabaseAdminEnv,
  roomCode: string,
): Promise<LoadedCoordinatorState | null> {
  const room = await selectSingle<RawRoomRow>(env, "rooms", {
    code: `eq.${roomCode}`,
    select: "*",
  });

  if (!room) {
    return null;
  }

  const memberRows = await selectMany<RawRoomMemberRow>(env, "room_members", {
    room_id: `eq.${room.id}`,
    select: "room_id,player_id,team,joined_at",
    order: "joined_at.asc",
  });

  const profiles = await loadProfiles(
    env,
    memberRows.map((member) => member.player_id),
  );
  const members = memberRows.map((member) => ({
    playerId: member.player_id,
    nickname: profiles.get(member.player_id) ?? "玩家",
    team: member.team,
    joinedAt: member.joined_at,
  }));

  const match = room.active_match_id
    ? await loadActiveMatch(env, room.code, room.active_match_id)
    : null;

  return {
    room: {
      id: room.id,
      code: room.code,
      gradeLabel: room.grade_label,
      capacity: room.capacity,
      hostPlayerId: room.host_player_id,
      status: room.status,
      activeMatchId: room.active_match_id,
      createdAt: room.created_at,
    },
    members,
    match,
  };
}

export async function upsertPlayerProfile(
  env: SupabaseAdminEnv,
  input: { playerId: string; nickname: string },
) {
  await request(env, "/rest/v1/player_profiles", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: input.playerId,
      nickname: input.nickname,
    }),
  });
}

export async function insertRoomMember(
  env: SupabaseAdminEnv,
  input: {
    roomId: string;
    playerId: string;
    team: TeamName;
    joinedAt: string;
  },
) {
  await request(env, "/rest/v1/room_members", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      room_id: input.roomId,
      player_id: input.playerId,
      team: input.team,
      joined_at: input.joinedAt,
    }),
  });
}

export async function updateRoomMemberTeam(
  env: SupabaseAdminEnv,
  input: {
    roomId: string;
    playerId: string;
    team: TeamName;
  },
) {
  await request(
    env,
    `/rest/v1/room_members?room_id=eq.${encodeURIComponent(input.roomId)}&player_id=eq.${encodeURIComponent(input.playerId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        team: input.team,
      }),
    },
  );
}

export async function persistMatchStart(
  env: SupabaseAdminEnv,
  input: {
    roomId: string;
    roomCode: string;
    match: DemoMatch;
    members: DemoMember[];
  },
) {
  await request(env, "/rest/v1/matches", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: input.match.id,
      room_id: input.roomId,
      mode: input.match.mode,
      phase: input.match.phase,
      started_at: input.match.createdAt,
      ends_at: input.match.endsAt,
      last_hit_team: input.match.lastHitTeam,
    }),
  });

  const teamCounts = buildTeamCounts(input.members);

  await request(env, "/rest/v1/match_teams", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify([
      {
        match_id: input.match.id,
        team: "red",
        member_count: teamCounts.red,
        hp_max: input.match.teams.red.hpMax,
        hp_current: input.match.teams.red.hpCurrent,
        damage_multiplier: input.match.teams.red.damageMultiplier,
      },
      {
        match_id: input.match.id,
        team: "blue",
        member_count: teamCounts.blue,
        hp_max: input.match.teams.blue.hpMax,
        hp_current: input.match.teams.blue.hpCurrent,
        damage_multiplier: input.match.teams.blue.damageMultiplier,
      },
    ]),
  });

  await insertMatchQuestion(env, input.match.id, input.match);
  await updateRoomMatchBinding(env, input.roomId, {
    status: "locked",
    activeMatchId: input.match.id,
  });
}

export async function markMatchActive(
  env: SupabaseAdminEnv,
  matchId: string,
) {
  await request(
    env,
    `/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        phase: "active",
      }),
    },
  );
}

export async function persistRoomReopened(
  env: SupabaseAdminEnv,
  roomId: string,
) {
  await updateRoomMatchBinding(env, roomId, {
    status: "open",
    activeMatchId: null,
  });
}

export async function persistMatchFinish(
  env: SupabaseAdminEnv,
  input: {
    roomId: string;
    match: DemoMatch;
  } & MatchReportInput,
) {
  await request(
    env,
    `/rest/v1/matches?id=eq.${encodeURIComponent(input.match.id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        phase: "finished",
        winner_team: input.winnerTeam,
        win_reason: input.winReason,
        ended_at: input.match.endedAt,
      }),
    },
  );

  await updateRoomMatchBinding(env, input.roomId, {
    status: "open",
    activeMatchId: null,
  });

  await insertMatchReport(env, input);
}

export async function insertMatchReport(
  env: SupabaseAdminEnv,
  input: MatchReportInput,
) {
  await request(env, "/rest/v1/match_reports", {
    method: "POST",
    headers: {
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
}

async function loadActiveMatch(
  env: SupabaseAdminEnv,
  roomCode: string,
  matchId: string,
): Promise<DemoMatch | null> {
  const match = await selectSingle<RawMatchRow>(env, "matches", {
    id: `eq.${matchId}`,
    select: "id,room_id,mode,phase,winner_team,win_reason,current_question_id,started_at,ends_at,ended_at,last_hit_team",
  });

  if (!match) {
    return null;
  }

  const teams = await selectMany<RawMatchTeamRow>(env, "match_teams", {
    match_id: `eq.${matchId}`,
    select: "team,hp_max,hp_current,damage_multiplier",
  });
  const currentQuestion = match.current_question_id
    ? await selectSingle<RawMatchQuestionRow>(env, "match_questions", {
        id: `eq.${match.current_question_id}`,
        select: "id,question_index,prompt,difficulty,question_type,answer_kind,correct_answer,damage,deadline_at",
      })
    : null;

  if (!currentQuestion) {
    return null;
  }

  return {
    id: match.id,
    roomCode,
    mode: match.mode,
    phase: match.phase,
    teams: {
      red: {
        name: "red",
        hpMax: teams.find((team) => team.team === "red")?.hp_max ?? 100,
        hpCurrent: teams.find((team) => team.team === "red")?.hp_current ?? 100,
        damageMultiplier:
          teams.find((team) => team.team === "red")?.damage_multiplier ?? 1,
      },
      blue: {
        name: "blue",
        hpMax: teams.find((team) => team.team === "blue")?.hp_max ?? 100,
        hpCurrent: teams.find((team) => team.team === "blue")?.hp_current ?? 100,
        damageMultiplier:
          teams.find((team) => team.team === "blue")?.damage_multiplier ?? 1,
      },
    },
    totalCorrect: { red: 0, blue: 0 },
    currentQuestion: {
      key: currentQuestion.id,
      difficulty: currentQuestion.difficulty as DemoMatch["currentQuestion"]["difficulty"],
      type: currentQuestion.question_type as DemoMatch["currentQuestion"]["type"],
      prompt: currentQuestion.prompt,
      answerKind: currentQuestion.answer_kind,
      damage: currentQuestion.damage,
      correctAnswer: currentQuestion.correct_answer,
      meta: {},
    },
    questionIndex: currentQuestion.question_index,
    questionDeadlineAt: currentQuestion.deadline_at,
    countdownEndsAt: new Date(
      Date.parse(match.started_at) + 3_000,
    ).toISOString(),
    endsAt: match.ends_at ?? new Date(Date.parse(match.started_at) + 63_000).toISOString(),
    recentPrompts: [currentQuestion.prompt],
    winner: match.winner_team,
    winReason: match.win_reason,
    lastHitTeam: match.last_hit_team,
    cooldowns: {},
    events: [],
    createdAt: match.started_at,
    endedAt: match.ended_at,
  };
}

async function insertMatchQuestion(
  env: SupabaseAdminEnv,
  matchId: string,
  match: DemoMatch,
) {
  await request(env, "/rest/v1/match_questions", {
    method: "POST",
    headers: {
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: match.currentQuestion.key,
      match_id: match.id,
      question_index: match.questionIndex,
      prompt: match.currentQuestion.prompt,
      difficulty: match.currentQuestion.difficulty,
      question_type: match.currentQuestion.type,
      answer_kind: match.currentQuestion.answerKind,
      correct_answer: match.currentQuestion.correctAnswer,
      damage: match.currentQuestion.damage,
      opens_at: match.phase === "countdown" ? match.countdownEndsAt : match.createdAt,
      deadline_at: match.questionDeadlineAt,
    }),
  });

  await request(
    env,
    `/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        current_question_id: match.currentQuestion.key,
      }),
    },
  );
}

async function updateRoomMatchBinding(
  env: SupabaseAdminEnv,
  roomId: string,
  input: {
    status: DemoRoom["status"];
    activeMatchId: string | null;
  },
) {
  await request(
    env,
    `/rest/v1/rooms?id=eq.${encodeURIComponent(roomId)}`,
    {
      method: "PATCH",
      body: JSON.stringify({
        status: input.status,
        active_match_id: input.activeMatchId,
      }),
    },
  );
}

async function loadProfiles(
  env: SupabaseAdminEnv,
  playerIds: string[],
): Promise<Map<string, string>> {
  if (playerIds.length === 0) {
    return new Map();
  }

  const profiles = await selectMany<RawProfileRow>(env, "player_profiles", {
    id: `in.(${playerIds.map((id) => `"${id}"`).join(",")})`,
    select: "id,nickname",
  });

  return new Map(profiles.map((profile) => [profile.id, profile.nickname]));
}

function buildTeamCounts(members: DemoMember[]) {
  return members.reduce(
    (counts, member) => {
      counts[member.team] += 1;
      return counts;
    },
    { red: 0, blue: 0 } satisfies Record<TeamName, number>,
  );
}

async function selectSingle<T>(
  env: SupabaseAdminEnv,
  table: string,
  query: Record<string, string>,
): Promise<T | null> {
  const rows = await selectMany<T>(env, table, {
    ...query,
    limit: "1",
  });

  return rows[0] ?? null;
}

async function selectMany<T>(
  env: SupabaseAdminEnv,
  table: string,
  query: Record<string, string>,
): Promise<T[]> {
  const searchParams = new URLSearchParams(query);
  const response = await request(
    env,
    `/rest/v1/${table}?${searchParams.toString()}`,
    {
      method: "GET",
    },
  );

  return (await response.json()) as T[];
}

async function request(
  env: SupabaseAdminEnv,
  path: string,
  init: RequestInit,
): Promise<Response> {
  const response = await fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      "content-type": "application/json",
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Supabase admin request failed: ${response.status} ${path}`);
  }

  return response;
}
