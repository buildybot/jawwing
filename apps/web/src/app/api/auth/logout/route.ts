import { NextResponse } from "next/server";

/**
 * POST /api/auth/logout
 * Placeholder for server-side session invalidation.
 * For now, auth is stateless JWT — client just clears localStorage.
 * Future: add token to a blocklist / revoke refresh tokens here.
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}
