import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@jawwing/api/auth";
import { validate, VerifySchema } from "@jawwing/api/validation";
import { checkSmsRateLimit } from "@jawwing/api/middleware";

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

    const { phone, code } = parsed.data;

    // SMS rate limit: 5 verify attempts per phone per 10 minutes
    const rateLimit = checkSmsRateLimit(phone, "verify");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many verification attempts. Please wait before trying again.", code: "RATE_LIMIT", resetAt: rateLimit.resetAt },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(Math.floor(rateLimit.resetAt / 1000)) } }
      );
    }

    const result = await verifyCode(phone, code);

    return NextResponse.json({ token: result.token, user: result.user });
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
