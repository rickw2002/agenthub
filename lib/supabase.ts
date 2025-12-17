import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing env var: SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing env var: SUPABASE_SERVICE_ROLE_KEY");
}

// Create Supabase client with service role key for server-side operations
// This bypasses RLS (Row Level Security) and should only be used server-side
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

