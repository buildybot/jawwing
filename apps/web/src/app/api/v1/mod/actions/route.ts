import { NextRequest, NextResponse } from "next/server";

// ─── GET /api/v1/mod/actions ──────────────────────────────────────────────────
// Public endpoint — returns the moderation action log.
// Query params: post_id, agent_id, action, limit, offset

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const post_id = searchParams.get("post_id");
    const agent_id = searchParams.get("agent_id");
    const actionFilter = searchParams.get("action"); // approve, remove, flag
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    if (!process.env.TURSO_DATABASE_URL) {
      return NextResponse.json({ actions: [], stats: {}, meta: { limit, offset, count: 0 } });
    }

    const { createClient } = await import("@libsql/client");
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    // Get aggregate stats
    const statsResult = await client.execute(
      "SELECT action, COUNT(*) as cnt FROM mod_actions GROUP BY action"
    );
    const stats: Record<string, number> = {};
    let totalActions = 0;
    for (const row of statsResult.rows) {
      stats[row.action as string] = Number(row.cnt);
      totalActions += Number(row.cnt);
    }
    stats.total = totalActions;

    // Get recent actions (newest first) with post excerpt
    const conditions: string[] = [];
    const args: (string | number)[] = [];

    if (post_id) { conditions.push("ma.post_id = ?"); args.push(post_id); }
    if (agent_id) { conditions.push("ma.agent_id = ?"); args.push(agent_id); }
    if (actionFilter) { conditions.push("ma.action = ?"); args.push(actionFilter); }

    const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    const results = await client.execute({
      sql: `SELECT ma.id, ma.post_id, ma.agent_id, ma.action, ma.rule_cited, ma.reasoning, ma.created_at,
                   substr(p.content, 1, 120) as post_excerpt
            FROM mod_actions ma
            LEFT JOIN posts p ON p.id = ma.post_id
            ${where}
            ORDER BY ma.created_at DESC
            LIMIT ? OFFSET ?`,
      args: [...args, limit, offset],
    });

    // Clean up reasoning — strip provider prefix for public display
    const actions = results.rows.map((r) => ({
      id: r.id,
      post_id: r.post_id,
      action: r.action,
      rule_cited: r.rule_cited,
      reasoning: ((r.reasoning as string) || "").replace(/^\[.*?\]\s*/, ""),
      post_excerpt: r.post_excerpt,
      agent: "CLAUDE HAIKU 4.5",
      confidence: null, // We don't have this on mod_actions table
      created_at: r.created_at,
    }));

    client.close();

    return NextResponse.json({
      actions,
      stats,
      meta: { limit, offset, count: actions.length },
    }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    console.error("[GET /api/v1/mod/actions]", err);
    return NextResponse.json({ actions: [], stats: {}, meta: { limit: 50, offset: 0, count: 0 } });
  }
}
