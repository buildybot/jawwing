import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@jawwing/api/admin";

export async function GET(req: NextRequest) {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { createClient } = await import("@libsql/client");
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // Get all non-active, non-removed posts (the pipeline)
    const pending = await client.execute({
      sql: `SELECT p.id, p.content, p.status, p.mod_confidence, p.created_at, p.lat, p.lng, p.image_url, p.video_url, p.user_id,
                   ma.reasoning as mod_reasoning, ma.action as mod_action, ma.rule_cited
            FROM posts p
            LEFT JOIN mod_actions ma ON ma.post_id = p.id
            WHERE p.status IN ('pending', 'flagged', 'mod_failed')
            ORDER BY p.created_at DESC
            LIMIT 200`,
      args: [],
    });

    // Stats
    const stats = await client.execute(
      "SELECT status, COUNT(*) as cnt FROM posts WHERE status IN ('pending', 'flagged', 'mod_failed') GROUP BY status"
    );
    const counts: Record<string, number> = {};
    for (const row of stats.rows) {
      counts[row.status as string] = Number(row.cnt);
    }

    // Recent mod actions (last 50)
    const recentActions = await client.execute({
      sql: `SELECT ma.id, ma.post_id, ma.action, ma.reasoning, ma.rule_cited, ma.created_at,
                   substr(p.content, 1, 100) as post_excerpt, p.status as post_status
            FROM mod_actions ma
            LEFT JOIN posts p ON p.id = ma.post_id
            ORDER BY ma.created_at DESC
            LIMIT 50`,
      args: [],
    });

    client.close();

    return NextResponse.json({
      pipeline: pending.rows,
      stats: counts,
      recent_actions: recentActions.rows,
    });
  } catch (err) {
    console.error("[GET /api/v1/admin/pipeline]", err);
    client.close();
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
