import { NextRequest, NextResponse } from "next/server";
import {
  fetchAllActivities,
  getFreshAccessToken,
  StravaRateLimitError,
  type StravaActivity,
} from "@/lib/strava";
import { getSession } from "@/lib/session";
import { supabaseAdmin, type User } from "@/lib/supabase";
import { computeAllMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

// Strava API agreement §7.1: cached activity data must not persist longer than
// 7 days. We re-sync when the cache is older than this; fresh caches are skipped.
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const UPSERT_CHUNK = 500;

export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: user, error: userError } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single<User>();

  if (userError || !user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const force = request.nextUrl.searchParams.get("force") === "true";

  if (!force) {
    const { data: latest } = await supabaseAdmin
      .from("activities")
      .select("fetched_at")
      .eq("user_id", userId)
      .order("fetched_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ fetched_at: string }>();

    if (latest?.fetched_at) {
      const ageMs = Date.now() - new Date(latest.fetched_at).getTime();
      if (ageMs < CACHE_TTL_MS) {
        return NextResponse.json({
          activities_synced: 0,
          metrics_computed: false,
          skipped: true,
          reason: "cache_fresh",
        });
      }
    }
  }

  let activities: StravaActivity[];
  try {
    const accessToken = await getFreshAccessToken(user);
    activities = await fetchAllActivities(accessToken);
  } catch (err) {
    if (err instanceof StravaRateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    console.error("Strava sync failed:", err);
    return NextResponse.json({ error: "sync_failed" }, { status: 502 });
  }

  const fetchedAt = new Date().toISOString();
  const rows = activities.map((a) => ({
    id: a.id,
    user_id: userId,
    type: a.type,
    name: a.name,
    start_date: a.start_date,
    distance: a.distance,
    moving_time: a.moving_time,
    elapsed_time: a.elapsed_time,
    total_elevation_gain: a.total_elevation_gain,
    average_heartrate: a.average_heartrate,
    max_heartrate: a.max_heartrate,
    suffer_score: a.suffer_score,
    fetched_at: fetchedAt,
  }));

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabaseAdmin
      .from("activities")
      .upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error("Activity upsert failed:", error);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  }

  const metrics = computeAllMetrics(activities, user);
  const { error: metricsError } = await supabaseAdmin
    .from("athlete_metrics")
    .upsert(metrics, { onConflict: "user_id" });

  if (metricsError) {
    console.error("Metrics upsert failed:", metricsError);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({
    activities_synced: activities.length,
    metrics_computed: true,
  });
}
