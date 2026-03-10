import { NextRequest, NextResponse } from "next/server";

// ─── GET /api/v1/mod/actions ──────────────────────────────────────────────────
// Public endpoint — returns the moderation action log.
// Query params: post_id, agent_id, limit, offset

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const post_id = searchParams.get("post_id");
    const agent_id = searchParams.get("agent_id");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    // Guard: if DB is not configured, return empty results gracefully
    if (!process.env.TURSO_DATABASE_URL) {
      return NextResponse.json({
        actions: [],
        meta: { limit, offset, count: 0 },
      });
    }

    // Lazy import so missing env vars at build time don't break the build
    const { createClient } = await import("@libsql/client");
    const { drizzle } = await import("drizzle-orm/libsql");
    const { mod_actions } = await import("@jawwing/db");
    const { eq, and } = await import("drizzle-orm");
    type SQL = import("drizzle-orm").SQL;

    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const db = drizzle(client);

    const filters: SQL[] = [];
    if (post_id) filters.push(eq(mod_actions.post_id, post_id));
    if (agent_id) filters.push(eq(mod_actions.agent_id, agent_id));

    const results = await db
      .select()
      .from(mod_actions)
      .where(filters.length > 0 ? and(...filters) : undefined)
      .limit(limit)
      .offset(offset)
      .orderBy(mod_actions.created_at);

    client.close();

    return NextResponse.json({
      actions: results,
      meta: { limit, offset, count: results.length },
    });
  } catch (err) {
    console.error("[GET /api/v1/mod/actions]", err);
    // Return empty results rather than a hard 500 — the log may just be empty
    return NextResponse.json({
      actions: [],
      meta: { limit: 20, offset: 0, count: 0 },
    });
  }
}
