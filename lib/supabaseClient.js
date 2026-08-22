import { createClient } from "@supabase/supabase-js";

// These two values come from Supabase: Project Settings > API Keys > Legacy API Keys.
// They are set in Vercel (or a local .env.local file) as:
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
// The anon key is safe to expose in the browser: every table it can touch is
// protected by the row-level security policies in schema.sql, so a logged-in
// state lead's key can only ever read or change their own state's rows.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // This surfaces as a clear message in the browser console rather than a
  // confusing blank page if the two environment variables haven't been set
  // yet, either locally or in Vercel.
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
      "Set these in .env.local (for local testing) or in your Vercel project's Environment Variables (for the live site)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
