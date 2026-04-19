import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  extractRoomCodeFromUrl,
  normalizeBaseUrl,
} from "./smoke-prod-lib.mjs";

describe("smoke-prod-lib", () => {
  it("extracts a room code from a room URL", () => {
    assert.equal(
      extractRoomCodeFromUrl("https://math.pigou.top/room/ABCD"),
      "ABCD",
    );
  });

  it("throws when the room URL does not contain a room code", () => {
    assert.throws(
      () => extractRoomCodeFromUrl("https://math.pigou.top/"),
      /ROOM_CODE_NOT_FOUND/,
    );
  });

  it("falls back to the production domain when base url is empty", () => {
    assert.equal(normalizeBaseUrl(""), "https://math.pigou.top");
    assert.equal(normalizeBaseUrl(undefined), "https://math.pigou.top");
  });
});
