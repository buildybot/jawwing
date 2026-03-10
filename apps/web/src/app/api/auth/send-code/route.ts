import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode } from "@jawwing/api/auth";
import { validate, PhoneSchema } from "@jawwing/api/validation";
import { checkSmsRateLimit } from "@jawwing/api/middleware";

// ─── POST /api/auth/send-code ─────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    const parsed = validate(PhoneSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { phone } = parsed.data;

    // Graceful fallback: Twilio not configured
    if (!process.env.TWILIO_ACCOUNT_SID) {
      return NextResponse.json(
        { ok: false, error: "SMS service not configured" },
        { status: 503 }
      );
    }

    // SMS rate limit: 3 attempts per phone per 10 minutes
    const rateLimit = checkSmsRateLimit(phone, "send-code");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many code requests. Please wait before trying again.", code: "RATE_LIMIT", resetAt: rateLimit.resetAt },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(Math.floor(rateLimit.resetAt / 1000)) } }
      );
    }

    await sendVerificationCode(phone);

    return NextResponse.json({ ok: true, message: "Verification code sent" });
  } catch (err) {
    console.error("[POST /api/auth/send-code]", err);
    const message = err instanceof Error ? err.message : "Failed to send verification code";
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
