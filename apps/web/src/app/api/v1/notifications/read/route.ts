import { NextRequest, NextResponse } from "next/server";
import { db, notifications } from "@jawwing/db";
import { eq, and, inArray } from "drizzle-orm";
import { getAccountFromRequest } from "@jawwing/api/accounts";

// ─── POST /api/v1/notifications/read ─────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const account = await getAccountFromRequest(req);
    if (!account) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    let body: { ids?: string[]; all?: boolean };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 }); }

    if (body.all === true) {
      await db
        .update(notifications)
        .set({ read: 1 })
        .where(eq(notifications.account_id, account.id));
    } else if (Array.isArray(body.ids) && body.ids.length > 0) {
      await db
        .update(notifications)
        .set({ read: 1 })
        .where(
          and(
            eq(notifications.account_id, account.id),
            inArray(notifications.id, body.ids)
          )
        );
    } else {
      return NextResponse.json(
        { error: "Provide ids[] or all:true", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/v1/notifications/read]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
