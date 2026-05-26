import { supabaseAdmin, type User } from "@/lib/supabase";

export const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
export const STRAVA_API_BASE = "https://www.strava.com/api/v3";
export const STRAVA_SCOPES = "read_all,activity:read_all,profile:read_all";

// Refresh if the access token expires within this window (matches refresh route).
const REFRESH_SKEW_MS = 5 * 60 * 1000;

export type StravaAthlete = {
  id: number;
  firstname: string | null;
  lastname: string | null;
  city: string | null;
  country: string | null;
  profile: string | null;
};

export type StravaTokenResponse = {
  token_type: string;
  expires_at: number; // unix seconds
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete?: StravaAthlete;
};

function requireClientCredentials() {
  const clientId = process.env.STRAVA_CLIENT_ID;
  const clientSecret = process.env.STRAVA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error(
      "Missing STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET environment variables.",
    );
  }
  return { clientId, clientSecret };
}

function redirectUri() {
  const uri = process.env.NEXT_PUBLIC_STRAVA_REDIRECT_URI;
  if (!uri) {
    throw new Error("Missing NEXT_PUBLIC_STRAVA_REDIRECT_URI environment variable.");
  }
  return uri;
}

export function buildAuthorizeUrl(state: string): string {
  const { clientId } = requireClientCredentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    approval_prompt: "auto",
    scope: STRAVA_SCOPES,
    state,
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

export async function exchangeCodeForToken(
  code: string,
): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = requireClientCredentials();
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Strava token exchange failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as StravaTokenResponse;
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<StravaTokenResponse> {
  const { clientId, clientSecret } = requireClientCredentials();
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Strava token refresh failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as StravaTokenResponse;
}

/**
 * Return a usable access token for the given user, refreshing first if the
 * stored token is expired (or within the skew window) and persisting the new
 * tokens to Supabase. Call this before any Strava API request.
 */
export async function getFreshAccessToken(user: User): Promise<string> {
  const expiresAtMs = new Date(user.strava_token_expires_at).getTime();
  if (expiresAtMs - Date.now() > REFRESH_SKEW_MS) {
    return user.strava_access_token;
  }

  const token = await refreshAccessToken(user.strava_refresh_token);
  const expiresAt = new Date(token.expires_at * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("users")
    .update({
      strava_access_token: token.access_token,
      strava_refresh_token: token.refresh_token,
      strava_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    throw new Error(`Failed to persist refreshed Strava token: ${error.message}`);
  }
  return token.access_token;
}

// --- Activity sync -------------------------------------------------------

/** Shape we cache in the `activities` table (distance in meters). */
export type StravaActivity = {
  id: number;
  name: string | null;
  type: string;
  start_date: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number | null;
  average_heartrate: number | null;
  max_heartrate: number | null;
  suffer_score: number | null;
};

export class StravaRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StravaRateLimitError";
  }
}

type RawStravaActivity = {
  id: number;
  name?: string | null;
  type?: string | null;
  start_date?: string | null;
  distance?: number | null;
  moving_time?: number | null;
  elapsed_time?: number | null;
  total_elevation_gain?: number | null;
  average_heartrate?: number | null;
  max_heartrate?: number | null;
  suffer_score?: number | null;
};

function mapActivity(raw: RawStravaActivity): StravaActivity {
  return {
    id: raw.id,
    name: raw.name ?? null,
    type: raw.type ?? "Unknown",
    start_date: raw.start_date ?? new Date(0).toISOString(),
    distance: raw.distance ?? 0,
    moving_time: raw.moving_time ?? 0,
    elapsed_time: raw.elapsed_time ?? 0,
    total_elevation_gain: raw.total_elevation_gain ?? null,
    average_heartrate: raw.average_heartrate ?? null,
    max_heartrate: raw.max_heartrate ?? null,
    suffer_score: raw.suffer_score ?? null,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchActivityPage(
  accessToken: string,
  page: number,
  perPage: number,
  attempt = 0,
): Promise<StravaActivity[]> {
  const url = `${STRAVA_API_BASE}/athlete/activities?per_page=${perPage}&page=${page}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  // Strava: 100 requests / 15 min, 1000 / day. Back off and retry on 429.
  if (res.status === 429) {
    if (attempt >= 4) {
      throw new StravaRateLimitError(
        "Strava rate limit exceeded; retries exhausted. Try again later.",
      );
    }
    const waitMs = 2 ** (attempt + 1) * 1000; // 2s, 4s, 8s, 16s
    await sleep(waitMs);
    return fetchActivityPage(accessToken, page, perPage, attempt + 1);
  }

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Strava activities fetch failed (${res.status}): ${detail}`);
  }

  const raw = (await res.json()) as RawStravaActivity[];
  return raw.map(mapActivity);
}

/**
 * Paginate through the athlete's activities (200 per page) until exhausted.
 * A typical user is ~4-5 pages, well within rate limits.
 */
export async function fetchAllActivities(
  accessToken: string,
): Promise<StravaActivity[]> {
  const perPage = 200;
  const maxPages = 50; // safety cap (~10k activities)
  const all: StravaActivity[] = [];

  for (let page = 1; page <= maxPages; page++) {
    const batch = await fetchActivityPage(accessToken, page, perPage);
    all.push(...batch);
    if (batch.length < perPage) break;
  }

  return all;
}
