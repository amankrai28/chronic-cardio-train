export const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
export const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";
export const STRAVA_SCOPES = "read_all,activity:read_all,profile:read_all";

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
