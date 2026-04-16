type CoordinatorTicketPayload = {
  playerId: string;
  nickname: string;
  roomCode: string;
};

/**
 * Worker 侧使用 Web Crypto 校验 Next API 生成的 HMAC ticket。
 * 这样 WebSocket 建连时就能拿到可信的 playerId / nickname / roomCode，
 * 后续所有房间命令都不再接受客户端自行上送的身份字段。
 */
export async function verifyCoordinatorTicket(
  token: string,
  secret: string,
): Promise<CoordinatorTicketPayload> {
  const [body, signature] = token.split(".");

  if (!body || !signature) {
    throw new Error("Invalid coordinator ticket");
  }

  const secretKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    new TextEncoder().encode(body),
  );
  const expected = toBase64Url(new Uint8Array(digest));

  if (!timingSafeEqual(expected, signature)) {
    throw new Error("Invalid coordinator ticket");
  }

  return JSON.parse(
    new TextDecoder().decode(fromBase64Url(body)),
  ) as CoordinatorTicketPayload;
}

function toBase64Url(bytes: Uint8Array) {
  let base64 = "";

  for (let index = 0; index < bytes.length; index += 1) {
    base64 += String.fromCharCode(bytes[index]!);
  }

  return btoa(base64).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4 === 0
    ? ""
    : "=".repeat(4 - (normalized.length % 4));
  const decoded = atob(normalized + padding);
  const bytes = new Uint8Array(decoded.length);

  for (let index = 0; index < decoded.length; index += 1) {
    bytes[index] = decoded.charCodeAt(index);
  }

  return bytes;
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return mismatch === 0;
}
