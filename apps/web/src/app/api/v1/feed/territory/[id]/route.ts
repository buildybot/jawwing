import { NextRequest, NextResponse } from "next/server";
import { db, posts, territories } from "@jawwing/db";
import { eq, inArray, gt, and, desc, sql } from "drizzle-orm";
import { type SortMode } from "@jawwing/api/feed";

type RouteContext = { params: Promise<{ id: string }> };

const HOT_GRAVITY = 1.8;

// ─── GET /api/v1/feed/territory/[id] ─────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const sort = (searchParams.get("sort") ?? "hot") as SortMode;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    if (!["hot", "new", "top"].includes(sort)) {
      return NextResponse.json({ error: "sort must be hot, new, or top", code: "INVALID_PARAMS" }, { status: 400 });
    }

    const [territory] = await db.select().from(territories).where(eq(territories.id, id)).limit(1);
    if (!territory) return NextResponse.json({ error: "Territory not found", code: "NOT_FOUND" }, { status: 404 });

    const h3Indexes = territory.h3_indexes;
    if (!h3Indexes || h3Indexes.length === 0) {
      return NextResponse.json({ territory: { id: territory.id, name: territory.name }, posts: [], meta: { limit, offset, count: 0 } });
    }

    const nowTs = Math.floor(Date.now() / 1000);
    const conditions = and(inArray(posts.h3_index, h3Indexes), gt(posts.expires_at, nowTs), eq(posts.status, "active"));

    let results;
    if (sort === "new") {
      results = await db.select().from(posts).where(conditions).orderBy(desc(posts.created_at)).limit(limit).offset(offset);
    } else if (sort === "top") {
      results = await db.select().from(posts).where(conditions).orderBy(desc(posts.score)).limit(limit).offset(offset);
    } else {
      results = await db.select().from(posts).where(conditions)
        .orderBy(desc(sql<number>`CAST(${posts.score} + 1 AS REAL) / EXP(${HOT_GRAVITY} * LOG((CAST(unixepoch() - ${posts.created_at} AS REAL) / 3600.0) + 2.0))`))
        .limit(limit).offset(offset);
    }

    return NextResponse.json({
      territory: { id: territory.id, name: territory.name },
      posts: results,
      meta: { limit, offset, count: results.length },
    });
  } catch (err) {
    console.error("[GET /api/v1/feed/territory/:id]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
