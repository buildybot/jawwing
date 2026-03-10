import { NextResponse } from "next/server";
import { buildAccountCookieClearHeader } from "@jawwing/api/accounts";

/**
 * POST /api/auth/logout
 * Clears the jw_account cookies.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildAccountCookieClearHeader());
  response.headers.append("Set-Cookie", `jw_account_ok=; Path=/; SameSite=Lax; Max-Age=0`);
  return response;
}
