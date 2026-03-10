import { NextRequest, NextResponse } from "next/server";
import { db, posts, replies, nanoid, now } from "@jawwing/db";
import { eq, and, asc, sql } from "drizzle-orm";
import { withAuth, type AuthenticatedRequest } from "@jawwing/api/middleware";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/v1/posts/[id]/replies ──────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, id)).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });

    const results = await db
      .select().from(replies)
      .where(and(eq(replies.post_id, id), eq(replies.status, "active")))
      .orderBy(asc(replies.created_at))
      .limit(limit).offset(offset);

    return NextResponse.json({ replies: results, meta: { limit, offset, count: results.length } });
  } catch (err) {
    console.error("[GET /api/v1/posts/:id/replies]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// ─── POST /api/v1/posts/[id]/replies ─────────────────────────────────────────

async function createReply(req: AuthenticatedRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { user } = req;
    const { id: post_id } = await context.params;

    const [post] = await db.select().from(posts).where(eq(posts.id, post_id)).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });
    if (post.status !== "active") return NextResponse.json({ error: "Post is not active", code: "POST_INACTIVE" }, { status: 422 });

    const nowTs = now();
    if (post.expires_at <= nowTs) return NextResponse.json({ error: "Post has expired", code: "POST_EXPIRED" }, { status: 422 });

    let body: { content?: unknown; parent_reply_id?: unknown };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 }); }

    const { content, parent_reply_id } = body;

    if (!content || typeof content !== "string") return NextResponse.json({ error: "content is required", code: "VALIDATION_ERROR" }, { status: 400 });
    const trimmed = content.trim();
    if (trimmed.length === 0) return NextResponse.json({ error: "content cannot be empty", code: "VALIDATION_ERROR" }, { status: 400 });
    if (trimmed.length > 300) return NextResponse.json({ error: "content must be 300 characters or fewer", code: "VALIDATION_ERROR" }, { status: 400 });

    if (parent_reply_id !== undefined && parent_reply_id !== null) {
      if (typeof parent_reply_id !== "string") return NextResponse.json({ error: "parent_reply_id must be a string", code: "VALIDATION_ERROR" }, { status: 400 });
      const [parentReply] = await db.select({ id: replies.id }).from(replies).where(and(eq(replies.id, parent_reply_id), eq(replies.post_id, post_id))).limit(1);
      if (!parentReply) return NextResponse.json({ error: "Parent reply not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const id = nanoid();
    const [created] = await db.insert(replies).values({
      id, post_id,
      parent_reply_id: (parent_reply_id as string | null) ?? null,
      user_id: user.id, content: trimmed, created_at: nowTs, status: "active",
    }).returning();

    await db.update(posts).set({ reply_count: sql`${posts.reply_count} + 1` }).where(eq(posts.id, post_id));
    return NextResponse.json({ reply: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/posts/:id/replies]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export const POST = withAuth(createReply as Parameters<typeof withAuth>[0]);
