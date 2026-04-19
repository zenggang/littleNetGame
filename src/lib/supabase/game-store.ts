"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";

import {
  createRoom as createDemoRoom,
  getMatchSnapshot as getDemoMatchSnapshot,
  getRoomSnapshot as getDemoRoomSnapshot,
  joinRoom as joinDemoRoom,
  readPlayerSession as readDemoPlayerSession,
  restartRoom as restartDemoRoom,
  startMatch as startDemoMatch,
  submitAnswer as submitDemoAnswer,
  subscribeToDemoStore,
  switchTeam as switchDemoTeam,
  tickMatch as tickDemoMatch,
} from "@/lib/demo/store";
import type {
  DemoMatch,
  DemoMatchEvent,
  DemoMember,
  DemoPlayerSession,
  DemoRoom,
} from "@/lib/demo/store";
import type { TeamName } from "@/lib/game/types";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { hasSupabaseEnvConfigured } from "@/lib/supabase/env";

type RoomSnapshot = {
  room: DemoRoom | null;
  members: DemoMember[];
  match: DemoMatch | null;
  viewer: DemoMember | null;
  canStart: boolean;
  session: DemoPlayerSession | null;
};

type MatchSnapshot = {
  room: DemoRoom | null;
  members: DemoMember[];
  viewer: DemoMember | null;
  session: DemoPlayerSession | null;
  match: DemoMatch | null;
};

type SubmitAnswerResult = {
  ok: boolean;
  message: string;
};

type MatchReportRow = {
  match_id: string;
  room_code: string;
  winner_team: TeamName;
  win_reason: "hp_zero" | "time_up";
  duration_ms: number;
  total_correct: {
    red: number;
    blue: number;
  };
  final_hp: {
    red: number;
    blue: number;
  };
  final_event_log: unknown[];
};

type SessionTokenLike = {
  access_token: string;
};

type RealtimeAuthClientLike = {
  realtime: {
    setAuth: (accessToken: string) => void;
  };
};

type RealtimeSubscribableLike = {
  subscribe: (callback?: (status: string, error?: Error) => void) => unknown;
};

function requireClient() {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }

  return client;
}

function shouldUseDemoStore() {
  return !hasSupabaseEnvConfigured();
}

export function toUserMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

  if (message.includes("Anonymous sign-ins are disabled")) {
    return "Supabase 还没开启 Anonymous Sign-Ins。请先在 Auth -> Providers 里开启匿名登录。";
  }

  switch (message) {
    case "ROOM_NOT_FOUND":
      return "没找到这个房间。";
    case "ROOM_UNAVAILABLE":
      return "房间已满，或者房间已经开始了。";
    case "ROOM_LOCKED":
      return "房间已经锁定，不能再换队了。";
    case "MEMBER_NOT_FOUND":
      return "你还不在这个房间里。";
    case "HOST_ONLY":
      return "只有房主才能开始对战。";
    case "CANNOT_START":
      return "当前人数和分队还不能开局。";
    case "MODE_NOT_SUPPORTED":
      return "当前分队不在支持模式里。";
    case "MATCH_NOT_FOUND":
      return "这场对战已经结束或断开了，请返回房间重新开局。";
    case "AUTH_REQUIRED":
      return "当前还没登录到 Supabase。";
    case "COORDINATOR_NOT_READY":
      return "线上协调层还没配置完成。请在 Vercel 生产环境补齐 COORDINATOR_BASE_URL 和 COORDINATOR_SHARED_SECRET，并重新部署。";
    case "COORDINATOR_CONNECT_BOOTSTRAP_FAILED":
      return "协调层启动信息获取失败。请检查线上 coordinator ticket 接口和部署配置。";
    case "MATCH_FORBIDDEN":
    case "ROOM_FORBIDDEN":
      return "你没有权限查看这场对局。";
    case "SUPABASE_NOT_CONFIGURED":
      return "还没配置 Supabase 环境变量。请复制 .env.example 到 .env.local，并填写 NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY。";
    default:
      return message || "操作失败，请再试一次。";
  }
}

