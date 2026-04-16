import { createClient } from "@supabase/supabase-js";

import {
  hasSupabaseEnvConfigured,
  readSupabaseEnv,
} from "@/lib/supabase/env";

let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!hasSupabaseEnvConfigured()) {
    return null;
  }

  if (!browserClient) {
    const supabaseEnv = readSupabaseEnv();
    browserClient = createClient(supabaseEnv.url, supabaseEnv.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return browserClient;
}
