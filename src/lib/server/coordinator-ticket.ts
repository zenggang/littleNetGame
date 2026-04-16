import { createHmac, timingSafeEqual } from "node:crypto";

type TicketPayload = {
  playerId: string;
  nickname: string;
  roomCode: string;
};

function encodeTicketPayload(payload: TicketPayload) {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function signBody(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

export async function signCoordinatorTicket(
  payload: TicketPayload,
  secret: string,
) {
  const body = encodeTicketPayload(payload);
  const signature = signBody(body, secret);

  return `${body}.${signature}`;
}

export async function verifyCoordinatorTicket(
  token: string,
  secret: string,
) {
  const [body, signature] = token.split(".");
  const expectedSignature = signBody(body, secret);

  if (!body || !signature) {
    throw new Error("Invalid coordinator ticket");
  }

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw new Error("Invalid coordinator ticket");
  }

  return JSON.parse(
    Buffer.from(body, "base64url").toString("utf8"),
  ) as TicketPayload;
}
