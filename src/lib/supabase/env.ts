export function hasSupabaseEnvConfigured(
  env?: Record<string, string | undefined>,
) {
  if (env) {
    return Boolean(
      env.NEXT_PUBLIC_SUPABASE_URL &&
        env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    );
  }

  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function readSupabaseEnv(
  env?: Record<string, string | undefined>,
) {
  if (env) {
    return {
      url: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    };
  }

  return {
    /**
     * 对浏览器可见的 Supabase 环境变量必须通过显式的 `process.env.KEY` 读取。
     *
     * Next.js 会在构建客户端 bundle 时对 `NEXT_PUBLIC_*` 做静态内联。
     * 如果把整个 `process.env` 当成对象再传入 helper，线上客户端可能拿到空对象，
     * 从而把真实的远程环境误判成“本地 Demo 模式”。
     */
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

export const hasSupabaseEnv = hasSupabaseEnvConfigured();

export const supabaseEnv = readSupabaseEnv();
