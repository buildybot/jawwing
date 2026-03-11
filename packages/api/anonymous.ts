/**
 * @jawwing/api — Anonymous identity utilities
 *
 * No login required. Identity is derived from:
 *   - A session cookie (jw_session) — random, httpOnly, 365 days
 *   - IP address hash — for rate limiting and 1-vote-per-IP enforcement
 *   - Device fingerprint — IP hash + User-Agent hash
 */

import crypto from "crypto";
import { nanoid } from "nanoid";
import type { NextRequest } from "next/server";

// ─── Cookie name ──────────────────────────────────────────────────────────────

const SESSION_COOKIE = "jw_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 365 days in seconds

// ─── getAnonymousId ───────────────────────────────────────────────────────────

/**
 * Read or generate a random session ID for this visitor.
 * Sets an httpOnly cookie on the response if a new ID is generated.
 *
 * Because Next.js route handlers can't mutate the request, callers must
 * attach the cookie header themselves using `setAnonymousCookie`.
 */
export function getAnonymousId(req: NextRequest): string {
  const existing = req.cookies.get(SESSION_COOKIE)?.value;
  if (existing && existing.length >= 16) return existing;
  return nanoid(32);
}

/**
 * Build the Set-Cookie header value for the anonymous session cookie.
 * Call this and add to your NextResponse headers when a new ID is generated.
 */
const SECURE_FLAG = process.env.NODE_ENV === "production" ? "; Secure" : "";

export function buildSessionCookieHeader(id: string): string {
  return `${SESSION_COOKIE}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${SECURE_FLAG}`;
}

/**
 * Returns true if the request already has a valid session cookie.
 * If false, caller should set a new one on the response.
 */
export function hasSessionCookie(req: NextRequest): boolean {
  const val = req.cookies.get(SESSION_COOKIE)?.value;
  return !!val && val.length >= 16;
}

// ─── getIpHash ────────────────────────────────────────────────────────────────

/**
 * SHA-256 hash of the requester's IP address.
 * Reads x-forwarded-for first (Vercel/CDN), falls back to req.ip.
 * Returns "unknown" if no IP is available.
 */
export function getIpHash(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : (req.ip ?? "");
  if (!ip) return "unknown";
  // Salt prevents rainbow-table attacks against the full IPv4 space (~137GB unsalted).
  // Uses IP_HASH_SALT if set, falls back to PHONE_HASH_SALT, then errors loudly.
  const salt = process.env.IP_HASH_SALT ?? process.env.PHONE_HASH_SALT;
  if (!salt) {
    console.error("[getIpHash] IP_HASH_SALT / PHONE_HASH_SALT env var is not set — IP hashing is insecure!");
  }
  return crypto.createHash("sha256").update((salt ?? "") + ip).digest("hex");
}

// ─── getFingerprint ───────────────────────────────────────────────────────────

/**
 * Combine IP hash + User-Agent hash for a coarse device fingerprint.
 * Not perfect, but good enough for anonymous identity without login.
 */
export function getFingerprint(req: NextRequest): string {
  const ipHash = getIpHash(req);
  const ua = req.headers.get("user-agent") ?? "";
  const uaHash = crypto.createHash("sha256").update(ua).digest("hex");
  return crypto
    .createHash("sha256")
    .update(`${ipHash}:${uaHash}`)
    .digest("hex");
}
