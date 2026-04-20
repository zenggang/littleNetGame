import type {
  CoordinatorMatchSnapshot,
  CoordinatorRoomSnapshot,
  RoomEvent,
} from "@/lib/game/protocol/coordinator";
import type { MatchEvent } from "@/lib/game/protocol/events";
import type { DemoMatchEvent, DemoMember } from "@/lib/demo/store";
import type { TeamName } from "@/lib/game/types";

/**
 * coordinator 在 event-first 模式下不再为每次高频变化都广播完整 snapshot。
 * 这些 helper 负责把协议事件稳定投影到页面仍在消费的 snapshot 结构里，
 * 让 UI 能在过渡期内继续复用现有 view-model 和页面代码。
 */

export function applyMatchEventToSnapshot(
  snapshot: CoordinatorMatchSnapshot | null,
  event: MatchEvent,
) {
  if (!snapshot?.match) {
    return snapshot;
  }

  if ((snapshot.match.protocolSeq ?? 0) >= event.seq) {
    return snapshot;
  }

  const match = structuredClone(snapshot.match);
  match.protocolSeq = event.seq;

  if (event.type === "match.question_opened") {
    const questionChanged = match.currentQuestion.key !== event.payload.question.id;

    match.phase = "active";
    match.currentQuestion = {
      key: event.payload.question.id,
      difficulty: event.payload.question.difficulty,
      type: event.payload.question.type,
      prompt: event.payload.question.prompt,
      answerKind: event.payload.question.inputSchema,
      damage: event.payload.question.damage,
      correctAnswer: event.payload.question.correctAnswer,
      meta: event.payload.question.meta,
    };
    match.questionDeadlineAt = event.payload.question.deadlineAt;
    match.questionIndex = questionChanged ? match.questionIndex + 1 : match.questionIndex;

    prependLog(match.events, {
      id: buildEventId(event, "question_spawned"),
      type: "question_spawned",
      text: `第 ${match.questionIndex} 题：${event.payload.question.prompt}`,
      createdAt: new Date(event.serverTime).toISOString(),
    });

    return {
      ...snapshot,
      match,
    };
  }

  if (event.type === "match.answer_resolved") {
    match.teams.red.hpCurrent = event.payload.hp.red;
    match.teams.blue.hpCurrent = event.payload.hp.blue;
    match.totalCorrect[event.payload.attackerTeam] += 1;
    match.lastHitTeam = event.payload.attackerTeam;

    prependHpChangedLog(
      match.events,
      event,
      event.payload.attackerTeam,
      event.payload.targetTeam,
      event.payload.damage,
      match.teams.red.hpCurrent,
      match.teams.blue.hpCurrent,
    );
    prependLog(match.events, {
      id: buildEventId(event, "answer_correct"),
      type: "answer_correct",
      text: `${renderTeamLabel(event.payload.attackerTeam)}抢先答对了，发起进攻！`,
      team: event.payload.attackerTeam,
      targetTeam: event.payload.targetTeam,
      damage: event.payload.damage,
      createdAt: new Date(event.serverTime).toISOString(),
    });

    return {
      ...snapshot,
      match,
    };
  }

  if (event.type === "match.answer_rejected") {
    match.teams.red.hpCurrent = event.payload.hp.red;
    match.teams.blue.hpCurrent = event.payload.hp.blue;
    match.cooldowns[event.payload.playerId] = event.payload.cooldownUntil;

    prependHpChangedLog(
      match.events,
      event,
      event.payload.team,
      event.payload.team,
      event.payload.damage,
      match.teams.red.hpCurrent,
      match.teams.blue.hpCurrent,
    );
    prependLog(match.events, {
      id: buildEventId(event, "answer_wrong"),
      type: "answer_wrong",
      text: `${renderTeamLabel(event.payload.team)}答错了，自己吃到 ${event.payload.damage} 点反噬。`,
      team: event.payload.team,
      targetTeam: event.payload.team,
      damage: event.payload.damage,
      createdAt: new Date(event.serverTime).toISOString(),
    });

    return {
      ...snapshot,
      match,
    };
  }

  if (event.type === "match.question_timed_out") {
    match.teams.red.hpCurrent = event.payload.hp.red;
    match.teams.blue.hpCurrent = event.payload.hp.blue;

    prependHpChangedLog(
      match.events,
      event,
      undefined,
      undefined,
      event.payload.damage,
      match.teams.red.hpCurrent,
      match.teams.blue.hpCurrent,
    );
    prependLog(match.events, {
      id: buildEventId(event, "question_timeout"),
      type: "question_timeout",
      text: "这题没人答对，双方都掉血了。",
      createdAt: new Date(event.serverTime).toISOString(),
    });

    return {
      ...snapshot,
      match,
    };
  }

  match.phase = "finished";
  match.winner = event.payload.winner;
  match.winReason = event.payload.reason;
  match.endedAt = new Date(event.serverTime).toISOString();
  prependLog(match.events, {
    id: buildEventId(event, "match_finished"),
    type: "match_finished",
    text: `${renderTeamLabel(event.payload.winner)}获胜！`,
    team: event.payload.winner,
    createdAt: match.endedAt,
  });

  return {
    ...snapshot,
    match,
  };
}

