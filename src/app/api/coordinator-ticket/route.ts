import { NextResponse } from "next/server";

import { readCoordinatorEnv } from "@/lib/server/coordinator-env";
import { shouldBridgeCoordinatorBaseUrl } from "@/lib/server/coordinator-public-url";
import { signCoordinatorTicket } from "@/lib/server/coordinator-ticket";

export async function POST(request: Request) {
  try {
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
    const useBridgeMode = shouldBridgeCoordinatorBaseUrl(env.baseUrl);

    return NextResponse.json({
      token,
      url: `${env.baseUrl}/room/${roomCode}/connect`,
      mode: useBridgeMode ? "bridge" : "socket",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN_ERROR";

    if (message.startsWith("Missing COORDINATOR_")) {
      return NextResponse.json(
        {
          error: "COORDINATOR_NOT_READY",
        },
        { status: 503 },
      );
    }

    console.error("Failed to create coordinator ticket", error);
    return NextResponse.json(
      {
        error: "COORDINATOR_TICKET_FAILED",
      },
      { status: 500 },
    );
  }
}
