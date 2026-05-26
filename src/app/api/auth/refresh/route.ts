import { NextResponse } from "next/server";
import { refreshAccessToken } from "@/lib/strava";
import { getSession } from "@/lib/session";
import { supabaseAdmin, type User } from "@/lib/supabase";

export const dynamic = "force-dynamic";

const REFRESH_SKEW_MS = 5 * 60 * 1000; // refresh if expiring within 5 minutes

/**
 * Refresh the current user's Strava access token if it is expired (or close to
 * it) and persist the new tokens. Consumed by Session 2 sync logic.
 */
export async function POST() {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data: user, error } = await supabaseAdmin
    .from("users")
    .select("*")
    .eq("id", userId)
    .single<User>();

  if (error || !user) {
    return NextResponse.json({ error: "user_not_found" }, { status: 404 });
  }

  const expiresAtMs = new Date(user.strava_token_expires_at).getTime();
  if (expiresAtMs - Date.now() > REFRESH_SKEW_MS) {
    return NextResponse.json({ refreshed: false });
  }

  try {
    const token = await refreshAccessToken(user.strava_refresh_token);
    const expiresAt = new Date(token.expires_at * 1000).toISOString();

    const { error: updateError } = await supabaseAdmin
      .from("users")
      .update({
        strava_access_token: token.access_token,
        strava_refresh_token: token.refresh_token,
        strava_token_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (updateError) {
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
    return NextResponse.json({ refreshed: true });
  } catch (err) {
    console.error("Token refresh error:", err);
    return NextResponse.json({ error: "refresh_failed" }, { status: 502 });
  }
}
