import { NextRequest, NextResponse } from "next/server";
import { db, posts, saved_posts, nanoid, now } from "@jawwing/db";
import { eq, and, desc } from "drizzle-orm";
import { getAccountFromRequest } from "@jawwing/api/accounts";

// ─── GET /api/v1/saved — list saved posts ─────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const account = await getAccountFromRequest(req);
    if (!account) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    const rows = await db
      .select({
        saved_id: saved_posts.id,
        saved_at: saved_posts.created_at,
        post: posts,
      })
      .from(saved_posts)
      .innerJoin(posts, eq(saved_posts.post_id, posts.id))
      .where(eq(saved_posts.account_id, account.id))
      .orderBy(desc(saved_posts.created_at));

    const sanitized = rows.map((r) => ({
      ...r.post,
      ip_hash: undefined,
      user_id: undefined,
      account_id: undefined,
      saved_at: r.saved_at,
      saved_id: r.saved_id,
    }));

    return NextResponse.json({ posts: sanitized, meta: { count: sanitized.length } });
  } catch (err) {
    console.error("[GET /api/v1/saved]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// ─── POST /api/v1/saved — save a post ────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const account = await getAccountFromRequest(req);
    if (!account) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    let body: { post_id?: string };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 }); }

    const { post_id } = body;
    if (!post_id || typeof post_id !== "string") {
      return NextResponse.json({ error: "post_id is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    // Verify post exists
    const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, post_id)).limit(1);
    if (!post) {
      return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });
    }

    // Upsert (ignore duplicate)
    const id = nanoid();
    await db
      .insert(saved_posts)
      .values({ id, account_id: account.id, post_id, created_at: now() })
      .onConflictDoNothing();

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/saved]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// ─── DELETE /api/v1/saved — unsave a post ────────────────────────────────────

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const account = await getAccountFromRequest(req);
    if (!account) {
      return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
    }

    let body: { post_id?: string };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 }); }

    const { post_id } = body;
    if (!post_id || typeof post_id !== "string") {
      return NextResponse.json({ error: "post_id is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    await db
      .delete(saved_posts)
      .where(and(eq(saved_posts.account_id, account.id), eq(saved_posts.post_id, post_id)));

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/v1/saved]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
