import { NextRequest, NextResponse } from "next/server";
import { db, posts, replies, notifications, nanoid, now } from "@jawwing/db";
import { eq, and, asc, sql } from "drizzle-orm";
import { getOptionalAccountId } from "@jawwing/api/optionalAuth";
import { checkRateLimit } from "@jawwing/api/middleware";
import {
  getAnonymousId,
  getIpHash,
  hasSessionCookie,
  buildSessionCookieHeader,
} from "@jawwing/api/anonymous";
import { isBanned } from "@jawwing/api/bans";
import { notifyPostReply } from "@jawwing/api/notifications";
import { reviewPost } from "@jawwing/mod/engine";

type RouteContext = { params: Promise<{ id: string }> };

// ─── GET /api/v1/posts/[id]/replies ──────────────────────────────────────────

export async function GET(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "200", 10), 500);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const [post] = await db.select({ id: posts.id }).from(posts).where(eq(posts.id, id)).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });

    const results = await db
      .select().from(replies)
      .where(and(eq(replies.post_id, id), eq(replies.status, "active")))
      .orderBy(asc(replies.created_at))
      .limit(limit).offset(offset);

    // Strip sensitive fields
    const sanitized = results.map((r) => ({ ...r, ip_hash: undefined, user_id: undefined }));
    return NextResponse.json({ replies: sanitized, meta: { limit, offset, count: results.length } });
  } catch (err) {
    console.error("[GET /api/v1/posts/:id/replies]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// ─── POST /api/v1/posts/[id]/replies — anonymous, no auth required ────────────

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  try {
    const { id: post_id } = await context.params;

    // ── Anonymous identity ──────────────────────────────────────────────────
    const ipHash = getIpHash(req);
    const anonymousId = getAnonymousId(req);
    const needsCookie = !hasSessionCookie(req);

    // ── Ban check ───────────────────────────────────────────────────────────
    if (ipHash !== "unknown") {
      const banned = await isBanned(ipHash);
      if (banned) {
        return NextResponse.json({ error: "You are banned", code: "BANNED" }, { status: 403 });
      }
    }

    // ── Rate limit: shared across posts AND replies per IP (10/hour) ────────
    const rateLimit = checkRateLimit(ipHash, "human", "post");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Try again later.", code: "RATE_LIMITED", resetAt: rateLimit.resetAt },
        { status: 429 }
      );
    }

    // ── Post checks ─────────────────────────────────────────────────────────
    const [post] = await db.select().from(posts).where(eq(posts.id, post_id)).limit(1);
    if (!post) return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });
    if (post.status !== "active") return NextResponse.json({ error: "Post is not active", code: "POST_INACTIVE" }, { status: 422 });

    const nowTs = now();
    if (post.expires_at <= nowTs) return NextResponse.json({ error: "Post has expired", code: "POST_EXPIRED" }, { status: 422 });

    // ── Body parsing ─────────────────────────────────────────────────────────
    let body: { content?: unknown; parent_reply_id?: unknown };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 }); }

    const { content, parent_reply_id } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "content is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    const trimmed = content.trim();
    if (trimmed.length === 0) {
      return NextResponse.json({ error: "content cannot be empty", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (trimmed.length > 300) {
      return NextResponse.json({ error: "content must be 300 characters or fewer", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    // ── Validate parent reply ────────────────────────────────────────────────
    if (parent_reply_id !== undefined && parent_reply_id !== null) {
      if (typeof parent_reply_id !== "string") {
        return NextResponse.json({ error: "parent_reply_id must be a string", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      const [parentReply] = await db
        .select({ id: replies.id })
        .from(replies)
        .where(and(eq(replies.id, parent_reply_id), eq(replies.post_id, post_id)))
        .limit(1);
      if (!parentReply) {
        return NextResponse.json({ error: "Parent reply not found", code: "NOT_FOUND" }, { status: 404 });
      }
    }

    // ── Optional account for notification linking ────────────────────────────
    const replierAccountId = await getOptionalAccountId(req);

    // ── Insert reply ─────────────────────────────────────────────────────────
    const id = nanoid();
    const [created] = await db.insert(replies).values({
      id,
      post_id,
      parent_reply_id: (parent_reply_id as string | null) ?? null,
      user_id: anonymousId,
      ip_hash: ipHash,
      account_id: replierAccountId,
      content: trimmed,
      created_at: nowTs,
      status: "active",
    }).returning();

    await db.update(posts)
      .set({ reply_count: sql`${posts.reply_count} + 1` })
      .where(eq(posts.id, post_id));

    // Notify post author (fire and forget) — email notification
    notifyPostReply(post_id, trimmed).catch(() => {/* best-effort */});

    // In-app notification: if post has an account_id different from replier, create notification
    if (post.account_id && post.account_id !== replierAccountId) {
      db.insert(notifications).values({
        id: nanoid(),
        account_id: post.account_id,
        type: "reply",
        post_id,
        reply_id: id,
        message: "Someone replied to your post",
        read: 0,
        created_at: nowTs,
      }).catch((err) => console.error("[reply notif]", err));
    }

    // Moderate reply via AI (fire and forget)
    // Note: reviewPost logs mod_actions against posts.id (FK constraint), so for replies
    // we pass the parent post_id but check the reply content. On removal, we update the reply.
    setImmediate(() => {
      const fakePostForReview = {
        ...post,
        id: post_id, // use parent post_id so mod_actions FK is valid
        content: trimmed,
        image_url: null,
        image_width: null,
        image_height: null,
        video_url: null,
        video_thumbnail: null,
      } as Parameters<typeof reviewPost>[0];
      reviewPost(fakePostForReview).then((decision) => {
        console.log(`[MOD] Reply ${created.id} (post ${post_id}): ${decision.action} - ${decision.reasoning.slice(0, 80)}`);
        if (decision.action === "remove") {
          db.update(replies).set({ status: "removed" }).where(eq(replies.id, created.id)).catch((err) => {
            console.error('[MOD] Failed to remove reply:', err);
          });
        }
      }).catch((err) => {
        console.error('[MOD] Error reviewing reply:', err);
      });
    });

    // ── Set session cookie if needed ─────────────────────────────────────────
    const response = NextResponse.json({ reply: { ...created, ip_hash: undefined, user_id: undefined } }, { status: 201 });
    if (needsCookie) {
      response.headers.set("Set-Cookie", buildSessionCookieHeader(anonymousId));
    }
    return response;
  } catch (err) {
    console.error("[POST /api/v1/posts/:id/replies]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
