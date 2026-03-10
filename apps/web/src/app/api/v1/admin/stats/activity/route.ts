import { NextRequest, NextResponse } from "next/server";
import { db, posts, votes, replies } from "@jawwing/db";
import { sql } from "drizzle-orm";
import { isAdmin } from "@jawwing/api/admin";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = Math.floor(Date.now() / 1000);
  const start48h = now - 48 * 3600;

  try {
    const [postActivity, voteActivity, replyActivity] = await Promise.all([
      db.execute(sql`
        SELECT 
          (created_at / 3600) * 3600 as hour,
          COUNT(*) as count
        FROM posts
        WHERE created_at >= ${start48h}
        GROUP BY hour
        ORDER BY hour ASC
      `),
      db.execute(sql`
        SELECT 
          (created_at / 3600) * 3600 as hour,
          COUNT(*) as count
        FROM votes
        WHERE created_at >= ${start48h}
        GROUP BY hour
        ORDER BY hour ASC
      `),
      db.execute(sql`
        SELECT 
          (created_at / 3600) * 3600 as hour,
          COUNT(*) as count
        FROM replies
        WHERE created_at >= ${start48h}
        GROUP BY hour
        ORDER BY hour ASC
      `),
    ]);

    // Build hourly buckets for last 48h
    const hours: Record<number, { posts: number; votes: number; replies: number }> = {};
    for (let h = 0; h < 48; h++) {
      const hourTs = Math.floor((now - (47 - h) * 3600) / 3600) * 3600;
      hours[hourTs] = { posts: 0, votes: 0, replies: 0 };
    }

    for (const row of postActivity.rows) {
      const h = Number(row.hour);
      if (hours[h]) hours[h].posts = Number(row.count);
    }
    for (const row of voteActivity.rows) {
      const h = Number(row.hour);
      if (hours[h]) hours[h].votes = Number(row.count);
    }
    for (const row of replyActivity.rows) {
      const h = Number(row.hour);
      if (hours[h]) hours[h].replies = Number(row.count);
    }

    const activity = Object.entries(hours).map(([hour, counts]) => ({
      hour: parseInt(hour),
      ...counts,
    }));

    return NextResponse.json({ activity });
  } catch (err) {
    console.error("[GET /api/v1/admin/stats/activity]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
