import { NextRequest, NextResponse } from "next/server";
import { db, posts } from "@jawwing/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "@jawwing/api/admin";

// ─── POST /api/v1/admin/votes ─────────────────────────────────────────────────
// Body: { "post_id": "...", "score": 5 }
// Directly sets the score on a post (bypasses normal vote logic).

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    let body: { post_id: string; score: number };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    const { post_id, score } = body;
    if (!post_id || typeof score !== "number") {
      return NextResponse.json(
        { error: "post_id and score are required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(posts)
      .set({ score })
      .where(eq(posts.id, post_id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ post_id: updated.id, score: updated.score });
  } catch (err) {
    console.error("[POST /api/v1/admin/votes]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
