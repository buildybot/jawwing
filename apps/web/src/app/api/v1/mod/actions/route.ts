import { NextRequest, NextResponse } from "next/server";
import { db, mod_actions } from "@jawwing/db";
import { eq, and } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

// ─── GET /api/v1/mod/actions ──────────────────────────────────────────────────
// Public endpoint — returns the moderation action log.
// Query params: territory (future), post_id, agent_id, limit, offset

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);

    const post_id = searchParams.get("post_id");
    const agent_id = searchParams.get("agent_id");
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

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

    return NextResponse.json({
      actions: results,
      meta: { limit, offset, count: results.length },
    });
  } catch (err) {
    console.error("[GET /api/v1/mod/actions]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
