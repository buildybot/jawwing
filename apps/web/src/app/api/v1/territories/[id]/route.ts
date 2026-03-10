import { NextRequest, NextResponse } from "next/server";
import { db, territories, posts, users } from "@jawwing/db";
import { eq, sql, gt, and, inArray } from "drizzle-orm";

// ─── GET /api/v1/territories/:id ──────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const nowTs = Math.floor(Date.now() / 1000);
    const oneDayAgo = nowTs - 24 * 60 * 60;

    const [territory] = await db
      .select()
      .from(territories)
      .where(eq(territories.id, id))
      .limit(1);

    if (!territory) {
      return NextResponse.json(
        { error: "Territory not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const indexes: string[] = Array.isArray(territory.h3_indexes)
      ? territory.h3_indexes
      : [];

    let post_count = 0;
    let active_24h = 0;
    let agent: { id: string; display_name: string | null } | null = null;

    if (indexes.length > 0) {
      const [postCountRow, active24hRow] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(posts)
          .where(
            and(
              inArray(posts.h3_index, indexes),
              eq(posts.status, "active"),
              gt(posts.expires_at, nowTs)
            )
          ),
        db
          .select({ count: sql<number>`count(*)` })
          .from(posts)
          .where(
            and(
              inArray(posts.h3_index, indexes),
              eq(posts.status, "active"),
              gt(posts.created_at, oneDayAgo),
              gt(posts.expires_at, nowTs)
            )
          ),
      ]);
      post_count = postCountRow[0]?.count ?? 0;
      active_24h = active24hRow[0]?.count ?? 0;
    }

    // Fetch assigned agent if any
    if (territory.assigned_agent_id) {
      const [agentRow] = await db
        .select({ id: users.id, display_name: users.display_name })
        .from(users)
        .where(eq(users.id, territory.assigned_agent_id))
        .limit(1);
      if (agentRow) agent = agentRow;
    }

    return NextResponse.json({
      territory: {
        id: territory.id,
        name: territory.name,
        h3_indexes: indexes,
        assigned_agent_id: territory.assigned_agent_id,
        created_at: territory.created_at,
        post_count,
        active_24h,
        agent,
      },
    });
  } catch (err) {
    console.error("[GET /api/v1/territories/:id]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
