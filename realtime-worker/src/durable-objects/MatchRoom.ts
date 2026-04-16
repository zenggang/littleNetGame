type RoomSession = {
  playerId: string;
  roomCode: string;
};

type DurableObjectStateLike = {
  acceptWebSocket?: (socket: WebSocket) => void;
};

export class MatchRoom {
  private ctx: DurableObjectStateLike;
  private sessions = new Map<WebSocket, RoomSession>();

  constructor(ctx: DurableObjectStateLike) {
    this.ctx = ctx;
  }

  async fetch(): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    if (this.ctx.acceptWebSocket) {
      this.ctx.acceptWebSocket(server);
    } else {
      server.accept();
    }

    this.sessions.set(server, {
      playerId: "pending",
      roomCode: "pending",
    });
    server.send(JSON.stringify({ type: "room.connected" }));

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as ResponseInit & { webSocket: WebSocket });
  }
}
