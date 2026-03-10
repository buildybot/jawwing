import { NextRequest, NextResponse } from "next/server";
import { db, posts, votes, nanoid, now } from "@jawwing/db";
import { eq, and, sql } from "drizzle-orm";
import { validate, VoteSchema } from "@jawwing/api/validation";
import { getIpHash } from "@jawwing/api/anonymous";
import { isBanned } from "@jawwing/api/bans";

type RouteContext = { params: Promise<{ id: string }> };

// ─── POST /api/v1/posts/[id]/vote ────────────────────────────────────────────

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: post_id } = await context.params;
    const ipHash = getIpHash(req);

    // Ban check
    if (isBanned(ipHash)) {
      return NextResponse.json({ error: "Forbidden", code: "BANNED" }, { status: 403 });
    }

    const [post] = await db.select().from(posts).where(eq(posts.id, post_id)).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });
    if (post.status !== "active") return NextResponse.json({ error: "Cannot vote on inactive post", code: "POST_INACTIVE" }, { status: 422 });

    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 }); }

    const parsed = validate(VoteSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { value } = parsed.data;

    // 1 vote per IP per post
    const [existing] = await db
      .select()
      .from(votes)
      .where(and(eq(votes.post_id, post_id), eq(votes.voter_hash, ipHash)))
      .limit(1);

    const nowTs = now();

    if (existing) {
      if (existing.value === value) return NextResponse.json({ vote: existing, changed: false });

      const scoreDelta = (value as number) - existing.value;
      await db.update(votes).set({ value: value as 1 | -1, created_at: nowTs }).where(eq(votes.id, existing.id));
      await db.update(posts).set({ score: sql`${posts.score} + ${scoreDelta}` }).where(eq(posts.id, post_id));

      const [updated] = await db.select().from(votes).where(eq(votes.id, existing.id)).limit(1);
      return NextResponse.json({ vote: updated, changed: true, scoreDelta });
    } else {
      const id = nanoid();
      const [created] = await db
        .insert(votes)
        .values({ id, post_id, voter_hash: ipHash, ip_hash: ipHash, value: value as 1 | -1, created_at: nowTs })
        .returning();
      await db.update(posts).set({ score: sql`${posts.score} + ${value as number}` }).where(eq(posts.id, post_id));
      return NextResponse.json({ vote: created, changed: true }, { status: 201 });
    }
  } catch (err) {
    console.error("[POST /api/v1/posts/:id/vote]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
