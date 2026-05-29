import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForToken,
  fetchAllActivities,
  StravaRateLimitError,
  type StravaActivity,
  type StravaClientCredentials,
} from "@/lib/strava";
import {
  consumeOAuthState,
  consumePendingStravaCreds,
  setSession,
} from "@/lib/session";
import { supabaseAdmin, type AuthMethod } from "@/lib/supabase";
import { computeAllMetrics } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const UPSERT_CHUNK = 500;

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;

  const error = params.get("error");
  if (error) {
    return NextResponse.redirect(new URL("/?auth=denied", origin));
  }

  const code = params.get("code");
  const state = params.get("state");

  if (!code) {
    return NextResponse.redirect(new URL("/?auth=missing_code", origin));
  }

  const stateValid = await consumeOAuthState(state);
  if (!stateValid) {
    return NextResponse.redirect(new URL("/?auth=invalid_state", origin));
  }

  // Path A: pending creds from /api/auth/strava/path-a. Always read +
  // delete the cookie, even on the env-var path, so it doesn't linger.
  const pendingCreds = await consumePendingStravaCreds();
  const authMethod: AuthMethod = pendingCreds ? "byok" : "oauth";
  const credsForExchange: StravaClientCredentials | undefined = pendingCreds ?? undefined;

  try {
    const token = await exchangeCodeForToken(code, credsForExchange);
    const athlete = token.athlete;
    if (!athlete) {
      return NextResponse.redirect(new URL("/?auth=no_athlete", origin));
    }

    const expiresAt = new Date(token.expires_at * 1000).toISOString();

    const { data, error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          auth_method: authMethod,
          strava_athlete_id: athlete.id,
          strava_access_token: token.access_token,
          // For BYOK we still store the refresh_token Strava issued, but
          // getFreshAccessToken won't use it (no client_secret to refresh
          // with). For oauth users it's used normally.
          strava_refresh_token: token.refresh_token,
          strava_token_expires_at: expiresAt,
          firstname: athlete.firstname,
          lastname: athlete.lastname,
          city: athlete.city,
          country: athlete.country,
          profile_photo_url: athlete.profile,
          measurement_preference: athlete.measurement_preference ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "strava_athlete_id" },
      )
      .select("id")
      .single();

    if (upsertError || !data) {
      console.error("Supabase upsert failed:", upsertError);
      return NextResponse.redirect(new URL("/?auth=db_error", origin));
    }

    const userId = data.id as string;
    await setSession(userId);

    // BYOK: pull the full activity snapshot RIGHT NOW while the access
    // token is fresh. After this, the token will expire and we can't
    // refresh (no stored secret), so this one-shot capture is the
    // user's data until they re-run Path A.
    //
    // For oauth users the existing dashboard sync path handles fetching
    // — we don't duplicate it here to keep the redirect snappy.
    if (authMethod === "byok") {
      try {
        const activities = await fetchAllActivities(token.access_token);
        await persistActivities(userId, activities);
      } catch (syncErr) {
        if (syncErr instanceof StravaRateLimitError) {
          // Rare: user hit limit during initial fetch. They can re-run
          // Path A later — for now just send them to the dashboard.
          console.warn("BYOK initial sync rate-limited:", syncErr);
        } else {
          console.error("BYOK initial sync failed:", syncErr);
        }
      }
    }

    return NextResponse.redirect(new URL("/dashboard", origin));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?auth=error", origin));
  }
}

async function persistActivities(userId: string, activities: StravaActivity[]) {
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
    if (error) throw new Error(`Activity upsert failed: ${error.message}`);
  }

  const metrics = computeAllMetrics(activities, { id: userId });
  const { error: metricsError } = await supabaseAdmin
    .from("athlete_metrics")
    .upsert(metrics, { onConflict: "user_id" });
  if (metricsError) {
    throw new Error(`Metrics upsert failed: ${metricsError.message}`);
  }
}
