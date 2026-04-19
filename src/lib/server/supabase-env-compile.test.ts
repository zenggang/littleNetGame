import { readFileSync } from "node:fs";
import path from "node:path";

// 这份用例既要被 Vitest 执行，也要被 `tsx --test` 的旧测试入口执行。
// 同时 `src/lib/server` 是单独的 ESM 边界，动态导入可以兼容 legacy runner 对上层 TS 模块的加载形态。  
const isVitestRuntime = Boolean(process.env.VITEST);
const supabaseEnvModule = await import("../supabase/env");
const {
  hasSupabaseEnvConfigured,
  readSupabaseEnv,
} = "default" in supabaseEnvModule
  ? supabaseEnvModule.default
  : supabaseEnvModule;

if (isVitestRuntime) {
  const { describe, expect, it } = await import("vitest");

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
} else {
  const { describe, it } = await import("node:test");
  const assert = await import("node:assert/strict");

  describe("supabase env helpers", () => {
    it("keeps explicit env overrides working for tests and server utilities", () => {
      assert.equal(
        hasSupabaseEnvConfigured({
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        }),
        true,
      );

      assert.deepEqual(
        readSupabaseEnv({
          NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key",
        }),
        {
          url: "https://example.supabase.co",
          anonKey: "anon-key",
        },
      );
    });

    it("uses direct NEXT_PUBLIC env access in source so Next can inline browser values", () => {
      const source = readFileSync(
        path.join(process.cwd(), "src/lib/supabase/env.ts"),
        "utf8",
      );

      assert.match(source, /process\.env\.NEXT_PUBLIC_SUPABASE_URL/);
      assert.match(source, /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/);
      assert.doesNotMatch(
        source,
        /env: Record<string, string \| undefined> = process\.env/,
      );
    });
  });
}
