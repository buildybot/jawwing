import { NextRequest, NextResponse } from "next/server";
import { db, posts, replies, votes } from "@jawwing/db";
import { eq, count } from "drizzle-orm";
import { withAuth, type AuthenticatedRequest } from "@jawwing/api/middleware";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/v1/posts/[id] ───────────────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;

    const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });

    const [replyCountRow] = await db.select({ count: count() }).from(replies).where(eq(replies.post_id, id));
    const voteSummary = await db.select({ value: votes.value, count: count() }).from(votes).where(eq(votes.post_id, id)).groupBy(votes.value);

    const upvotes = voteSummary.find((v) => v.value === 1)?.count ?? 0;
    const downvotes = voteSummary.find((v) => v.value === -1)?.count ?? 0;

    // Sanitize coordinates for privacy — round to ~1km, strip IP/user_id
    const sanitized = {
      ...post,
      lat: Math.round(post.lat * 100) / 100,
      lng: Math.round(post.lng * 100) / 100,
      ip_hash: undefined,
      user_id: undefined,
      reply_count: replyCountRow?.count ?? 0,
      votes: { upvotes, downvotes },
    };
    return NextResponse.json({ post: sanitized });
  } catch (err) {
    console.error("[GET /api/v1/posts/:id]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// ─── DELETE /api/v1/posts/[id] ────────────────────────────────────────────────

async function deletePost(req: AuthenticatedRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { user } = req;
    const { id } = await context.params;

    const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });

    const isAuthor = post.user_id === user.id;
    const isModAgent = user.type === "agent";

    if (!isAuthor && !isModAgent) return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });

    await db.update(posts).set({ status: "removed" }).where(eq(posts.id, id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/v1/posts/:id]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export const DELETE = withAuth(deletePost as Parameters<typeof withAuth>[0]);
