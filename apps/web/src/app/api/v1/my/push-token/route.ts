import { NextRequest, NextResponse } from "next/server";
import { getAccountFromRequest, storePushToken } from "@jawwing/api/accounts";

// ─── POST /api/v1/my/push-token ──────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const account = await getAccountFromRequest(req);
    if (!account) {
      return NextResponse.json({ error: "Not authenticated", code: "UNAUTHORIZED" }, { status: 401 });
    }

    let body: { token?: string };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 }); }

    if (!body.token || typeof body.token !== "string") {
      return NextResponse.json({ error: "token is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    await storePushToken(account.id, body.token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/v1/my/push-token]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
