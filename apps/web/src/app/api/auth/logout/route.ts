import { NextResponse } from "next/server";
import { buildAccountCookieClearHeader } from "@jawwing/api/accounts";

/**
 * POST /api/auth/logout
 * Clears the jw_account cookies.
 */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildAccountCookieClearHeader());
  const secureFlag = process.env.NODE_ENV === "production" ? "; Secure" : "";
  response.headers.append("Set-Cookie", `jw_account_ok=; Path=/; SameSite=Lax; Max-Age=0${secureFlag}`);
  return response;
}
