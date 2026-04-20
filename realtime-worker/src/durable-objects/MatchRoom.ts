import { DurableObject, type DurableObjectState } from "cloudflare:workers";

import type { DemoPlayerSession } from "../../../src/lib/demo/store";
import type {
  CoordinatorCommand,
  CoordinatorMessage,
  RoomEvent,
} from "../../../src/lib/game/protocol/coordinator";
import type { MatchEvent } from "../../../src/lib/game/protocol/events";
import { detectMatchMode } from "../../../src/lib/game/config";
import type { TeamName } from "../../../src/lib/game/types";
import { verifyCoordinatorTicket } from "../lib/coordinator-ticket";
import {
  buildMatchEventMessages,
  buildRoomEventMessage,
  buildSnapshotMessages,
  shouldPersistCheckpoint,
} from "../lib/coordinator-messages";
import {
  createMatchEngine,
  submitAnswer,
  tickMatch,
  type MatchEngineState,
} from "../lib/match-engine";
import {
  addRoomMember,
  applyRoomAction,
  createRoomEngineState,
  type RoomEngineState,
} from "../lib/room-engine";
import { shouldRefreshRoomMembership } from "../lib/room-sync";
import {
  insertRoomMember,
  loadCoordinatorState,
  markMatchActive,
  persistMatchFinish,
  persistMatchStart,
  persistRoomReopened,
  updateRoomMemberTeam,
  upsertPlayerProfile,
} from "../lib/supabase-admin";
import type { Env } from "../index";

type ConnectionState = DemoPlayerSession & {
  roomCode: string;
};

type DurableWebSocket = WebSocket & {
  serializeAttachment: (value: ConnectionState) => void;
  deserializeAttachment: () => ConnectionState | null;
};

type StoredCoordinatorState = {
  roomState: RoomEngineState | null;
  matchState: MatchEngineState | null;
};

type MatchProgressResult = {
  events: MatchEvent[];
  roomReopened: boolean;
};

const STORAGE_KEY = "match-room-state";
const CHECKPOINT_THROTTLE_MS = 1_000;

/**
 * MatchRoom 作为房间级权威协调器，负责三件事：
 * - 以 DO 内存态驱动房间和对局实时状态
 * - 用事件作为常规广播主通道，snapshot 只在显式同步时发送
 * - 只在关键节点强制落盘，其余热状态按节流策略写入 checkpoint
 */
