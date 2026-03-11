import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { isAdmin } from "@jawwing/api/admin";

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = Math.floor(Date.now() / 1000);
  const start48h = now - 48 * 3600;

  try {
    const c = getClient();
    const [postRows, voteRows, replyRows] = await Promise.all([
      c.execute({ sql: "SELECT (created_at / 3600) * 3600 as hour, COUNT(*) as count FROM posts WHERE created_at >= ? GROUP BY hour ORDER BY hour", args: [start48h] }),
      c.execute({ sql: "SELECT (created_at / 3600) * 3600 as hour, COUNT(*) as count FROM votes WHERE created_at >= ? GROUP BY hour ORDER BY hour", args: [start48h] }),
      c.execute({ sql: "SELECT (created_at / 3600) * 3600 as hour, COUNT(*) as count FROM replies WHERE created_at >= ? GROUP BY hour ORDER BY hour", args: [start48h] }),
    ]);

    // Build hourly buckets
    const hours: Record<number, { posts: number; votes: number; replies: number }> = {};
    for (let h = 0; h < 48; h++) {
      const hourTs = Math.floor((now - (47 - h) * 3600) / 3600) * 3600;
      hours[hourTs] = { posts: 0, votes: 0, replies: 0 };
    }

    for (const row of postRows.rows) { const h = Number(row.hour); if (hours[h]) hours[h].posts = Number(row.count); }
    for (const row of voteRows.rows) { const h = Number(row.hour); if (hours[h]) hours[h].votes = Number(row.count); }
    for (const row of replyRows.rows) { const h = Number(row.hour); if (hours[h]) hours[h].replies = Number(row.count); }

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