export function applyRoomEventToRoomSnapshot(
  snapshot: CoordinatorRoomSnapshot | null,
  event: RoomEvent,
) {
  if (!snapshot?.room) {
    return snapshot;
  }

  const next = structuredClone(snapshot);
  const room = next.room;

  if (!room) {
    return next;
  }

  if (event.type === "room.member_joined") {
    upsertMember(next.members, event.payload.member);
    next.canStart = event.payload.canStart;
  } else if (event.type === "room.team_switched") {
    const member = next.members.find((entry) => entry.playerId === event.payload.playerId);
    if (member) {
      member.team = event.payload.team;
    }
    next.canStart = event.payload.canStart;
  } else if (event.type === "room.match_started") {
    room.status = "locked";
    room.activeMatchId = event.payload.matchId;
    next.canStart = false;
  } else {
    room.status = "open";
    room.activeMatchId = null;
    next.canStart = event.payload.canStart;
  }

  next.viewer = next.members.find(
    (member) => member.playerId === snapshot.session.playerId,
  ) ?? null;

  return next;
}

export function applyRoomEventToMatchSnapshot(
  snapshot: CoordinatorMatchSnapshot | null,
  event: RoomEvent,
) {
  if (!snapshot?.room) {
    return snapshot;
  }

  const next = structuredClone(snapshot);
  const room = next.room;

  if (!room) {
    return next;
  }

  if (event.type === "room.member_joined") {
    upsertMember(next.members, event.payload.member);
  } else if (event.type === "room.team_switched") {
    const member = next.members.find((entry) => entry.playerId === event.payload.playerId);
    if (member) {
      member.team = event.payload.team;
    }
  } else if (event.type === "room.match_started") {
    room.status = "locked";
    room.activeMatchId = event.payload.matchId;
  } else {
    room.status = "open";
    room.activeMatchId = null;
    if (event.payload.clearMatch) {
      next.match = null;
    }
  }

  next.viewer = next.members.find(
    (member) => member.playerId === snapshot.session.playerId,
  ) ?? null;

  return next;
}

function prependHpChangedLog(
  events: DemoMatchEvent[],
  event: MatchEvent,
  team: TeamName | undefined,
  targetTeam: TeamName | undefined,
  damage: number,
  redHp: number,
  blueHp: number,
) {
  prependLog(events, {
    id: buildEventId(event, "hp_changed"),
    type: "hp_changed",
    text: `红队 ${redHp} / 蓝队 ${blueHp}`,
    team,
    targetTeam,
    damage,
    createdAt: new Date(event.serverTime).toISOString(),
  });
}

function prependLog(events: DemoMatchEvent[], entry: DemoMatchEvent) {
  events.unshift(entry);
}

function upsertMember(members: DemoMember[], member: DemoMember) {
  const existing = members.find((entry) => entry.playerId === member.playerId);

  if (existing) {
    existing.nickname = member.nickname;
    existing.team = member.team;
    existing.joinedAt = member.joinedAt;
    return;
  }

  members.push(member);
}

function buildEventId(event: MatchEvent, suffix: DemoMatchEvent["type"]) {
  return `protocol-${event.seq}-${suffix}`;
}

function renderTeamLabel(team: TeamName) {
  return team === "red" ? "红队" : "蓝队";
}
