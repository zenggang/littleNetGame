import { canStartMatch, detectMatchMode, resolveTeamCounts } from "@/lib/game/config";
import { applyQuestionOutcome, createInitialTeams } from "@/lib/game/match";
import { generateQuestion } from "@/lib/game/questions";
import type {
  MatchMode,
  MathQuestion,
  TeamCounts,
  TeamName,
  TeamState,
} from "@/lib/game/types";

const STORAGE_KEY = "little-net-game:demo-store";
const STORE_EVENT = "little-net-game:demo-store-update";
const SESSION_KEY = "little-net-game:player-session";

const COUNTDOWN_MS = 3_000;
const MATCH_DURATION_MS = 60_000;
const QUESTION_DURATION_MS = 8_000;
const WRONG_COOLDOWN_MS = 1_000;
const TIMEOUT_DAMAGE = 2;

export type DemoRoom = {
  id?: string;
  code: string;
  gradeLabel: string;
  capacity: 2 | 3 | 4 | 6;
  hostPlayerId: string;
  status: "open" | "locked";
  activeMatchId: string | null;
  createdAt: string;
};

export type DemoMember = {
  playerId: string;
  nickname: string;
  team: TeamName;
  joinedAt: string;
};

export type DemoMatchEvent = {
  id: string;
  type:
    | "match_started"
    | "question_spawned"
    | "answer_correct"
    | "answer_wrong"
    | "question_timeout"
    | "hp_changed"
    | "match_finished";
  text: string;
  createdAt: string;
  team?: TeamName;
  targetTeam?: TeamName;
  damage?: number;
};

export type DemoMatch = {
  id: string;
  roomCode: string;
  mode: MatchMode;
  phase: "countdown" | "active" | "finished";
  teams: Record<TeamName, TeamState>;
  totalCorrect: Record<TeamName, number>;
  currentQuestion: MathQuestion;
  questionIndex: number;
  questionDeadlineAt: string;
  countdownEndsAt: string;
  endsAt: string;
  recentPrompts: string[];
  winner: TeamName | null;
  winReason: "hp_zero" | "time_up" | null;
  lastHitTeam: TeamName | null;
  cooldowns: Record<string, number>;
  events: DemoMatchEvent[];
  createdAt: string;
  endedAt: string | null;
};

type DemoStore = {
  rooms: Record<string, DemoRoom>;
  roomMembers: Record<string, DemoMember[]>;
  matches: Record<string, DemoMatch>;
};

export type DemoPlayerSession = {
  playerId: string;
  nickname: string;
};

function initialStore(): DemoStore {
  return {
    rooms: {},
    roomMembers: {},
    matches: {},
  };
}

function getStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage;
}

function getSessionStorage() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.sessionStorage;
}

function loadStore(): DemoStore {
  const storage = getStorage();
  const raw = storage?.getItem(STORAGE_KEY);

  if (!raw) {
    return initialStore();
  }

  try {
    return JSON.parse(raw) as DemoStore;
  } catch {
    return initialStore();
  }
}

function saveStore(store: DemoStore) {
  const storage = getStorage();
  storage?.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(STORE_EVENT));
}

function mutateStore(mutator: (store: DemoStore) => void): DemoStore {
  const store = loadStore();
  mutator(store);
  saveStore(store);
  return store;
}

