import type {
  DemoMatch,
  DemoMember,
  DemoPlayerSession,
  DemoRoom,
} from "@/lib/demo/store";
import type { TeamName } from "@/lib/game/types";

export type CoordinatorRoomSnapshot = {
  room: DemoRoom | null;
  members: DemoMember[];
  match: DemoMatch | null;
  viewer: DemoMember | null;
  canStart: boolean;
  session: DemoPlayerSession;
};

export type CoordinatorMatchSnapshot = {
  room: DemoRoom | null;
  members: DemoMember[];
  viewer: DemoMember | null;
  session: DemoPlayerSession;
  match: DemoMatch | null;
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
      type: "command.result";
      payload: {
        commandId: string;
        ok: boolean;
        message: string;
        matchId?: string;
      };
    }
  | {
      type: "session.error";
      payload: {
        message: string;
      };
    };
