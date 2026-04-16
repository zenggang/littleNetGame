import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  hasSupabaseEnvConfigured,
  readSupabaseEnv,
} from "@/lib/supabase/env";

describe("supabase env helpers", () => {
  it("keeps explicit env overrides working for tests and server utilities", () => {
    expect(
      hasSupabaseEnvConfigured({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toBe(true);

    expect(
      readSupabaseEnv({
        NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
      }),
    ).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-key",
    });
  });

  it("uses direct NEXT_PUBLIC env access in source so Next can inline browser values", () => {
    const source = readFileSync(
      path.join(process.cwd(), "src/lib/supabase/env.ts"),
      "utf8",
    );

    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL");
    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY");
    expect(source).not.toContain(
      "env: Record<string, string | undefined> = process.env",
    );
  });
});