export class MatchRoom extends DurableObject<Env> {
  private roomState: RoomEngineState | null = null;
  private matchState: MatchEngineState | null = null;
  private sessions = new Map<WebSocket, ConnectionState>();
  private lastCheckpointAt = 0;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    ctx.blockConcurrencyWhile(async () => {
      const stored = await this.ctx.storage.get<StoredCoordinatorState>(STORAGE_KEY);

      if (stored) {
        this.roomState = stored.roomState;
        this.matchState = stored.matchState;
      }

      for (const socket of this.ctx.getWebSockets()) {
        const state = (socket as DurableWebSocket).deserializeAttachment();

        if (state) {
          this.sessions.set(socket, state);
        }
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected WebSocket upgrade", { status: 426 });
    }

    const url = new URL(request.url);
    const roomCode = url.pathname.split("/")[2]?.toUpperCase();
    const token = url.searchParams.get("token");

    if (!roomCode || !token) {
      return new Response("Missing room code or token", { status: 400 });
    }

    const session = await verifyCoordinatorTicket(token, this.env.COORDINATOR_SHARED_SECRET);
    if (session.roomCode.toUpperCase() !== roomCode) {
      return new Response("Ticket room mismatch", { status: 403 });
    }

    await this.ensureRoomLoaded(roomCode, session.playerId);

    if (!this.roomState?.room) {
      return new Response("Room not found", { status: 404 });
    }

    const syncResult = await this.syncMatchClock();

    if (syncResult.events.length > 0 || syncResult.roomReopened) {
      await this.scheduleCheckpoint(syncResult.roomReopened);
    }
    this.broadcastMatchEvents(syncResult.events);
    if (syncResult.roomReopened) {
      this.broadcastRoomEvent(this.buildRoomReopenedEvent(false));
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair) as [DurableWebSocket, DurableWebSocket];

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      playerId: session.playerId,
      nickname: session.nickname,
      roomCode,
    });
    this.sessions.set(server, {
      playerId: session.playerId,
      nickname: session.nickname,
      roomCode,
    });
    this.sendSnapshotsToSocket(server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit & { webSocket: WebSocket });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer,
  ): Promise<void> {
    if (typeof message !== "string") {
      return;
    }

    const session = this.readSession(ws);
    if (!session) {
      ws.close(4001, "Missing session");
      return;
    }

    await this.ensureRoomLoaded(session.roomCode, session.playerId);

    let command: CoordinatorCommand;

    try {
      command = JSON.parse(message) as CoordinatorCommand;
    } catch {
      this.send(ws, {
        type: "session.error",
        payload: { message: "无法识别的协调层消息。" },
      });
      return;
    }

    await this.processCommand(ws, session, command);
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean,
  ): Promise<void> {
    void wasClean;
    this.sessions.delete(ws);
    ws.close(code, reason);
  }

  async alarm(): Promise<void> {
    if (!this.matchState) {
      await this.ctx.storage.deleteAlarm();
      return;
    }

    const syncResult = await this.syncMatchClock();
    if (syncResult.events.length > 0 || syncResult.roomReopened) {
      await this.scheduleCheckpoint(syncResult.roomReopened);
    }
    this.broadcastMatchEvents(syncResult.events);
    if (syncResult.roomReopened) {
      this.broadcastRoomEvent(this.buildRoomReopenedEvent(false));
    }
  }

  private async processCommand(
    ws: WebSocket,
    session: ConnectionState,
    command: CoordinatorCommand,
  ) {
    try {
      if (command.type === "room.join") {
        await this.handleJoinRoom(ws, session, command);
        this.sendCommandResult(ws, command.commandId, true, "已进入房间");
        return;
      }

      if (command.type === "room.switch_team") {
        await this.handleSwitchTeam(session, command.payload.team);
        this.sendCommandResult(ws, command.commandId, true, "已切换阵营");
        return;
      }

      if (command.type === "room.start_match") {
        const matchId = await this.handleStartMatch(session);
        this.sendCommandResult(ws, command.commandId, true, "对战开始", matchId);
        return;
      }

      if (command.type === "room.restart") {
        await this.handleRestartRoom();
        this.sendCommandResult(ws, command.commandId, true, "房间已重置");
        return;
      }

      if (command.type === "match.tick") {
        await this.handleTickMatch(ws);
        this.sendCommandResult(ws, command.commandId, true, "已同步");
        return;
      }

      if (command.type === "sync.request") {
        await this.handleSyncRequest(ws);
        this.sendCommandResult(ws, command.commandId, true, "已同步");
        return;
      }

      const result = await this.handleSubmitAnswer(session, command);
      this.sendCommandResult(ws, command.commandId, result.ok, result.message);
    } catch (error) {
      const message = error instanceof Error ? error.message : "协调层执行失败";
      this.sendCommandResult(ws, command.commandId, false, message);
    }
  }

  private async handleJoinRoom(
    ws: WebSocket,
    session: ConnectionState,
    command: Extract<CoordinatorCommand, { type: "room.join" }>,
  ) {
    const roomState = this.requireRoomState();
    const roomId = roomState.room.id;
    const existingViewer = roomState.members.find((member) => member.playerId === session.playerId);

    if (!roomId) {
      throw new Error("ROOM_NOT_FOUND");
    }

    if (
      !existingViewer &&
      (roomState.room.status !== "open" || roomState.members.length >= roomState.room.capacity)
    ) {
      throw new Error("ROOM_UNAVAILABLE");
    }

    await upsertPlayerProfile(this.env, {
      playerId: session.playerId,
      nickname: command.payload.nickname,
    });

    const nextRoomState = addRoomMember(roomState, {
      playerId: session.playerId,
      nickname: command.payload.nickname,
      joinedAt: new Date().toISOString(),
    });
    const viewer = nextRoomState.members.find((member) => member.playerId === session.playerId);

    if (!viewer) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    await insertRoomMember(this.env, {
      roomId,
      playerId: viewer.playerId,
      team: viewer.team,
      joinedAt: viewer.joinedAt,
    });

    session.nickname = command.payload.nickname;
    (ws as DurableWebSocket).serializeAttachment(session);
    this.roomState = nextRoomState;
    await this.scheduleCheckpoint(true);
    this.broadcastRoomEvent({
      type: "room.member_joined",
      payload: {
        member: viewer,
        canStart: nextRoomState.canStart,
      },
    });
  }

  private async handleSwitchTeam(
    session: ConnectionState,
    team: TeamName,
  ) {
    const roomState = this.requireRoomState();
    const roomId = roomState.room.id;
    const viewer = roomState.members.find((member) => member.playerId === session.playerId);

    if (!roomId) {
      throw new Error("ROOM_NOT_FOUND");
    }

    if (!viewer) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    if (roomState.room.status !== "open") {
      throw new Error("ROOM_LOCKED");
    }

    await updateRoomMemberTeam(this.env, {
      roomId,
      playerId: viewer.playerId,
      team,
    });

    const nextRoomState = applyRoomAction(roomState, {
      type: "switch_team",
      playerId: viewer.playerId,
      team,
    });
    this.roomState = nextRoomState;
    await this.scheduleCheckpoint(true);
    this.broadcastRoomEvent({
      type: "room.team_switched",
      payload: {
        playerId: viewer.playerId,
        team,
        canStart: nextRoomState.canStart,
      },
    });
  }

  private async handleStartMatch(session: ConnectionState): Promise<string> {
    const roomState = this.requireRoomState();
    const viewer = roomState.members.find((member) => member.playerId === session.playerId);
    const roomId = roomState.room.id;

    if (!viewer) {
      throw new Error("MEMBER_NOT_FOUND");
    }

    if (!roomId) {
      throw new Error("ROOM_NOT_FOUND");
    }

    if (roomState.room.hostPlayerId !== session.playerId) {
      throw new Error("HOST_ONLY");
    }

    if (!roomState.canStart) {
      throw new Error("CANNOT_START");
    }

    const mode = detectMatchMode({
      red: roomState.members.filter((member) => member.team === "red").length,
      blue: roomState.members.filter((member) => member.team === "blue").length,
    });

    if (!mode) {
      throw new Error("MODE_NOT_SUPPORTED");
    }

    const match = createMatchEngine({
      mode,
      roomCode: roomState.room.code,
      players: roomState.members.map((member) => ({
        playerId: member.playerId,
        team: member.team,
        nickname: member.nickname,
      })),
      now: Date.now(),
      random: mathRandomSource(),
    });

    this.matchState = match;
    this.roomState = applyRoomAction(roomState, {
      type: "lock_match",
      matchId: match.id,
    });

    await persistMatchStart(this.env, {
      roomId,
      roomCode: roomState.room.code,
      match,
      members: roomState.members,
    });
    await this.scheduleCheckpoint(true);
    await this.scheduleNextAlarm();
    this.broadcastRoomEvent({
      type: "room.match_started",
      payload: {
        matchId: match.id,
      },
    });

    return match.id;
  }

  private async handleRestartRoom() {
    const roomState = this.requireRoomState();
    const roomId = roomState.room.id;

    this.matchState = null;
    this.roomState = applyRoomAction(roomState, { type: "reopen_room" });

    if (roomId) {
      await persistRoomReopened(this.env, roomId);
    }

    await this.scheduleCheckpoint(true);
    await this.ctx.storage.deleteAlarm();
    this.broadcastRoomEvent(this.buildRoomReopenedEvent(true));
  }

  private async handleSubmitAnswer(
    session: ConnectionState,
    command: Extract<CoordinatorCommand, { type: "match.submit_answer" }>,
  ) {
    if (!this.matchState) {
      throw new Error("MATCH_NOT_FOUND");
    }

    const preflight = await this.driveMatchForward();
    this.broadcastMatchEvents(preflight.events);
    if (preflight.roomReopened) {
      this.broadcastRoomEvent(this.buildRoomReopenedEvent(false));
    }

    if (!this.matchState) {
      throw new Error("MATCH_NOT_FOUND");
    }

    const result = submitAnswer(this.matchState, {
      playerId: session.playerId,
      answer: command.payload.answer,
      now: Date.now(),
      random: mathRandomSource(),
    });

    this.matchState = result.state;
    const finalized = this.matchState.phase === "finished"
      ? await this.finalizeFinishedMatch()
      : false;
    const roomReopened = preflight.roomReopened || finalized;

    await this.scheduleCheckpoint(roomReopened);
    await this.scheduleNextAlarm();
    this.broadcastMatchEvents(result.events);
    if (roomReopened) {
      this.broadcastRoomEvent(this.buildRoomReopenedEvent(false));
    }

    return result.result;
  }

  private async handleTickMatch(ws: WebSocket) {
    if (!this.matchState) {
      throw new Error("MATCH_NOT_FOUND");
    }

    const syncResult = await this.syncMatchClock();
    if (syncResult.events.length > 0 || syncResult.roomReopened) {
      await this.scheduleCheckpoint(syncResult.roomReopened);
    }
    this.broadcastMatchEvents(syncResult.events);
    if (syncResult.roomReopened) {
      this.broadcastRoomEvent(this.buildRoomReopenedEvent(false));
    }
    this.sendSnapshotsToSocket(ws);
  }

  private async handleSyncRequest(ws: WebSocket) {
    const syncResult = await this.syncMatchClock();
    if (syncResult.events.length > 0 || syncResult.roomReopened) {
      await this.scheduleCheckpoint(syncResult.roomReopened);
    }
    this.broadcastMatchEvents(syncResult.events);
    if (syncResult.roomReopened) {
      this.broadcastRoomEvent(this.buildRoomReopenedEvent(false));
    }
    this.sendSnapshotsToSocket(ws);
  }

  private async ensureRoomLoaded(roomCode: string, playerId?: string) {
    if (
      this.roomState?.room.code === roomCode &&
      !shouldRefreshRoomMembership(this.roomState, roomCode, playerId ?? "")
    ) {
      return;
    }

    const loaded = await loadCoordinatorState(this.env, roomCode);

    if (!loaded) {
      this.roomState = null;
      this.matchState = null;
      return;
    }

    this.roomState = createRoomEngineState({
      room: loaded.room,
      members: loaded.members,
    });
    this.matchState = loaded.match
      ? {
          ...loaded.match,
          players: loaded.members.map((member) => ({
            playerId: member.playerId,
            team: member.team,
            nickname: member.nickname,
          })),
          protocolSeq: 0,
        }
      : null;
    await this.scheduleCheckpoint(true);
  }

  private requireRoomState() {
    if (!this.roomState) {
      throw new Error("ROOM_NOT_FOUND");
    }

    return this.roomState;
  }

  private readSession(ws: WebSocket): ConnectionState | null {
    return this.sessions.get(ws) ?? (ws as DurableWebSocket).deserializeAttachment();
  }

  private sendCommandResult(
    ws: WebSocket,
    commandId: string,
    ok: boolean,
    message: string,
    matchId?: string,
  ) {
    this.send(ws, {
      type: "command.result",
      payload: {
        commandId,
        ok,
        message,
        matchId,
      },
    });
  }

  private send(ws: WebSocket, message: CoordinatorMessage) {
    ws.send(JSON.stringify(message));
  }

  private sendSnapshotsToSocket(ws: WebSocket) {
    if (!this.roomState) {
      return;
    }

    const session = this.readSession(ws);

    if (!session) {
      return;
    }

    for (const message of buildSnapshotMessages({
      roomState: this.roomState,
      matchState: this.matchState,
      session,
    })) {
      this.send(ws, message);
    }
  }

  private broadcastMatchEvents(events: MatchEvent[]) {
    if (events.length === 0) {
      return;
    }

    const messages = buildMatchEventMessages(events);

    for (const socket of this.ctx.getWebSockets()) {
      for (const message of messages) {
        this.send(socket, message);
      }
    }
  }

  private broadcastRoomEvent(event: RoomEvent) {
    const message = buildRoomEventMessage(event);

    for (const socket of this.ctx.getWebSockets()) {
      this.send(socket, message);
    }
  }

  private buildRoomReopenedEvent(clearMatch: boolean): RoomEvent {
    return {
      type: "room.reopened",
      payload: {
        canStart: this.roomState?.canStart ?? false,
        clearMatch,
      },
    };
  }

  private async persistCheckpointNow(now: number) {
    await this.ctx.storage.put(STORAGE_KEY, {
      roomState: this.roomState,
      matchState: this.matchState,
    } satisfies StoredCoordinatorState);
    this.lastCheckpointAt = now;
  }

  private async scheduleCheckpoint(force = false) {
    const now = Date.now();

    if (!shouldPersistCheckpoint({
      lastPersistedAt: this.lastCheckpointAt,
      now,
      minIntervalMs: CHECKPOINT_THROTTLE_MS,
      force,
    })) {
      return;
    }

    await this.persistCheckpointNow(now);
  }

  private async scheduleNextAlarm() {
    if (!this.matchState || this.matchState.phase === "finished") {
      await this.ctx.storage.deleteAlarm();
      return;
    }

    const countdownAt = Date.parse(this.matchState.countdownEndsAt);
    const questionAt = Date.parse(this.matchState.questionDeadlineAt);
    const matchEndsAt = Date.parse(this.matchState.endsAt);

    let nextAlarm = matchEndsAt;

    if (this.matchState.phase === "countdown") {
      nextAlarm = Math.min(nextAlarm, countdownAt);
    }

    if (this.matchState.phase === "active") {
      nextAlarm = Math.min(nextAlarm, questionAt);
    }

    await this.ctx.storage.setAlarm(nextAlarm);
  }

  private async driveMatchForward(): Promise<MatchProgressResult> {
    if (!this.matchState || this.matchState.phase === "finished") {
      return {
        events: [],
        roomReopened: false,
      };
    }

    let shouldContinue = true;
    const events: MatchEvent[] = [];
    let roomReopened = false;

    while (shouldContinue && this.matchState) {
      const previousPhase = this.matchState.phase;
      const result = tickMatch(this.matchState, Date.now(), mathRandomSource());

      shouldContinue = result.events.length > 0;
      this.matchState = result.state;
      events.push(...result.events);

      if (previousPhase === "countdown" && this.matchState.phase === "active") {
        await markMatchActive(this.env, this.matchState.id);
      }

      if (this.matchState.phase === "finished") {
        roomReopened = await this.finalizeFinishedMatch();
        shouldContinue = false;
      }
    }

    return {
      events,
      roomReopened,
    };
  }

  private async syncMatchClock() {
    if (!this.matchState) {
      return {
        events: [] as MatchEvent[],
        roomReopened: false,
      };
    }

    const progress = await this.driveMatchForward();
    await this.scheduleNextAlarm();
    return progress;
  }

  private async finalizeFinishedMatch() {
    if (!this.matchState || !this.roomState?.room.id) {
      return false;
    }

    const finishedMatch = this.matchState;
    const roomId = this.roomState.room.id;
    const winnerTeam = finishedMatch.winner;
    const winReason = finishedMatch.winReason;

    if (!winnerTeam || !winReason) {
      return false;
    }

    this.roomState = applyRoomAction(this.roomState, { type: "reopen_room" });
    await persistMatchFinish(this.env, {
      roomId,
      match: finishedMatch,
      matchId: finishedMatch.id,
      roomCode: finishedMatch.roomCode,
      winnerTeam,
      winReason,
      durationMs: Date.parse(finishedMatch.endedAt ?? finishedMatch.endsAt) - Date.parse(finishedMatch.createdAt),
      totalCorrect: finishedMatch.totalCorrect,
      finalHp: {
        red: finishedMatch.teams.red.hpCurrent,
        blue: finishedMatch.teams.blue.hpCurrent,
      },
      finalEventLog: finishedMatch.events,
    });

    this.matchState = finishedMatch;
    return true;
  }
}

function mathRandomSource() {
  return {
    next: () => Math.random(),
  };
}
