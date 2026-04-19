import { beforeEach, describe, expect, it, vi } from "vitest";

import { createSequenceRandom } from "../../src/lib/game/questions";
import { createMatchEngine } from "../src/lib/match-engine";
import { persistMatchStart } from "../src/lib/supabase-admin";

describe("persistMatchStart", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("inserts the match before backfilling current_question_id", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(null, {
        status: 201,
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const match = createMatchEngine({
      mode: "1v1",
      roomCode: "Q9JA",
      players: [
        { playerId: "red-1", team: "red", nickname: "kkk" },
        { playerId: "blue-1", team: "blue", nickname: "爸爸" },
      ],
      now: Date.parse("2026-04-19T08:00:00.000Z"),
      random: createSequenceRandom([0.3, 0.1, 0.2126, 0.0795]),
    });

    await persistMatchStart(
      {
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
      },
      {
        roomId: "room-1",
        roomCode: "Q9JA",
        match,
        members: [
          {
            playerId: "red-1",
            nickname: "kkk",
            team: "red",
            joinedAt: "2026-04-19T08:00:00.000Z",
          },
          {
            playerId: "blue-1",
            nickname: "爸爸",
            team: "blue",
            joinedAt: "2026-04-19T08:00:01.000Z",
          },
        ],
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(5);

    const matchInsertCall = fetchMock.mock.calls[0];
    const matchInsertUrl = String(matchInsertCall?.[0]);
    const matchInsertInit = matchInsertCall?.[1] as RequestInit | undefined;
    const matchInsertBody = JSON.parse(String(matchInsertInit?.body));

    expect(matchInsertUrl).toContain("/rest/v1/matches");
    expect(matchInsertInit?.method).toBe("POST");
    expect(matchInsertBody).not.toHaveProperty("current_question_id");

    const questionInsertCall = fetchMock.mock.calls[2];
    const questionInsertUrl = String(questionInsertCall?.[0]);
    expect(questionInsertUrl).toContain("/rest/v1/match_questions");

    const matchPatchCall = fetchMock.mock.calls[3];
    const matchPatchUrl = String(matchPatchCall?.[0]);
    const matchPatchInit = matchPatchCall?.[1] as RequestInit | undefined;
    const matchPatchBody = JSON.parse(String(matchPatchInit?.body));

    expect(matchPatchUrl).toContain(`/rest/v1/matches?id=eq.${match.id}`);
    expect(matchPatchInit?.method).toBe("PATCH");
    expect(matchPatchBody.current_question_id).toBe(match.currentQuestion.key);

    const roomPatchCall = fetchMock.mock.calls[4];
    const roomPatchUrl = String(roomPatchCall?.[0]);
    expect(roomPatchUrl).toContain("/rest/v1/rooms?id=eq.room-1");
  });
});
