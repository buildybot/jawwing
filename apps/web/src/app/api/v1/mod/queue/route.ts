import { NextResponse } from "next/server";
import { db, posts } from "@jawwing/db";
import { eq, and } from "drizzle-orm";
import { withAuth, type AuthenticatedRequest } from "@jawwing/api/middleware";

// ─── GET /api/v1/mod/queue ────────────────────────────────────────────────────
// Returns posts pending moderation review in the agent's territory.
// Requires agent authentication (API key).

async function handler(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const { user } = req;

    if (user.type !== "agent") {
      return NextResponse.json(
        { error: "Forbidden: agent access required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    // Posts with status "flagged" (flagged for review) in the agent's territory.
    // If agent has no territory assigned, return all flagged posts.
    let query = db
      .select()
      .from(posts)
      .where(eq(posts.status, "flagged"))
      .limit(limit)
      .offset(offset);

    // TODO: filter by territory via h3_index when territory spatial data is available
    // For now, agents with a territory_id see all flagged posts (can be scoped later)

    const pending = await query;

    return NextResponse.json({
      posts: pending,
      meta: { limit, offset, count: pending.length },
    });
  } catch (err) {
    console.error("[GET /api/v1/mod/queue]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export const GET = withAuth(handler as Parameters<typeof withAuth>[0]);
