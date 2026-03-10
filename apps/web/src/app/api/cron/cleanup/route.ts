import { NextRequest, NextResponse } from "next/server";
import { db, posts, votes, replies } from "@jawwing/db";
import { lt, eq, and, inArray } from "drizzle-orm";

/**
 * POST /api/cron/cleanup
 *
 * Deletes expired posts (expires_at < now) and their orphaned votes/replies.
 * Protected by CRON_SECRET in Authorization header.
 *
 * Configured in vercel.json to run every hour: "0 * * * *"
 */
// Vercel crons send GET requests
export async function GET(req: NextRequest): Promise<NextResponse> {
  return handleCleanup(req);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  return handleCleanup(req);
}

async function handleCleanup(req: NextRequest): Promise<NextResponse> {
  // ─── Auth ─────────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("Authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const nowTs = Math.floor(Date.now() / 1000);

    // ─── Find expired post IDs ─────────────────────────────────────────────
    const expiredPosts = await db
      .select({ id: posts.id })
      .from(posts)
      .where(lt(posts.expires_at, nowTs));

    const expiredIds = expiredPosts.map((p) => p.id);

    let deletedVotes = 0;
    let deletedReplies = 0;
    let deletedPosts = 0;

    if (expiredIds.length > 0) {
      // ─── Clean up orphaned votes ─────────────────────────────────────────
      // votes.post_id has ON DELETE CASCADE, but we do it explicitly for safety
      // and to track counts
      const votesResult = await db
        .delete(votes)
        .where(inArray(votes.post_id, expiredIds));
      deletedVotes = (votesResult as { rowsAffected?: number }).rowsAffected ?? 0;

      // ─── Clean up orphaned replies ───────────────────────────────────────
      const repliesResult = await db
        .delete(replies)
        .where(inArray(replies.post_id, expiredIds));
      deletedReplies = (repliesResult as { rowsAffected?: number }).rowsAffected ?? 0;

      // ─── Delete expired posts ─────────────────────────────────────────────
      const postsResult = await db
        .delete(posts)
        .where(lt(posts.expires_at, nowTs));
      deletedPosts = (postsResult as { rowsAffected?: number }).rowsAffected ?? 0;
    }

    console.log(`[cron/cleanup] deleted ${deletedPosts} posts, ${deletedVotes} votes, ${deletedReplies} replies`);

    return NextResponse.json({
      ok: true,
      deleted: {
        posts: deletedPosts,
        votes: deletedVotes,
        replies: deletedReplies,
      },
      timestamp: nowTs,
    });
  } catch (err) {
    console.error("[POST /api/cron/cleanup]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
