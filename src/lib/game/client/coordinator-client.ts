function toWebSocketUrl(url: string, token: string) {
  const nextUrl = new URL(url);
  nextUrl.protocol = nextUrl.protocol === "https:" ? "wss:" : "ws:";
  nextUrl.searchParams.set("token", token);

  return nextUrl.toString();
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

  const data = (await response.json()) as { url: string; token: string };
  return new WebSocket(toWebSocketUrl(data.url, data.token));
}
