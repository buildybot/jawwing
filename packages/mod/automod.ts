/**
 * automod.ts — Automatic moderation triggers for Jawwing
 *
 * Called by the post creation pipeline and report handlers.
 * All AI review is async — never blocks post creation.
 */

import crypto from "crypto";
import { db, posts, reports, mod_actions, nanoid, now } from "@jawwing/db"; // reports used for count query
import { eq, and, gte, count, sql } from "drizzle-orm";
import { reviewPost } from "./engine";
import type { Post } from "@jawwing/db";

// ─── Constants ────────────────────────────────────────────────────────────────

// How many identical content hashes before we flag as spam
const SPAM_HASH_THRESHOLD = 3;
// Time window for duplicate detection (seconds)
const SPAM_WINDOW_SECONDS = 60 * 10; // 10 minutes
// Posts per hour per user before rate limit flag
const RATE_LIMIT_POSTS_PER_HOUR = 20;
// How many reports on a single post before immediate AI review
const REPORT_THRESHOLD_FOR_IMMEDIATE_REVIEW = 3;

// In-memory hash store for duplicate detection (replace with Redis in prod)
const contentHashCache = new Map<string, { count: number; firstSeen: number }>();

// ─── Content hashing ──────────────────────────────────────────────────────────

function hashContent(content: string): string {
  // Normalize: lowercase, strip punctuation/whitespace for fuzzy duplicate detection
  const normalized = content.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
  return crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

// ─── onPostCreated ────────────────────────────────────────────────────────────

/**
 * Called after every new post. Triggers async AI review.
 * Returns immediately — does not block post creation.
 */
export function onPostCreated(post: Post): void {
  // Fire and forget — moderation is async
  setImmediate(() => {
    runAutomod(post).catch((err) => {
      console.error(`[automod] onPostCreated failed for post ${post.id}:`, err);
    });
  });
}

async function runAutomod(post: Post): Promise<void> {
  // ── 1. Duplicate/spam detection ─────────────────────────────────────────
  const hash = hashContent(post.content);
  const cacheEntry = contentHashCache.get(hash);
  const nowTs = now();

  if (cacheEntry) {
    // Reset window if expired
    if (nowTs - cacheEntry.firstSeen > SPAM_WINDOW_SECONDS) {
      contentHashCache.set(hash, { count: 1, firstSeen: nowTs });
    } else {
      cacheEntry.count++;
      contentHashCache.set(hash, cacheEntry);

      if (cacheEntry.count >= SPAM_HASH_THRESHOLD) {
        console.log(
          `[automod] Duplicate content detected for post ${post.id} (hash: ${hash}, count: ${cacheEntry.count})`
        );
        // Flag as potential spam immediately, then also run AI review
        await logSpamFlag(post, hash, cacheEntry.count);
        return; // Don't double-review
      }
    }
  } else {
    contentHashCache.set(hash, { count: 1, firstSeen: nowTs });
  }

  // ── 2. Rate limit detection ──────────────────────────────────────────────
  const oneHourAgo = nowTs - 3600;
  const [{ postCount }] = await db
    .select({ postCount: count() })
    .from(posts)
    .where(
      and(
        eq(posts.user_id, post.user_id),
        gte(posts.created_at, oneHourAgo)
      )
    );

  if (postCount > RATE_LIMIT_POSTS_PER_HOUR) {
    console.log(
      `[automod] Rate limit exceeded for user ${post.user_id}: ${postCount} posts/hour`
    );
    await logRateLimitFlag(post, postCount);
    return;
  }

  // ── 3. Standard AI review ────────────────────────────────────────────────
  await reviewPost(post);
}

async function logSpamFlag(post: Post, hash: string, count: number): Promise<void> {
  const agentId = process.env.MOD_AGENT_ID ?? "agent-system";
  await db.insert(mod_actions).values({
    id: nanoid(),
    post_id: post.id,
    agent_id: agentId,
    action: "flag",
    rule_cited: "R-2",
    reasoning: `Duplicate content detected: ${count} identical posts within ${SPAM_WINDOW_SECONDS}s (hash: ${hash})`,
    created_at: now(),
    appealed: false,
    appeal_result: null,
  });

  await db
    .update(posts)
    .set({ status: "moderated" })
    .where(eq(posts.id, post.id));
}

async function logRateLimitFlag(post: Post, postCount: number): Promise<void> {
  const agentId = process.env.MOD_AGENT_ID ?? "agent-system";
  await db.insert(mod_actions).values({
    id: nanoid(),
    post_id: post.id,
    agent_id: agentId,
    action: "flag",
    rule_cited: "R-2",
    reasoning: `Rate limit violation: ${postCount} posts in the last hour (limit: ${RATE_LIMIT_POSTS_PER_HOUR})`,
    created_at: now(),
    appealed: false,
    appeal_result: null,
  });

  await db
    .update(posts)
    .set({ status: "moderated" })
    .where(eq(posts.id, post.id));
}

// ─── onPostReported ───────────────────────────────────────────────────────────

/**
 * Handles a user report on a post.
 * Logs the report and triggers immediate AI review if threshold is met.
 */
export async function onPostReported(
  postId: string,
  reporterId: string,
  reason: string
): Promise<void> {
  // Note: The report record is inserted by the caller (API route).
  // This function handles the moderation trigger logic only.

  // Count total unresolved reports for this post
  const [{ reportCount }] = await db
    .select({ reportCount: count() })
    .from(reports)
    .where(and(eq(reports.post_id, postId), eq(reports.resolved, false)));

  console.log(`[automod] Post ${postId} has ${reportCount} unresolved report(s)`);

  // Fetch the post
  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) {
    console.warn(`[automod] Report for unknown post: ${postId}`);
    return;
  }

  // Skip if post already removed
  if (post.status === "removed") return;

  // Trigger immediate async AI review when threshold is met
  if (reportCount >= REPORT_THRESHOLD_FOR_IMMEDIATE_REVIEW) {
    console.log(
      `[automod] ${reportCount} reports on post ${postId} — triggering immediate review`
    );
    setImmediate(() => {
      reviewPost(post).catch((err) => {
        console.error(`[automod] Immediate review failed for post ${postId}:`, err);
      });
    });
  }
}
