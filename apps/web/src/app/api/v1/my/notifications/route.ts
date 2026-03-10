import { NextRequest, NextResponse } from "next/server";
import { getAccountFromToken, updateNotificationPrefs } from "@jawwing/api/accounts";

// ─── POST /api/v1/my/notifications ───────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const token = req.cookies.get("jw_account")?.value;
    if (!token) {
      return NextResponse.json({ error: "Not authenticated", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const account = await getAccountFromToken(token);
    if (!account) {
      return NextResponse.json({ error: "Invalid session", code: "UNAUTHORIZED" }, { status: 401 });
    }

    let body: { replies?: boolean; trending?: boolean };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 }); }

    const replies = typeof body.replies === "boolean" ? body.replies : true;
    const trending = typeof body.trending === "boolean" ? body.trending : false;

    await updateNotificationPrefs(account.id, { replies, trending });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/v1/my/notifications]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
