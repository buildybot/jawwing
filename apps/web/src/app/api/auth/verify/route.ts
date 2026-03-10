import { NextRequest, NextResponse } from "next/server";
import { verifyCode } from "@jawwing/api/auth";

// ─── POST /api/auth/verify ────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    let body: { phone?: unknown; code?: unknown };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    const { phone, code } = body;

    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
      return NextResponse.json({ error: "phone is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return NextResponse.json({ error: "code is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const result = await verifyCode(phone.trim(), code.trim());

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
