import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin, type User } from "@/lib/supabase";
import type { AthleteMetricsRow } from "@/lib/metrics";
import { getUnitSystem } from "@/lib/units";

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
      "id, auth_method, strava_athlete_id, firstname, lastname, city, country, profile_photo_url, measurement_preference, created_at",
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

  // Derive the display unit system, then drop the raw preference from the
  // exposed user object — the client only needs unit_system.
  const { measurement_preference, ...publicUser } = user;
  const unit_system = getUnitSystem(measurement_preference);

  // For non-oauth users, surface the snapshot timestamp so the dashboard
  // can show "Snapshot from {date}".
  let snapshot_at: string | null = null;
  if (user.auth_method !== "oauth") {
    const { data: latest } = await supabaseAdmin
      .from("activities")
      .select("fetched_at")
      .eq("user_id", userId)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ fetched_at: string }>();
    snapshot_at = latest?.fetched_at ?? null;
  }

  return NextResponse.json({
    user: publicUser,
    metrics: metrics ?? null,
    unit_system,
    snapshot_at,
  });
}