async function ensureSession() {
  const client = requireClient();
  const { data, error } = await client.auth.getSession();

  if (error) {
    throw new Error(error.message);
  }

  if (data.session) {
    return data.session;
  }

  const signInResult = await client.auth.signInAnonymously();
  if (signInResult.error) {
    throw new Error(signInResult.error.message);
  }

  return signInResult.data.session;
}

async function callRpc<T>(fn: string, params?: Record<string, unknown>) {
  await ensureSession();

  const client = requireClient();
  const { data, error } = await (client as typeof client & {
    rpc: (name: string, args?: Record<string, unknown>) => Promise<{
      data: T | null;
      error: { message: string } | null;
    }>;
  }).rpc(fn, params);

  if (error) {
    throw new Error(error.message);
  }

  return data as T;
}

function normalizeRoom(raw: Record<string, unknown> | null): DemoRoom | null {
  if (!raw) {
    return null;
  }

  return {
    id: String(raw.id ?? ""),
    code: String(raw.code ?? ""),
    gradeLabel: String(raw.gradeLabel ?? ""),
    capacity: Number(raw.capacity ?? 2) as DemoRoom["capacity"],
    hostPlayerId: String(raw.hostPlayerId ?? ""),
    status: String(raw.status ?? "open") as DemoRoom["status"],
    activeMatchId: raw.activeMatchId ? String(raw.activeMatchId) : null,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
  };
}

function normalizeMember(raw: Record<string, unknown>): DemoMember {
  return {
    playerId: String(raw.playerId ?? ""),
    nickname: String(raw.nickname ?? ""),
    team: String(raw.team ?? "red") as TeamName,
    joinedAt: String(raw.joinedAt ?? new Date().toISOString()),
  };
}

function normalizeEvent(raw: Record<string, unknown>): DemoMatchEvent {
  const damage = raw.damage;

  return {
    id: String(raw.id ?? crypto.randomUUID()),
    type: String(raw.type ?? "question_spawned") as DemoMatchEvent["type"],
    text: String(raw.text ?? ""),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    team: raw.team ? (String(raw.team) as TeamName) : undefined,
    targetTeam: raw.targetTeam ? (String(raw.targetTeam) as TeamName) : undefined,
    damage: typeof damage === "number" ? damage : damage ? Number(damage) : undefined,
  };
}

function normalizeMatch(raw: Record<string, unknown> | null): DemoMatch | null {
  if (!raw) {
    return null;
  }

  const teams = (raw.teams ?? {}) as Record<string, Record<string, unknown>>;
  const totalCorrect = (raw.totalCorrect ?? {}) as Record<string, number>;
  const currentQuestion = raw.currentQuestion as DemoMatch["currentQuestion"] | null;
  const cooldowns = (raw.cooldowns ?? {}) as Record<string, number>;
  const events = Array.isArray(raw.events)
    ? raw.events.map((event) => normalizeEvent(event as Record<string, unknown>))
    : [];

  if (!currentQuestion) {
    return null;
  }

  return {
    id: String(raw.id ?? ""),
    roomCode: String(raw.roomCode ?? ""),
    mode: String(raw.mode ?? "1v1") as DemoMatch["mode"],
    phase: String(raw.phase ?? "countdown") as DemoMatch["phase"],
    teams: {
      red: {
        name: "red",
        hpMax: Number(teams.red?.hpMax ?? 0),
        hpCurrent: Number(teams.red?.hpCurrent ?? 0),
        damageMultiplier: Number(teams.red?.damageMultiplier ?? 1),
      },
      blue: {
        name: "blue",
        hpMax: Number(teams.blue?.hpMax ?? 0),
        hpCurrent: Number(teams.blue?.hpCurrent ?? 0),
        damageMultiplier: Number(teams.blue?.damageMultiplier ?? 1),
      },
    },
    totalCorrect: {
      red: Number(totalCorrect.red ?? 0),
      blue: Number(totalCorrect.blue ?? 0),
    },
    currentQuestion,
    questionIndex: Number(raw.questionIndex ?? 1),
    questionDeadlineAt: String(raw.questionDeadlineAt ?? new Date().toISOString()),
    countdownEndsAt: String(raw.countdownEndsAt ?? new Date().toISOString()),
    endsAt: String(raw.endsAt ?? new Date().toISOString()),
    recentPrompts: Array.isArray(raw.recentPrompts)
      ? raw.recentPrompts.map((item) => String(item))
      : [],
    winner: raw.winner ? (String(raw.winner) as TeamName) : null,
    winReason: raw.winReason
      ? (String(raw.winReason) as DemoMatch["winReason"])
      : null,
    lastHitTeam: raw.lastHitTeam ? (String(raw.lastHitTeam) as TeamName) : null,
    cooldowns: Object.fromEntries(
      Object.entries(cooldowns).map(([key, value]) => [key, Number(value)]),
    ),
    events,
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    endedAt: raw.endedAt ? String(raw.endedAt) : null,
  };
}

