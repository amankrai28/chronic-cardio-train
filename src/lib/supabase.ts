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

export type AuthMethod = "oauth" | "byok" | "csv";

export type User = {
  id: string;
  auth_method: AuthMethod;
  strava_athlete_id: number | null;
  strava_access_token: string | null;
  strava_refresh_token: string | null;
  strava_token_expires_at: string | null;
  firstname: string | null;
  lastname: string | null;
  city: string | null;
  country: string | null;
  profile_photo_url: string | null;
  measurement_preference: string | null; // 'feet' | 'meters'
  created_at: string;
  updated_at: string;
};
