import { NextRequest, NextResponse } from "next/server";
import { checkAndConsumeCode } from "@jawwing/api/auth";
import { validate, VerifySchema } from "@jawwing/api/validation";
import { checkEmailRateLimit } from "@jawwing/api/middleware";
import { findOrCreateAccount, signAccountToken, buildAccountCookieHeader } from "@jawwing/api/accounts";
import { getAnonymousId } from "@jawwing/api/anonymous";

// ─── POST /api/auth/verify ────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    const parsed = validate(VerifySchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { email, code } = parsed.data;

    // Email rate limit: 5 verify attempts per email per 10 minutes
    const rateLimit = checkEmailRateLimit(email, "verify");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait before trying again.", code: "RATE_LIMIT", resetAt: rateLimit.resetAt },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(Math.floor(rateLimit.resetAt / 1000)) } }
      );
    }

    // Verify the 6-digit code (uses the existing in-memory code store)
    checkAndConsumeCode(email, code);

    // Get the current anonymous session ID to link to this account
    const sessionId = getAnonymousId(req);

    // Find or create account by email hash, linking the session
    const account = await findOrCreateAccount(email, sessionId);

    // Issue account JWT as httpOnly cookie
    const token = signAccountToken(account.id);
    const cookieHeader = buildAccountCookieHeader(token);

    const isMobile = req.headers.get("X-Mobile") === "1";
    const response = NextResponse.json({
      ok: true,
      accountId: account.id,
      // Return token in body for mobile clients (can't use httpOnly cookies)
      ...(isMobile ? { token } : {}),
    });
    // httpOnly JWT for security (web)
    response.headers.append("Set-Cookie", cookieHeader);
    // Non-httpOnly flag so client JS can detect login state
    response.headers.append("Set-Cookie", `jw_account_ok=1; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 365}`);
    return response;
  } catch (err) {
    console.error("[POST /api/auth/verify]", err);
    const message = err instanceof Error ? err.message : "Verification failed";
    const isAuthError =
      message.includes("Invalid") ||
      message.includes("expired") ||
      message.includes("No pending");
    return NextResponse.json(
      { error: message, code: isAuthError ? "AUTH_FAILED" : "INTERNAL_ERROR" },
      { status: isAuthError ? 401 : 500 }
    );
  }
}