function normalizeSession(raw: Record<string, unknown> | null): DemoPlayerSession | null {
  if (!raw) {
    return null;
  }

  return {
    playerId: String(raw.playerId ?? ""),
    nickname: String(raw.nickname ?? ""),
  };
}

function normalizeRoomSnapshot(raw: Record<string, unknown>): RoomSnapshot {
  return {
    room: normalizeRoom((raw.room ?? null) as Record<string, unknown> | null),
    members: Array.isArray(raw.members)
      ? raw.members.map((member) => normalizeMember(member as Record<string, unknown>))
      : [],
    match: normalizeMatch((raw.match ?? null) as Record<string, unknown> | null),
    viewer: raw.viewer ? normalizeMember(raw.viewer as Record<string, unknown>) : null,
    canStart: Boolean(raw.canStart),
    session: normalizeSession((raw.session ?? null) as Record<string, unknown> | null),
  };
}

function normalizeMatchSnapshot(raw: Record<string, unknown>): MatchSnapshot {
  return {
    room: normalizeRoom((raw.room ?? null) as Record<string, unknown> | null),
    members: Array.isArray(raw.members)
      ? raw.members.map((member) => normalizeMember(member as Record<string, unknown>))
      : [],
    viewer: raw.viewer ? normalizeMember(raw.viewer as Record<string, unknown>) : null,
    session: normalizeSession((raw.session ?? null) as Record<string, unknown> | null),
    match: normalizeMatch((raw.match ?? null) as Record<string, unknown> | null),
  };
}

export async function readPlayerSession() {
  if (shouldUseDemoStore()) {
    return readDemoPlayerSession();
  }

  const data = await callRpc<Record<string, unknown>>("ensure_player_profile", {
    p_nickname: null,
  });

  return normalizeSession(data);
}

export async function createRoom(input: {
  capacity: 2 | 3 | 4 | 6;
  nickname: string;
}) {
  if (shouldUseDemoStore()) {
    return createDemoRoom(input);
  }

  const data = await callRpc<Record<string, unknown>>("game_create_room", {
    p_capacity: input.capacity,
    p_nickname: input.nickname,
  });

  return {
    id: String(data.id ?? ""),
    code: String(data.code ?? ""),
  };
}

export async function joinRoom(input: { roomCode: string; nickname: string }) {
  if (shouldUseDemoStore()) {
    return joinDemoRoom(input);
  }

  return callRpc<Record<string, unknown>>("game_join_room", {
    p_room_code: input.roomCode,
    p_nickname: input.nickname,
  });
}

export async function switchTeam(roomCode: string, team: TeamName) {
  if (shouldUseDemoStore()) {
    switchDemoTeam(roomCode, team);
    return;
  }

  await callRpc("game_switch_team", {
    p_room_code: roomCode,
    p_team: team,
  });
}

export async function startMatch(roomCode: string) {
  if (shouldUseDemoStore()) {
    return startDemoMatch(roomCode);
  }

  const data = await callRpc<Record<string, unknown>>("game_start_match", {
    p_room_code: roomCode,
  });

  return {
    id: String(data.id ?? ""),
  };
}

export async function submitAnswer(
  matchId: string,
  payload: Record<string, string>,
): Promise<SubmitAnswerResult> {
  if (shouldUseDemoStore()) {
    return submitDemoAnswer(matchId, payload);
  }

  const data = await callRpc<Record<string, unknown>>("game_submit_answer", {
    p_match_id: matchId,
    p_answer_payload: payload,
  });

  return {
    ok: Boolean(data.ok),
    message: String(data.message ?? "提交失败"),
  };
}

