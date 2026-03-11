import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { reviewPost } from "@jawwing/mod/engine";
import type { Post } from "@jawwing/db";

/**
 * GET /api/cron/mod-queue
 *
 * Processes pending posts that need moderation.
 * - Retries posts that failed moderation (mod_retries < 3)
 * - Marks posts with 3+ failures as "mod_failed" and tells user to repost
 * - Runs every 2 minutes via Vercel cron
 *
 * Posts should NEVER appear in feeds without moderation approval.
 */

export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("Authorization");
  const adminKey = req.headers.get("x-admin-key");

  // Allow cron secret OR admin key
  if ((!cronSecret || authHeader !== `Bearer ${cronSecret}`) && adminKey !== process.env.ADMIN_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  try {
    // 1. Mark posts with 3+ retries as "mod_failed"
    const failedResult = await client.execute({
      sql: "UPDATE posts SET status = 'mod_failed' WHERE status = 'pending' AND mod_retries >= 3",
      args: [],
    });
    const markedFailed = failedResult.rowsAffected;

    // 2. Get pending posts that still need moderation (< 3 retries)
    const pendingResult = await client.execute({
      sql: "SELECT * FROM posts WHERE status = 'pending' AND mod_retries < 3 ORDER BY created_at ASC LIMIT 20",
      args: [],
    });

    let processed = 0;
    let approved = 0;
    let removed = 0;
    let flagged = 0;
    let retried = 0;

    for (const row of pendingResult.rows) {
      const post: Post = {
        id: String(row.id),
        user_id: row.user_id ? String(row.user_id) : null,
        account_id: row.account_id ? String(row.account_id) : null,
        ip_hash: row.ip_hash ? String(row.ip_hash) : null,
        content: String(row.content ?? ""),
        lat: Number(row.lat),
        lng: Number(row.lng),
        h3_index: String(row.h3_index ?? ""),
        score: Number(row.score ?? 0),
        reply_count: Number(row.reply_count ?? 0),
        created_at: Number(row.created_at),
        expires_at: Number(row.expires_at),
        status: String(row.status) as "pending",
        mod_action_id: row.mod_action_id ? String(row.mod_action_id) : null,
        mod_confidence: row.mod_confidence != null ? Number(row.mod_confidence) : null,
        mod_retries: Number(row.mod_retries ?? 0),
        image_url: row.image_url ? String(row.image_url) : null,
        image_width: row.image_width ? Number(row.image_width) : null,
        image_height: row.image_height ? Number(row.image_height) : null,
        video_url: row.video_url ? String(row.video_url) : null,
        video_thumbnail: row.video_thumbnail ? String(row.video_thumbnail) : null,
        upvotes: Number(row.upvotes ?? 0),
        downvotes: Number(row.downvotes ?? 0),
      } as Post;

      try {
        const decision = await reviewPost(post);
        processed++;
        if (decision.action === "approve") approved++;
        else if (decision.action === "remove") removed++;
        else flagged++;
      } catch (err) {
        console.error(`[cron/mod-queue] Failed to moderate post ${post.id}:`, err);
        // Increment retry counter
        await client.execute({
          sql: "UPDATE posts SET mod_retries = COALESCE(mod_retries, 0) + 1 WHERE id = ?",
          args: [post.id],
        });
        retried++;
      }
    }

    console.log(`[cron/mod-queue] processed=${processed} approved=${approved} removed=${removed} flagged=${flagged} retried=${retried} markedFailed=${markedFailed}`);

    return NextResponse.json({
      ok: true,
      processed,
      approved,
      removed,
      flagged,
      retried,
      markedFailed,
      pendingRemaining: pendingResult.rows.length - processed,
    });
  } catch (err) {
    console.error("[cron/mod-queue]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
