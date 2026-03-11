import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { isAdmin } from "@jawwing/api/admin";

/**
 * GET /api/v1/admin/top-posts
 * Returns top-performing posts, prioritizing real users over seeded.
 * Query params: ?hours=24&limit=5&metro=DC+METRO
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const hours = parseInt(searchParams.get("hours") ?? "24");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "5"), 20);
  const metro = searchParams.get("metro") ?? "";

  const cutoff = Math.floor(Date.now() / 1000) - hours * 3600;

  try {
    const c = createClient({
      url: process.env.TURSO_DATABASE_URL!,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Get top posts, sorted by:
    // 1. Real users first (user_id NOT starting with admin_seed_)
    // 2. Then by score (upvotes - downvotes)
    // 3. Then by reply count
    let sql = `
      SELECT id, content, score, upvotes, downvotes, reply_count, 
             created_at, lat, lng, image_url, video_url,
             CASE WHEN user_id LIKE 'admin_seed_%' THEN 0 ELSE 1 END as is_real_user
      FROM posts
      WHERE status = 'active' AND created_at >= ?
    `;
    const args: (string | number)[] = [cutoff];

    if (metro) {
      // We'd need to resolve metro to coordinates, for now just filter by h3 prefix
      // This is a placeholder — in production, filter by territory hexes
    }

    sql += ` ORDER BY is_real_user DESC, score DESC, reply_count DESC LIMIT ?`;
    args.push(limit);

    const result = await c.execute({ sql, args });

    const posts = result.rows.map((row) => ({
      id: row.id,
      content: row.content,
      score: Number(row.score),
      upvotes: Number(row.upvotes),
      downvotes: Number(row.downvotes),
      reply_count: Number(row.reply_count),
      created_at: Number(row.created_at),
      is_real_user: Number(row.is_real_user) === 1,
      image_url: row.image_url,
      video_url: row.video_url,
      url: `https://www.jawwing.com/post/${row.id}`,
    }));

    return NextResponse.json({ posts, hours, limit });
  } catch (err) {
    console.error("[GET /api/v1/admin/top-posts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
