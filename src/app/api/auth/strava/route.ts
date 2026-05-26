import { NextResponse } from "next/server";
import { buildAuthorizeUrl } from "@/lib/strava";
import { createOAuthState } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function GET() {
  const state = await createOAuthState();
  return NextResponse.redirect(buildAuthorizeUrl(state));
}
