import type {
  DemoMatch,
  DemoMember,
  DemoPlayerSession,
  DemoRoom,
} from "@/lib/demo/store";
import type { MatchEvent } from "@/lib/game/protocol/events";
import type { TeamName } from "@/lib/game/types";

export type CoordinatorLiveMatch = DemoMatch & {
  protocolSeq?: number;
};

export type CoordinatorTransportMode = "socket" | "bridge";

export type RoomEvent =
  | {
      type: "room.member_joined";
      payload: {
        member: DemoMember;
        canStart: boolean;
      };
    }
  | {
      type: "room.team_switched";
      payload: {
        playerId: string;
        team: TeamName;
        canStart: boolean;
      };
    }
  | {
      type: "room.match_started";
      payload: {
        matchId: string;
      };
    }
  | {
      type: "room.reopened";
      payload: {
        canStart: boolean;
        clearMatch: boolean;
      };
    };

export type CoordinatorRoomSnapshot = {
  room: DemoRoom | null;
  members: DemoMember[];
  match: CoordinatorLiveMatch | null;
  viewer: DemoMember | null;
  canStart: boolean;
  session: DemoPlayerSession;
};

export type CoordinatorMatchSnapshot = {
  room: DemoRoom | null;
  members: DemoMember[];
  viewer: DemoMember | null;
  session: DemoPlayerSession;
  match: CoordinatorLiveMatch | null;
};

export type CoordinatorCommand =
  | {
      type: "room.join";
      commandId: string;
      payload: {
        nickname: string;
      };
    }
  | {
      type: "room.switch_team";
      commandId: string;
      payload: {
        team: TeamName;
      };
    }
  | {
      type: "room.start_match";
      commandId: string;
    }
  | {
      type: "room.restart";
      commandId: string;
    }
  | {
      type: "match.submit_answer";
      commandId: string;
      payload: {
        answer: {
          value?: string;
          quotient?: string;
          remainder?: string;
        };
      };
    }
  | {
      type: "match.tick";
      commandId: string;
    }
  | {
      type: "sync.request";
      commandId: string;
      payload: {
        reason: "seq_gap" | "manual" | "match_missing";
      };
    };

export type CoordinatorBridgeView = "room" | "match";

export type CoordinatorBridgeCommand =
  | Omit<Extract<CoordinatorCommand, { type: "room.join" }>, "commandId">
  | Omit<Extract<CoordinatorCommand, { type: "room.switch_team" }>, "commandId">
  | Omit<Extract<CoordinatorCommand, { type: "room.start_match" }>, "commandId">
  | Omit<Extract<CoordinatorCommand, { type: "room.restart" }>, "commandId">
  | Omit<Extract<CoordinatorCommand, { type: "match.submit_answer" }>, "commandId">
  | Omit<Extract<CoordinatorCommand, { type: "match.tick" }>, "commandId">;

export type CoordinatorCommandResult = {
  ok: boolean;
  message: string;
  matchId?: string;
};

export type CoordinatorBridgeRequest = {
  view: CoordinatorBridgeView;
  command?: CoordinatorBridgeCommand;
};

export type CoordinatorBridgeResponse = {
  roomSnapshot: CoordinatorRoomSnapshot | null;
  matchSnapshot: CoordinatorMatchSnapshot | null;
  result?: CoordinatorCommandResult;
};

export type CoordinatorTicketResponse = {
  token: string;
  url: string;
  mode?: CoordinatorTransportMode;
};

export type CoordinatorMessage =
  | {
      type: "room.snapshot";
      payload: CoordinatorRoomSnapshot;
    }
  | {
      type: "match.snapshot";
      payload: CoordinatorMatchSnapshot;
    }
  | {
      type: "room.event";
      payload: RoomEvent;
    }
  | {
      type: "match.event";
      payload: MatchEvent;
    }
  | {
      type: "command.result";
      payload: {
        commandId: string;
      } & CoordinatorCommandResult;
    }
  | {
      type: "session.error";
      payload: {
        message: string;
      };
    };
