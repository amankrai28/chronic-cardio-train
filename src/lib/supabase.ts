import "server-only";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
  );
}

// Service-role client. Server-side only — bypasses RLS, never expose to the browser.
export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export type User = {
  id: string;
  strava_athlete_id: number;
  strava_access_token: string;
  strava_refresh_token: string;
  strava_token_expires_at: string;
  firstname: string | null;
  lastname: string | null;
  city: string | null;
  country: string | null;
  profile_photo_url: string | null;
  created_at: string;
  updated_at: string;
};
