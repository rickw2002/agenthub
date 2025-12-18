import { createClient } from "@supabase/supabase-js";

let _supabaseAdmin: ReturnType<typeof createClient> | null = null;

// Create Supabase client with service role key for server-side operations
// This bypasses RLS (Row Level Security) and should only be used server-side
// Lazy initialization to avoid build-time errors when env vars are not set
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient>, {
  get(_target, prop) {
    if (!_supabaseAdmin) {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl) {
        throw new Error("Missing env var: SUPABASE_URL");
      }

      if (!supabaseServiceRoleKey) {
        throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");
      }

      _supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    return (_supabaseAdmin as any)[prop];
  },
});

