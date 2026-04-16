import { NextResponse } from "next/server";

import { readCoordinatorEnv } from "@/lib/server/coordinator-env";
import { signCoordinatorTicket } from "@/lib/server/coordinator-ticket";

export async function POST(request: Request) {
  const { nickname, playerId, roomCode } = (await request.json()) as {
    playerId: string;
    nickname: string;
    roomCode: string;
  };

  const env = readCoordinatorEnv();
  const token = await signCoordinatorTicket(
    {
      playerId,
      nickname,
      roomCode,
    },
    env.sharedSecret,
  );

  return NextResponse.json({
    token,
    url: `${env.baseUrl}/room/${roomCode}/connect`,
  });
}
