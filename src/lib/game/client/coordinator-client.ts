function toWebSocketUrl(url: string, token: string) {
  const nextUrl = new URL(url);
  nextUrl.protocol = nextUrl.protocol === "https:" ? "wss:" : "ws:";
  nextUrl.searchParams.set("token", token);

  return nextUrl.toString();
}

async function readTicketResponse(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json() as {
        error?: string;
        token?: string;
        url?: string;
      }
    : null;

  if (!response.ok) {
    throw new Error(payload?.error || "COORDINATOR_CONNECT_BOOTSTRAP_FAILED");
  }

  if (!payload?.url || !payload?.token) {
    throw new Error("COORDINATOR_CONNECT_BOOTSTRAP_FAILED");
  }

  return payload as {
    url: string;
    token: string;
  };
}

export async function openCoordinatorSocket(input: {
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

  const data = await readTicketResponse(response);
  return new WebSocket(toWebSocketUrl(data.url, data.token));
}
