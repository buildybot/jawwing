import { NextRequest, NextResponse } from "next/server";
import { db, posts, votes, notifications, nanoid, now } from "@jawwing/db";
import { eq, and, sql, gt } from "drizzle-orm";
import { validate, VoteSchema } from "@jawwing/api/validation";
import { getIpHash } from "@jawwing/api/anonymous";
import { isBanned } from "@jawwing/api/bans";
import { getOptionalAccountId } from "@jawwing/api/optionalAuth";

type RouteContext = { params: Promise<{ id: string }> };

// ─── Vote notification throttle (in-memory, max 1 per post per hour) ──────────

const voteNotifThrottle = new Map<string, number>(); // postId → last notif ts

function canSendVoteNotif(postId: string): boolean {
  const last = voteNotifThrottle.get(postId);
  const nowTs = Math.floor(Date.now() / 1000);
  if (last && nowTs - last < 3600) return false;
  voteNotifThrottle.set(postId, nowTs);
  return true;
}

// ─── POST /api/v1/posts/[id]/vote ────────────────────────────────────────────

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: post_id } = await context.params;
    const ipHash = getIpHash(req);

    // Ban check
    if (isBanned(ipHash)) {
      return NextResponse.json({ error: "Forbidden", code: "BANNED" }, { status: 403 });
    }

    // Optional account auth
    const accountId = await getOptionalAccountId(req);

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
    const nowTs = now();

    // ── Dedup: account-first, fallback to IP hash ──────────────────────────────
    // Look up existing vote. If logged in, dedup by account_id. Otherwise by voter_hash (IP).
    let existing;
    if (accountId) {
      const [byAccount] = await db
        .select()
        .from(votes)
        .where(and(eq(votes.post_id, post_id), eq(votes.account_id, accountId)))
        .limit(1);
      existing = byAccount;
    }

    if (!existing) {
      const [byIp] = await db
        .select()
        .from(votes)
        .where(and(eq(votes.post_id, post_id), eq(votes.voter_hash, ipHash)))
        .limit(1);
      existing = byIp;
    }

    if (existing) {
      if (existing.value === value) return NextResponse.json({ vote: existing, changed: false });

      const scoreDelta = (value as number) - existing.value;
      await db.update(votes).set({
        value: value as 1 | -1,
        created_at: nowTs,
        account_id: accountId ?? existing.account_id,
      }).where(eq(votes.id, existing.id));

      if (value === 1) {
        await db.update(posts).set({
          score: sql`${posts.score} + ${scoreDelta}`,
          upvotes: sql`${posts.upvotes} + 1`,
          downvotes: sql`${posts.downvotes} - 1`,
        }).where(eq(posts.id, post_id));
      } else {
        await db.update(posts).set({
          score: sql`${posts.score} + ${scoreDelta}`,
          upvotes: sql`${posts.upvotes} - 1`,
          downvotes: sql`${posts.downvotes} + 1`,
        }).where(eq(posts.id, post_id));
      }

      const [updated] = await db.select().from(votes).where(eq(votes.id, existing.id)).limit(1);
      return NextResponse.json({ vote: updated, changed: true, scoreDelta });
    } else {
      const id = nanoid();
      const [created] = await db
        .insert(votes)
        .values({
          id,
          post_id,
          voter_hash: ipHash,
          ip_hash: ipHash,
          account_id: accountId ?? null,
          value: value as 1 | -1,
          created_at: nowTs,
        })
        .returning();

      if (value === 1) {
        await db.update(posts).set({
          score: sql`${posts.score} + 1`,
          upvotes: sql`${posts.upvotes} + 1`,
        }).where(eq(posts.id, post_id));
      } else {
        await db.update(posts).set({
          score: sql`${posts.score} - 1`,
          downvotes: sql`${posts.downvotes} + 1`,
        }).where(eq(posts.id, post_id));
      }

      // ── Notify post author (throttled, fire-and-forget) ────────────────────
      if (post.account_id && post.account_id !== accountId && canSendVoteNotif(post_id)) {
        const message = value === 1 ? "Your post got an upvote" : "Your post got a downvote";
        db.insert(notifications).values({
          id: nanoid(),
          account_id: post.account_id,
          type: "vote",
          post_id,
          reply_id: null,
          message,
          read: 0,
          created_at: nowTs,
        }).catch((err) => console.error("[vote notif]", err));
      }

      return NextResponse.json({ vote: created, changed: true }, { status: 201 });
    }
  } catch (err) {
    console.error("[POST /api/v1/posts/:id/vote]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
