import { NextResponse } from "next/server";
import { db, posts, mod_actions, nanoid, now } from "@jawwing/db";
import { eq } from "drizzle-orm";
import { withAuth, type AuthenticatedRequest } from "@jawwing/api/middleware";
import type { ModerationAction } from "@jawwing/mod/engine";

// ─── POST /api/v1/mod/review ──────────────────────────────────────────────────
// Records a manual moderation decision by an agent.
// Requires agent authentication (API key).

const VALID_ACTIONS: ModerationAction[] = ["approve", "flag", "warn", "remove"];

async function handler(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const { user } = req;

    if (user.type !== "agent") {
      return NextResponse.json(
        { error: "Forbidden: agent access required", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    let body: {
      post_id?: unknown;
      action?: unknown;
      rule_cited?: unknown;
      reasoning?: unknown;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    const { post_id, action, rule_cited, reasoning } = body;

    if (!post_id || typeof post_id !== "string") {
      return NextResponse.json({ error: "post_id is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (!action || typeof action !== "string" || !VALID_ACTIONS.includes(action as ModerationAction)) {
      return NextResponse.json(
        { error: `action must be one of: ${VALID_ACTIONS.join(", ")}`, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    if (!reasoning || typeof reasoning !== "string" || reasoning.trim().length === 0) {
      return NextResponse.json({ error: "reasoning is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    // Verify post exists
    const [post] = await db.select().from(posts).where(eq(posts.id, post_id)).limit(1);
    if (!post) {
      return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const actionId = nanoid();
    const ts = now();

    await db.insert(mod_actions).values({
      id: actionId,
      post_id,
      agent_id: user.id,
      action: action as ModerationAction,
      rule_cited: rule_cited && typeof rule_cited === "string" ? rule_cited : null,
      reasoning: reasoning.trim(),
      created_at: ts,
      appealed: false,
      appeal_result: null,
    });

    // Update post status based on action
    if (action === "remove") {
      await db.update(posts).set({ status: "removed", mod_action_id: actionId }).where(eq(posts.id, post_id));
    } else if (action === "approve") {
      await db.update(posts).set({ status: "active", mod_action_id: null }).where(eq(posts.id, post_id));
    } else if (action === "flag" || action === "warn") {
      await db.update(posts).set({ status: "flagged", mod_action_id: actionId }).where(eq(posts.id, post_id));
    }

    return NextResponse.json({ ok: true, id: actionId }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/mod/review]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export const POST = withAuth(handler as Parameters<typeof withAuth>[0]);