export function subscribeToDemoStore(callback: () => void) {
  const handleStorage = (event: Event) => {
    if (event instanceof StorageEvent && event.key !== STORAGE_KEY) {
      return;
    }
    callback();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(STORE_EVENT, handleStorage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(STORE_EVENT, handleStorage);
  };
}

export function getOrCreatePlayerSession(nickname?: string): DemoPlayerSession {
  const storage = getSessionStorage();
  const existing = storage?.getItem(SESSION_KEY);

  if (existing) {
    const session = JSON.parse(existing) as DemoPlayerSession;

    if (nickname && nickname !== session.nickname) {
      const nextSession = { ...session, nickname: nickname.trim() };
      storage?.setItem(SESSION_KEY, JSON.stringify(nextSession));
      return nextSession;
    }

    return session;
  }

  const session = {
    playerId: crypto.randomUUID(),
    nickname: sanitizeNickname(nickname),
  };

  storage?.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function createRoom(input: {
  capacity: 2 | 3 | 4 | 6;
  nickname: string;
}): DemoRoom {
  const session = getOrCreatePlayerSession(input.nickname);
  const room: DemoRoom = {
    code: createRoomCode(loadStore().rooms),
    gradeLabel: "小学二年级",
    capacity: input.capacity,
    hostPlayerId: session.playerId,
    status: "open",
    activeMatchId: null,
    createdAt: new Date().toISOString(),
  };

  mutateStore((store) => {
    store.rooms[room.code] = room;
    store.roomMembers[room.code] = [
      {
        playerId: session.playerId,
        nickname: session.nickname,
        team: "red",
        joinedAt: room.createdAt,
      },
    ];
  });

  return room;
}

export function joinRoom(input: { roomCode: string; nickname: string }) {
  const session = getOrCreatePlayerSession(input.nickname);

  return mutateStore((store) => {
    const room = store.rooms[input.roomCode];
    if (!room) {
      throw new Error("ROOM_NOT_FOUND");
    }

    const members = store.roomMembers[input.roomCode] ?? [];
    const existing = members.find((member) => member.playerId === session.playerId);

    if (existing) {
      existing.nickname = session.nickname;
      return;
    }

    if (members.length >= room.capacity || room.status !== "open") {
      throw new Error("ROOM_UNAVAILABLE");
    }

    const team = members.filter((member) => member.team === "red").length <=
      members.filter((member) => member.team === "blue").length
      ? "red"
      : "blue";

    members.push({
      playerId: session.playerId,
      nickname: session.nickname,
      team,
      joinedAt: new Date().toISOString(),
    });

    store.roomMembers[input.roomCode] = members;
  });
}

export function switchTeam(roomCode: string, team: TeamName) {
  const session = getOrCreatePlayerSession();

  mutateStore((store) => {
    const member = (store.roomMembers[roomCode] ?? []).find(
      (item) => item.playerId === session.playerId,
    );

    if (!member) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    const room = store.rooms[roomCode];
    if (!room || room.status !== "open") {
      throw new Error("ROOM_LOCKED");
    }

    member.team = team;
  });
}

export function startMatch(roomCode: string): DemoMatch {
  const session = getOrCreatePlayerSession();
  let nextMatch!: DemoMatch;

  mutateStore((store) => {
    const room = store.rooms[roomCode];
    const members = store.roomMembers[roomCode] ?? [];

    if (!room) {
      throw new Error("ROOM_NOT_FOUND");
    }

    if (room.hostPlayerId !== session.playerId) {
      throw new Error("HOST_ONLY");
    }

    const teamCounts = resolveTeamCounts(members.map((member) => member.team));

    if (!canStartMatch({ capacity: room.capacity, teams: teamCounts })) {
      throw new Error("CANNOT_START");
    }

    const mode = detectMatchMode(teamCounts);
    if (!mode) {
      throw new Error("MODE_NOT_SUPPORTED");
    }

    const advantagedTeam = resolveAdvantagedTeam(teamCounts);
    const question = generateQuestion(mathRandomSource(), []);
    const now = Date.now();
    const matchId = crypto.randomUUID();

    nextMatch = {
      id: matchId,
      roomCode,
      mode,
      phase: "countdown",
      teams: createInitialTeams(mode, advantagedTeam),
      totalCorrect: { red: 0, blue: 0 },
      currentQuestion: question,
      questionIndex: 1,
      questionDeadlineAt: new Date(now + COUNTDOWN_MS + QUESTION_DURATION_MS).toISOString(),
      countdownEndsAt: new Date(now + COUNTDOWN_MS).toISOString(),
      endsAt: new Date(now + COUNTDOWN_MS + MATCH_DURATION_MS).toISOString(),
      recentPrompts: [question.prompt],
      winner: null,
      winReason: null,
      lastHitTeam: null,
      cooldowns: {},
      events: [
        createEvent("match_started", "房主发起了对战倒计时。"),
        createEvent("question_spawned", `第 1 题：${question.prompt}`),
      ],
      createdAt: new Date(now).toISOString(),
      endedAt: null,
    };

    room.status = "locked";
    room.activeMatchId = matchId;
    store.matches[matchId] = nextMatch;
  });

  return nextMatch;
}

export function tickMatch(matchId: string) {
  mutateStore((store) => {
    const match = store.matches[matchId];
    if (!match || match.phase === "finished") {
      return;
    }

    const now = Date.now();

    if (match.phase === "countdown" && now >= Date.parse(match.countdownEndsAt)) {
      match.phase = "active";
      return;
    }

    if (match.phase !== "active") {
      return;
    }

    if (now >= Date.parse(match.endsAt)) {
        finishMatch(match, store.rooms[match.roomCode] ?? null, "time_up");
        return;
    }

    if (now >= Date.parse(match.questionDeadlineAt)) {
      const outcome = applyQuestionOutcome({
        teams: match.teams,
        attacker: null,
        damage: 0,
        wasCorrect: false,
        penaltyDamage: TIMEOUT_DAMAGE,
      });

      match.teams = outcome.teams;
      match.events.unshift(
        createEvent("question_timeout", "这题没人答对，双方都掉了 2 点血。"),
      );
      match.events.unshift(
        createEvent("hp_changed", renderHpText(match.teams)),
      );

      if (outcome.winner) {
        match.winner = outcome.winner;
        finishMatch(match, store.rooms[match.roomCode] ?? null, "hp_zero");
        return;
      }

      nextQuestion(match);
    }
  });
}

export function submitAnswer(
  matchId: string,
  payload: Record<string, string>,
): { ok: boolean; message: string } {
  const session = getOrCreatePlayerSession();
  let result = { ok: false, message: "提交失败" };

  mutateStore((store) => {
    const match = store.matches[matchId];
    if (!match) {
      result = { ok: false, message: "对局不存在" };
      return;
    }

    const members = store.roomMembers[match.roomCode] ?? [];
    const member = members.find((item) => item.playerId === session.playerId);

    if (!member) {
      result = { ok: false, message: "你还不在这个房间里" };
      return;
    }

    if (match.phase === "countdown") {
      result = { ok: false, message: "倒计时中，马上开始" };
      return;
    }

    if (match.phase === "finished") {
      result = { ok: false, message: "这局已经结束了" };
      return;
    }

    const cooldownUntil = match.cooldowns[session.playerId] ?? 0;
    const now = Date.now();
    if (cooldownUntil > now) {
      result = { ok: false, message: "答错了，冷静 1 秒再来" };
      return;
    }

    if (now >= Date.parse(match.questionDeadlineAt)) {
      result = { ok: false, message: "这题已经超时了" };
      return;
    }

    const isCorrect = isPayloadCorrect(match.currentQuestion, payload);

    if (!isCorrect) {
      match.cooldowns[session.playerId] = now + WRONG_COOLDOWN_MS;
      match.events.unshift(
        createEvent("answer_wrong", `${member.nickname} 答错了，1 秒后再试。`, member.team),
      );
      result = { ok: false, message: "不对，再想一想" };
      return;
    }

    const outcome = applyQuestionOutcome({
      teams: match.teams,
      attacker: member.team,
      damage: match.currentQuestion.damage,
      wasCorrect: true,
      penaltyDamage: TIMEOUT_DAMAGE,
    });
    const targetTeam = member.team === "red" ? "blue" : "red";
    const damageDealt = Math.max(
      0,
      match.teams[targetTeam].hpCurrent - outcome.teams[targetTeam].hpCurrent,
    );

    match.teams = outcome.teams;
    match.totalCorrect[member.team] += 1;
    match.lastHitTeam = member.team;
    match.events.unshift(
      createEvent(
        "answer_correct",
        `${member.nickname} 抢先答对了，${member.team === "red" ? "红队" : "蓝队"}发起进攻！`,
        member.team,
        targetTeam,
        damageDealt,
      ),
    );
    match.events.unshift(
      createEvent("hp_changed", renderHpText(match.teams), member.team, targetTeam, damageDealt),
    );

    if (outcome.winner) {
      match.winner = outcome.winner;
      finishMatch(match, store.rooms[match.roomCode] ?? null, "hp_zero");
      result = { ok: true, message: "命中了，直接拿下这一局！" };
      return;
    }

    nextQuestion(match);
    result = { ok: true, message: "答对了，继续下一题" };
  });

  return result;
}

export function restartRoom(roomCode: string) {
  mutateStore((store) => {
    const room = store.rooms[roomCode];
    if (!room) {
      return;
    }

    room.status = "open";
    room.activeMatchId = null;
  });
}

export function getRoomSnapshot(roomCode: string) {
  const store = loadStore();
  const room = store.rooms[roomCode] ?? null;
  const members = room ? store.roomMembers[roomCode] ?? [] : [];
  const match = room?.activeMatchId ? store.matches[room.activeMatchId] ?? null : null;
  const session = readPlayerSession();
  const viewer = session
    ? members.find((member) => member.playerId === session.playerId) ?? null
    : null;

  return {
    room,
    members,
    match,
    viewer,
    canStart: room
      ? canStartMatch({
          capacity: room.capacity,
          teams: resolveTeamCounts(members.map((member) => member.team)),
        })
      : false,
    session,
  };
}

export function getMatchSnapshot(matchId: string) {
  const store = loadStore();
  const match = store.matches[matchId] ?? null;
  const room = match ? store.rooms[match.roomCode] ?? null : null;
  const members = room ? store.roomMembers[match.roomCode] ?? [] : [];
  const session = readPlayerSession();
  const viewer = session
    ? members.find((member) => member.playerId === session.playerId) ?? null
    : null;

  return {
    match,
    room,
    members,
    viewer,
    session,
  };
}

export function readPlayerSession(): DemoPlayerSession | null {
  const storage = getSessionStorage();
  const raw = storage?.getItem(SESSION_KEY);

  if (!raw) {
    return null;
  }

  return JSON.parse(raw) as DemoPlayerSession;
}

function nextQuestion(match: DemoMatch) {
  const question = generateQuestion(mathRandomSource(), match.recentPrompts.slice(0, 4));

  match.currentQuestion = question;
  match.questionIndex += 1;
  match.questionDeadlineAt = new Date(Date.now() + QUESTION_DURATION_MS).toISOString();
  match.recentPrompts = [question.prompt, ...match.recentPrompts].slice(0, 6);
  match.events.unshift(
    createEvent("question_spawned", `第 ${match.questionIndex} 题：${question.prompt}`),
  );
}

function finishMatch(
  match: DemoMatch,
  room: DemoRoom | null,
  reason: "hp_zero" | "time_up",
) {
  match.phase = "finished";
  match.winReason = reason;
  match.winner = match.winner ?? pickWinnerOnTime(match);
  match.endedAt = new Date().toISOString();
  match.events.unshift(
    createEvent(
      "match_finished",
      `${match.winner === "red" ? "红队" : "蓝队"}获胜！`,
      match.winner ?? undefined,
    ),
  );

  if (room) {
    room.status = "open";
    room.activeMatchId = null;
  }
}

function pickWinnerOnTime(match: DemoMatch): TeamName {
  if (match.teams.red.hpCurrent !== match.teams.blue.hpCurrent) {
    return match.teams.red.hpCurrent > match.teams.blue.hpCurrent ? "red" : "blue";
  }

  if (match.totalCorrect.red !== match.totalCorrect.blue) {
    return match.totalCorrect.red > match.totalCorrect.blue ? "red" : "blue";
  }

  return match.lastHitTeam ?? "red";
}

function isPayloadCorrect(question: MathQuestion, payload: Record<string, string>) {
  if (question.answerKind === "single-number" && "value" in question.correctAnswer) {
    return Number.parseInt(payload.value ?? "", 10) === question.correctAnswer.value;
  }

  if (
    question.answerKind === "quotient-remainder" &&
    "quotient" in question.correctAnswer
  ) {
    return (
      Number.parseInt(payload.quotient ?? "", 10) === question.correctAnswer.quotient &&
      Number.parseInt(payload.remainder ?? "", 10) === question.correctAnswer.remainder
    );
  }

  return false;
}

function createEvent(
  type: DemoMatchEvent["type"],
  text: string,
  team?: TeamName,
  targetTeam?: TeamName,
  damage?: number,
): DemoMatchEvent {
  return {
    id: crypto.randomUUID(),
    type,
    text,
    team,
    targetTeam,
    damage,
    createdAt: new Date().toISOString(),
  };
}

function createRoomCode(existingRooms: Record<string, DemoRoom>): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  for (let attempt = 0; attempt < 100; attempt += 1) {
    const code = Array.from({ length: 4 }, () =>
      letters[Math.floor(Math.random() * letters.length)],
    ).join("");

    if (!existingRooms[code]) {
      return code;
    }
  }

  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

function sanitizeNickname(nickname?: string): string {
  const value = nickname?.trim();
  if (value) {
    return value.slice(0, 10);
  }

  return `玩家${Math.floor(Math.random() * 900 + 100)}`;
}

function resolveAdvantagedTeam(teamCounts: TeamCounts): TeamName {
  return teamCounts.red <= teamCounts.blue ? "red" : "blue";
}

function mathRandomSource() {
  return {
    next: () => Math.random(),
  };
}

function renderHpText(teams: Record<TeamName, TeamState>) {
  return `红队 ${teams.red.hpCurrent} / 蓝队 ${teams.blue.hpCurrent}`;
}
