type RoomSession = {
  playerId: string;
  roomCode: string;
};

type DurableWebSocket = WebSocket & {
  accept: () => void;
};

declare const WebSocketPair: {
  new (): {
    0: DurableWebSocket;
    1: DurableWebSocket;
  };
};

type DurableObjectStateLike = {
  acceptWebSocket?: (socket: DurableWebSocket) => void;
};

export class MatchRoom {
  private ctx: DurableObjectStateLike;
  private sessions = new Map<DurableWebSocket, RoomSession>();

  constructor(ctx: DurableObjectStateLike) {
    this.ctx = ctx;
  }

  async fetch(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const url = new URL(request.url);

    if (this.ctx.acceptWebSocket) {
      this.ctx.acceptWebSocket(server);
    } else {
      server.accept();
    }

    this.sessions.set(server, {
      playerId: url.searchParams.get("playerId") ?? "pending",
      roomCode: url.pathname.split("/")[2] ?? "pending",
    });
    server.send(JSON.stringify({ type: "room.connected" }));

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit & { webSocket: WebSocket });
  }
}
