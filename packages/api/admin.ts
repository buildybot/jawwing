/**
 * Admin authentication — x-admin-key header only, timing-safe comparison.
 * No cookies, no JWT, no session-based admin checks.
 */

import crypto from "crypto";

interface RequestLike {
  headers: { get(name: string): string | null };
}

/**
 * Returns true if the request carries a valid admin key.
 * Uses constant-time comparison to prevent timing attacks.
 */
export function isAdmin(req: RequestLike): boolean {
  const key = (req.headers.get("x-admin-key") ?? "").trim();
  const expected = (process.env.ADMIN_API_KEY ?? "").trim();
  if (!expected || key.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(key), Buffer.from(expected));
}