export async function tickMatch(matchId: string) {
  if (shouldUseDemoStore()) {
    tickDemoMatch(matchId);
    return {};
  }

  return callRpc<Record<string, unknown>>("game_tick_match", {
    p_match_id: matchId,
  });
}

export async function restartRoom(roomCode: string) {
  if (shouldUseDemoStore()) {
    restartDemoRoom(roomCode);
    return;
  }

  await callRpc("game_restart_room", {
    p_room_code: roomCode,
  });
}

export async function getRoomSnapshot(roomCode: string) {
  if (shouldUseDemoStore()) {
    return getDemoRoomSnapshot(roomCode);
  }

  const data = await callRpc<Record<string, unknown>>("game_room_snapshot", {
    p_room_code: roomCode,
  });

  return normalizeRoomSnapshot(data);
}

export async function getMatchSnapshot(matchId: string) {
  if (shouldUseDemoStore()) {
    return getDemoMatchSnapshot(matchId);
  }

  const data = await callRpc<Record<string, unknown>>("game_match_snapshot", {
    p_match_id: matchId,
  });

  return normalizeMatchSnapshot(data);
}

export async function getMatchReport(matchId: string) {
  if (shouldUseDemoStore()) {
    throw new Error("DEMO_REPORT_UNAVAILABLE");
  }

  await ensureSession();

  const client = requireClient();
  const { data, error } = await client
    .from("match_reports")
    .select("*")
    .eq("match_id", matchId)
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as MatchReportRow;
}

export async function startAuthedSubscription(
  client: RealtimeAuthClientLike,
  channel: RealtimeSubscribableLike,
  getSession: () => Promise<SessionTokenLike>,
  shouldSubscribe: () => boolean = () => true,
  onStatus?: (status: string, error?: Error) => void,
) {
  const session = await getSession();
  client.realtime.setAuth(session.access_token);

  if (shouldSubscribe()) {
    channel.subscribe(onStatus);
  }
}

function subscribe(channel: RealtimeChannel, onReady?: () => void) {
  const client = requireClient();
  let cancelled = false;

  void startAuthedSubscription(
    client,
    channel,
    async () => {
      const session = await ensureSession();
      if (!session) {
        throw new Error("AUTH_REQUIRED");
      }
      return { access_token: session.access_token };
    },
    () => !cancelled,
    (status, error) => {
      if (status === "SUBSCRIBED") {
        onReady?.();
        return;
      }

      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        console.error("Supabase realtime subscribe failed", error?.message ?? status);
      }
    },
  ).catch((error) => {
    console.error("Supabase realtime auth sync failed", error);
  });

  return () => {
    cancelled = true;
    client.removeChannel(channel);
  };
}

export function subscribeToRoom(roomId: string, callback: () => void) {
  if (shouldUseDemoStore()) {
    return subscribeToDemoStore(callback);
  }

  const client = requireClient();
  const channel = client
    .channel(`room:${roomId}:${crypto.randomUUID()}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "rooms",
      filter: `id=eq.${roomId}`,
    }, callback)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "room_members",
      filter: `room_id=eq.${roomId}`,
    }, callback)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "matches",
      filter: `room_id=eq.${roomId}`,
    }, callback);

  return subscribe(channel, callback);
}

export function subscribeToMatch(
  roomId: string,
  matchId: string,
  callback: () => void,
) {
  if (shouldUseDemoStore()) {
    return subscribeToDemoStore(callback);
  }

  const client = requireClient();
  const channel = client
    .channel(`match:${matchId}:${crypto.randomUUID()}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "rooms",
      filter: `id=eq.${roomId}`,
    }, callback)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "room_members",
      filter: `room_id=eq.${roomId}`,
    }, callback)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "matches",
      filter: `id=eq.${matchId}`,
    }, callback)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "match_teams",
      filter: `match_id=eq.${matchId}`,
    }, callback)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "match_questions",
      filter: `match_id=eq.${matchId}`,
    }, callback)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "match_events",
      filter: `match_id=eq.${matchId}`,
    }, callback)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "answer_submissions",
      filter: `match_id=eq.${matchId}`,
    }, callback);

  return subscribe(channel, callback);
}
