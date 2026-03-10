import { NextRequest, NextResponse } from "next/server";
import { db, territories, posts } from "@jawwing/db";
import { eq, sql, gt, and, inArray } from "drizzle-orm";

// ─── GET /api/v1/territories ──────────────────────────────────────────────────

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const nowTs = Math.floor(Date.now() / 1000);
    const oneDayAgo = nowTs - 24 * 60 * 60;

    const allTerritories = await db.select().from(territories);

    const results = await Promise.all(
      allTerritories.map(async (t) => {
        const indexes: string[] = Array.isArray(t.h3_indexes) ? t.h3_indexes : [];

        if (indexes.length === 0) {
          return {
            id: t.id,
            name: t.name,
            h3_indexes: indexes,
            assigned_agent_id: t.assigned_agent_id,
            created_at: t.created_at,
            post_count: 0,
            active_24h: 0,
          };
        }

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

        return {
          id: t.id,
          name: t.name,
          h3_indexes: indexes,
          assigned_agent_id: t.assigned_agent_id,
          created_at: t.created_at,
          post_count: postCountRow[0]?.count ?? 0,
          active_24h: active24hRow[0]?.count ?? 0,
        };
      })
    );

    return NextResponse.json({ territories: results });
  } catch (err) {
    console.error("[GET /api/v1/territories]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
