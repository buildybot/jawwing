import { NextRequest, NextResponse } from "next/server";
import { sendVerificationCode } from "@jawwing/api/auth";

// ─── POST /api/auth/send-code ─────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: { phone?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    const { phone } = body;

    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return NextResponse.json({ error: "phone is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    await sendVerificationCode(phone.trim());

    return NextResponse.json({ ok: true, message: "Verification code sent" });
  } catch (err) {
    console.error("[POST /api/auth/send-code]", err);
    const message = err instanceof Error ? err.message : "Failed to send verification code";
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
