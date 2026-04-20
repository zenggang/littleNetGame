import { NextResponse } from "next/server";

import type {
  CoordinatorBridgeRequest,
} from "@/lib/game/protocol/coordinator";
import { readCoordinatorEnv } from "@/lib/server/coordinator-env";
import { signCoordinatorTicket } from "@/lib/server/coordinator-ticket";

type RouteContext = {
  params: Promise<{
    code: string;
  }>;
};

/**
 * 浏览器只访问主站同域 bridge，由服务端代签名并代调 coordinator。
 * 这样即使客户端网络直连不了 `*.workers.dev`，实时房间和对战仍能继续走统一链路。
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const { code } = await context.params;
    const roomCode = String(code ?? "").toUpperCase();
    const body = await request.json() as {
      playerId: string;
      nickname: string;
      view: CoordinatorBridgeRequest["view"];
      command?: CoordinatorBridgeRequest["command"];
    };
    const env = readCoordinatorEnv();
    const token = await signCoordinatorTicket(
      {
        playerId: body.playerId,
        nickname: body.nickname,
        roomCode,
      },
      env.sharedSecret,
    );
    const upstreamUrl = new URL(`${env.baseUrl.replace(/\/+$/, "")}/room/${roomCode}/bridge`);
    upstreamUrl.searchParams.set("token", token);

    const upstreamResponse = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        view: body.view,
        command: body.command,
      } satisfies CoordinatorBridgeRequest),
    });
    const payload = await upstreamResponse.text();

    return new NextResponse(payload, {
      status: upstreamResponse.status,
      headers: {
        "content-type": upstreamResponse.headers.get("content-type") ?? "application/json",
      },
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

    console.error("Failed to bridge coordinator request", error);
    return NextResponse.json(
      {
        error: "COORDINATOR_BRIDGE_FAILED",
      },
      { status: 502 },
    );
  }
}
