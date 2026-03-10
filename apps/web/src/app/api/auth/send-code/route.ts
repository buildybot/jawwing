import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode } from "@jawwing/api/auth";
import { validate, EmailSchema } from "@jawwing/api/validation";
import { checkEmailRateLimit } from "@jawwing/api/middleware";

// ─── POST /api/auth/send-code ─────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    const parsed = validate(EmailSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { email } = parsed.data;

    // Graceful fallback: Resend not configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { ok: false, error: "Email service not configured" },
        { status: 503 }
      );
    }

    // Email rate limit: 3 attempts per email per 10 minutes
    const rateLimit = checkEmailRateLimit(email, "send-code");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many code requests. Please wait before trying again.", code: "RATE_LIMIT", resetAt: rateLimit.resetAt },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(Math.floor(rateLimit.resetAt / 1000)) } }
      );
    }

    await sendVerificationCode(email);

    return NextResponse.json({ ok: true, message: "Verification code sent" });
  } catch (err) {
    console.error("[POST /api/auth/send-code]", err);
    const message = err instanceof Error ? err.message : "Failed to send verification code";
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
