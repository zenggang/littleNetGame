import type {
  CoordinatorBridgeCommand,
  CoordinatorBridgeResponse,
  CoordinatorBridgeView,
  CoordinatorTicketResponse,
} from "@/lib/game/protocol/coordinator";

function toWebSocketUrl(url: string, token: string) {
  const nextUrl = new URL(url);
  nextUrl.protocol = nextUrl.protocol === "https:" ? "wss:" : "ws:";
  nextUrl.searchParams.set("token", token);

  return nextUrl.toString();
}

async function readTicketResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json() as (CoordinatorTicketResponse & { error?: string })
    : null;

  if (!response.ok) {
    throw new Error(payload?.error || "COORDINATOR_CONNECT_BOOTSTRAP_FAILED");
  }

  if (!payload?.url || !payload?.token) {
    throw new Error("COORDINATOR_CONNECT_BOOTSTRAP_FAILED");
  }

  return payload;
}

export async function bootstrapCoordinatorTransport(input: {
  roomCode: string;
  playerId: string;
  nickname: string;
}) {
  const response = await fetch("/api/coordinator-ticket", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return readTicketResponse(response);
}

export async function openCoordinatorSocket(input: {
  roomCode: string;
  playerId: string;
  nickname: string;
}) {
  const data = await bootstrapCoordinatorTransport(input);

  if (data.mode === "bridge") {
    throw new Error("COORDINATOR_HTTP_BRIDGE_REQUIRED");
  }

  return new WebSocket(toWebSocketUrl(data.url, data.token));
}

export async function callCoordinatorBridge(input: {
  roomCode: string;
  playerId: string;
  nickname: string;
  view: CoordinatorBridgeView;
  command?: CoordinatorBridgeCommand;
}) {
  const response = await fetch(`/api/coordinator-bridge/room/${input.roomCode}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      playerId: input.playerId,
      nickname: input.nickname,
      view: input.view,
      command: input.command,
    }),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json() as (CoordinatorBridgeResponse & { error?: string })
    : null;

  if (!response.ok || !payload) {
    throw new Error(payload?.error || "COORDINATOR_BRIDGE_FAILED");
  }

  return payload;
}
