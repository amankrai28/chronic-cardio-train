import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForToken } from "@/lib/strava";
import { consumeOAuthState, setSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const params = request.nextUrl.searchParams;

  const error = params.get("error");
  if (error) {
    // User denied access on the Strava consent screen.
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

  try {
    const token = await exchangeCodeForToken(code);
    const athlete = token.athlete;
    if (!athlete) {
      return NextResponse.redirect(new URL("/?auth=no_athlete", origin));
    }

    const expiresAt = new Date(token.expires_at * 1000).toISOString();

    const { data, error: upsertError } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          strava_athlete_id: athlete.id,
          strava_access_token: token.access_token,
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

    await setSession(data.id);
    return NextResponse.redirect(new URL("/dashboard", origin));
  } catch (err) {
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(new URL("/?auth=error", origin));
  }
}
