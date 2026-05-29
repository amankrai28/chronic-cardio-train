import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  timingSafeEqual,
} from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE = "cc_session";
const STATE_COOKIE = "cc_oauth_state";
const PENDING_CREDS_COOKIE = "cc_pending_creds";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const STATE_MAX_AGE = 60 * 10; // 10 minutes
const PENDING_CREDS_MAX_AGE = 60 * 15; // 15 minutes

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

// --- Encrypted Path A credential cookie ----------------------------------
//
// Carries the user's pasted Strava client_id/client_secret between the
// /api/auth/strava/path-a submit step and the OAuth callback. AES-256-GCM
// with a key derived from SESSION_SECRET via HKDF. Cookie is httpOnly,
// 15-minute TTL, single-use. We never persist these credentials to the
// database — see plan: one-shot snapshot model.

export type PendingStravaCreds = { clientId: string; clientSecret: string };

function encryptionKey(): Buffer {
  return Buffer.from(
    hkdfSync("sha256", secret(), Buffer.alloc(0), "cc-pending-creds", 32),
  );
}

function encryptCreds(creds: PendingStravaCreds): string {
  const iv = randomBytes(12);
  const key = encryptionKey();
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(creds), "utf8");
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    tag.toString("base64url"),
  ].join(".");
}

function decryptCreds(value: string): PendingStravaCreds | null {
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], "base64url");
    const ciphertext = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    if (iv.length !== 12 || tag.length !== 16) return null;
    const key = encryptionKey();
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const parsed = JSON.parse(plaintext.toString("utf8"));
    if (
      typeof parsed?.clientId !== "string" ||
      typeof parsed?.clientSecret !== "string"
    ) {
      return null;
    }
    return { clientId: parsed.clientId, clientSecret: parsed.clientSecret };
  } catch {
    return null;
  }
}

/** Stash the user's pasted Path A credentials for the OAuth round-trip. */
export async function setPendingStravaCreds(creds: PendingStravaCreds): Promise<void> {
  const store = await cookies();
  store.set(PENDING_CREDS_COOKIE, encryptCreds(creds), {
    httpOnly: true,
    secure: secureCookie,
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_CREDS_MAX_AGE,
  });
}

/** Read + delete the pending credentials cookie. Returns null if absent or tampered. */
export async function consumePendingStravaCreds(): Promise<PendingStravaCreds | null> {
  const store = await cookies();
  const raw = store.get(PENDING_CREDS_COOKIE)?.value;
  store.delete(PENDING_CREDS_COOKIE);
  if (!raw) return null;
  return decryptCreds(raw);
}
