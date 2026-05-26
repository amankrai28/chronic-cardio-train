import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "cc_session";
const STATE_COOKIE = "cc_oauth_state";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const STATE_MAX_AGE = 60 * 10; // 10 minutes

function secret(): string {
  const value = process.env.SESSION_SECRET;
  if (!value) {
    throw new Error("Missing SESSION_SECRET environment variable.");
  }
  return value;
}

function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

const secureCookie = process.env.NODE_ENV === "production";

/** Persist the authenticated user's id in a signed, httpOnly cookie. */
export async function setSession(userId: string): Promise<void> {
  const signature = sign(userId);
  const store = await cookies();
  store.set(SESSION_COOKIE, `${userId}.${signature}`, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** Return the authenticated user's id, or null if absent/tampered. */
export async function getSession(): Promise<string | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const idx = raw.lastIndexOf(".");
  if (idx === -1) return null;
  const userId = raw.slice(0, idx);
  const signature = raw.slice(idx + 1);
  if (!userId || !signature) return null;
  if (!safeEqual(signature, sign(userId))) return null;
  return userId;
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** Create a random CSRF state value and store it in a short-lived cookie. */
export async function createOAuthState(): Promise<string> {
  const state = randomBytes(16).toString("hex");
  const store = await cookies();
  store.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: STATE_MAX_AGE,
  });
  return state;
}

/** Verify the returned state against the stored cookie, then clear it. */
export async function consumeOAuthState(returned: string | null): Promise<boolean> {
  const store = await cookies();
  const stored = store.get(STATE_COOKIE)?.value ?? null;
  store.delete(STATE_COOKIE);
  if (!stored || !returned) return false;
  return safeEqual(stored, returned);
}
