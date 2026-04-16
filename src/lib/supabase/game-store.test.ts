import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  startAuthedSubscription,
  toUserMessage,
} from "@/lib/supabase/game-store";

describe("supabase realtime subscription", () => {
  it("sets realtime auth before subscribing to a channel", async () => {
    const calls: string[] = [];
    const client = {
      realtime: {
        setAuth(token: string) {
          calls.push(`setAuth:${token}`);
        },
      },
    };
    const channel = {
      subscribe() {
        calls.push("subscribe");
      },
    };

    await startAuthedSubscription(
      client,
      channel,
      async () => ({ access_token: "token-123" }),
    );

    assert.deepEqual(calls, ["setAuth:token-123", "subscribe"]);
  });

  it("returns a local-setup hint when supabase env is missing", () => {
    assert.match(
      toUserMessage(new Error("SUPABASE_NOT_CONFIGURED")),
      /复制 \.env\.example 到 \.env\.local/,
    );
  });
});
