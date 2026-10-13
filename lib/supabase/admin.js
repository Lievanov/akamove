import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-only client with the service role key. Never import this from
// client components — it bypasses RLS.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default supabaseAdmin;
