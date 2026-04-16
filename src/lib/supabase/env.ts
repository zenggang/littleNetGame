export function hasSupabaseEnvConfigured(
  env: Record<string, string | undefined> = process.env,
) {
  return Boolean(
    env.NEXT_PUBLIC_SUPABASE_URL &&
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function readSupabaseEnv(
  env: Record<string, string | undefined> = process.env,
) {
  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  };
}

export const hasSupabaseEnv = hasSupabaseEnvConfigured();

export const supabaseEnv = readSupabaseEnv();
