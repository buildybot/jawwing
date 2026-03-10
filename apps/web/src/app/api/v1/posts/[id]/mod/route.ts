import { NextRequest, NextResponse } from "next/server";
import { db, mod_actions, posts } from "@jawwing/db";
import { eq, desc } from "drizzle-orm";

export const runtime = "nodejs";

// GET /api/v1/posts/[id]/mod — public transparency endpoint
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  try {
    const [action] = await db
      .select({
        action: mod_actions.action,
        reasoning: mod_actions.reasoning,
        rule_cited: mod_actions.rule_cited,
        agent_id: mod_actions.agent_id,
        created_at: mod_actions.created_at,
      })
      .from(mod_actions)
      .where(eq(mod_actions.post_id, id))
      .orderBy(desc(mod_actions.created_at))
      .limit(1);

    if (!action) {
      // Check if post exists at all
      const [post] = await db
        .select({ mod_confidence: posts.mod_confidence })
        .from(posts)
        .where(eq(posts.id, id))
        .limit(1);

      if (!post) {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }

      return NextResponse.json({ status: "pending" });
    }

    // Get confidence from the posts table
    const [post] = await db
      .select({ mod_confidence: posts.mod_confidence })
      .from(posts)
      .where(eq(posts.id, id))
      .limit(1);

    return NextResponse.json({
      ...action,
      confidence: post?.mod_confidence ?? null,
    });
  } catch (err) {
    console.error("[mod route] error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
