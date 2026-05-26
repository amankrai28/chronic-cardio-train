import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin, type User } from "@/lib/supabase";
import type { AthleteMetricsRow } from "@/lib/metrics";

export const dynamic = "force-dynamic";

// Returns the current user's profile + computed metrics. Powers the dashboard.
// Never exposes Strava tokens (own-data only, Strava agreement §2.10).
export async function GET() {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select(
      "id, strava_athlete_id, firstname, lastname, city, country, profile_photo_url, created_at",
    )
    .eq("id", userId)
    .single<Omit<User, "strava_access_token" | "strava_refresh_token" | "strava_token_expires_at" | "updated_at">>();

  if (userError || !user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const { data: metrics } = await supabaseAdmin
    .from("athlete_metrics")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<AthleteMetricsRow>();

  return NextResponse.json({ user, metrics: metrics ?? null });
}
