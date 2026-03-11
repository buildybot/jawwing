import { NextRequest, NextResponse } from "next/server";
import { db, posts, mod_actions } from "@jawwing/db";
import { eq, and, or, inArray, desc } from "drizzle-orm";
import { getAccountFromRequest } from "@jawwing/api/accounts";
import { getAnonymousId } from "@jawwing/api/anonymous";
import { getIpHash } from "@jawwing/api/anonymous";

// ─── GET /api/v1/my/rejected ──────────────────────────────────────────────────
// Returns the current user's posts that were moderated/removed, with explanations.
// Works for both anonymous (by IP hash) and authenticated (by account_id) users.

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const account = await getAccountFromRequest(req);
    const sessionId = getAnonymousId(req);
    const ipHash = getIpHash(req);

    // Build conditions — match by account_id, session user_id, or ip_hash
    const conditions = [eq(posts.ip_hash, ipHash)];
    if (account) conditions.push(eq(posts.account_id, account.id));
    if (sessionId) conditions.push(eq(posts.user_id, sessionId));

    // Get removed/moderated posts
    const rejectedPosts = await db
      .select({
        id: posts.id,
        content: posts.content,
        status: posts.status,
        created_at: posts.created_at,
        mod_confidence: posts.mod_confidence,
        mod_action_id: posts.mod_action_id,
        image_url: posts.image_url,
      })
      .from(posts)
      .where(
        and(
          or(...conditions),
          or(eq(posts.status, "removed"), eq(posts.status, "moderated"))
        )
      )
      .orderBy(desc(posts.created_at))
      .limit(50);

    // Fetch mod actions for each post
    const postsWithReasons = await Promise.all(
      rejectedPosts.map(async (post) => {
        let modAction = null;
        if (post.mod_action_id) {
          const [action] = await db
            .select({
              action: mod_actions.action,
              rule_cited: mod_actions.rule_cited,
              reasoning: mod_actions.reasoning,
              created_at: mod_actions.created_at,
            })
            .from(mod_actions)
            .where(eq(mod_actions.id, post.mod_action_id))
            .limit(1);
          modAction = action ?? null;
        }
        return {
          id: post.id,
          content: post.content,
          status: post.status,
          created_at: post.created_at,
          mod_confidence: post.mod_confidence,
          image_url: post.image_url,
          moderation: modAction
            ? {
                action: modAction.action,
                rule_cited: modAction.rule_cited,
                reasoning: modAction.reasoning,
                reviewed_at: modAction.created_at,
              }
            : null,
        };
      })
    );

    return NextResponse.json({ posts: postsWithReasons });
  } catch (err) {
    console.error("[GET /api/v1/my/rejected]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
