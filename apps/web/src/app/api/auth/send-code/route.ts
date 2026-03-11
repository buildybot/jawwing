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

    // Email rate limit: 3 attempts per email per hour
    const rateLimit = await checkEmailRateLimit(email, "send-code");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many code requests. Please wait before trying again.", code: "RATE_LIMIT", resetAt: rateLimit.resetAt },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(Math.floor(rateLimit.resetAt / 1000)) } }
      );
    }

    await sendVerificationCode(email);

    // Always return ok — never reveal if email exists or not
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/auth/send-code]", err);
    // Return ok even on error to avoid leaking info
    return NextResponse.json({ ok: true });
  }
}
