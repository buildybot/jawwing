import { NextRequest, NextResponse } from "next/server";
import { db, posts } from "@jawwing/db";
import { lt, eq, and } from "drizzle-orm";

/**
 * POST /api/cron/cleanup
 *
 * Marks expired posts as "expired" (hidden from feeds but kept in DB for user history).
 * Does NOT delete posts — they remain accessible via /my-posts and /post/[id].
 * Protected by CRON_SECRET in Authorization header.
 *
 * Configured in vercel.json to run every hour: "0 * * * *"
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleCleanup(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleCleanup(req);
}

async function handleCleanup(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("Authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const nowTs = Math.floor(Date.now() / 1000);

    // Mark expired active posts as "expired" — keeps them in DB for user history
    const result = await db
      .update(posts)
      .set({ status: "expired" })
      .where(and(lt(posts.expires_at, nowTs), eq(posts.status, "active")));

    const expiredCount = (result as { rowsAffected?: number }).rowsAffected ?? 0;

    console.log(`[cron/cleanup] expired ${expiredCount} posts`);

    return NextResponse.json({
      ok: true,
      expired: expiredCount,
      timestamp: nowTs,
    });
  } catch (err) {
    console.error("[POST /api/cron/cleanup]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
