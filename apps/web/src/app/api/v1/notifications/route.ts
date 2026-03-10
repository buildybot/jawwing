import { NextRequest, NextResponse } from "next/server";
import { db, notifications } from "@jawwing/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { getAccountFromRequest } from "@jawwing/api/accounts";

// ─── GET /api/v1/notifications ────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const account = await getAccountFromRequest(req);
    if (!account) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "true";

    const conditions = unreadOnly
      ? and(eq(notifications.account_id, account.id), eq(notifications.read, 0))
      : eq(notifications.account_id, account.id);

    const rows = await db
      .select()
      .from(notifications)
      .where(conditions)
      .orderBy(desc(notifications.created_at))
      .limit(50);

    // Count total unread
    const [{ unread_count }] = await db
      .select({ unread_count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(and(eq(notifications.account_id, account.id), eq(notifications.read, 0)));

    return NextResponse.json({
      notifications: rows,
      meta: { unread_count: Number(unread_count) },
    });
  } catch (err) {
    console.error("[GET /api/v1/notifications]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
