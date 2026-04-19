const DEFAULT_BASE_URL = "https://math.pigou.top";

export function normalizeBaseUrl(input) {
  const value = typeof input === "string" ? input.trim() : "";
  return value || DEFAULT_BASE_URL;
}

export function extractRoomCodeFromUrl(url) {
  const match = /\/room\/([A-Z0-9]{4})$/i.exec(url);

  if (!match?.[1]) {
    throw new Error(`ROOM_CODE_NOT_FOUND: ${url}`);
  }

  return match[1].toUpperCase();
}
