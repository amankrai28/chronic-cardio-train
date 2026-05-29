import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/strava";
import { createOAuthState, setPendingStravaCreds } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Path A entry point: user has pasted the client_id/client_secret of a Strava
 * API app they created in their own Strava account. We stash the credentials
 * in an encrypted short-lived cookie and return the Strava authorize URL
 * built with those credentials. The callback will pick the cookie back up.
 */
export async function POST(request: NextRequest) {
  let body: { client_id?: unknown; client_secret?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const clientId = typeof body.client_id === "string" ? body.client_id.trim() : "";
  const clientSecret =
    typeof body.client_secret === "string" ? body.client_secret.trim() : "";

  if (!clientId || !clientSecret) {
    return NextResponse.json({ error: "missing_credentials" }, { status: 400 });
  }
  // Strava client IDs are numeric; secrets are 40-char hex. Validate loosely.
  if (!/^\d+$/.test(clientId)) {
    return NextResponse.json({ error: "invalid_client_id" }, { status: 400 });
  }
  if (clientSecret.length < 20) {
    return NextResponse.json({ error: "invalid_client_secret" }, { status: 400 });
  }

  await setPendingStravaCreds({ clientId, clientSecret });
  const state = await createOAuthState();
  const redirect = buildAuthorizeUrl(state, { clientId, clientSecret });

  return NextResponse.json({ redirect });
}
