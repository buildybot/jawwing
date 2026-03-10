import { NextResponse } from "next/server";
import { db, posts, reports, nanoid, now } from "@jawwing/db";
import { eq } from "drizzle-orm";
import { withAuth, type AuthenticatedRequest } from "@jawwing/api/middleware";
import { onPostReported } from "@jawwing/mod/automod";
import { validate, ReportSchema } from "@jawwing/api/validation";

// ─── POST /api/v1/reports ─────────────────────────────────────────────────────
// Creates a report on a post and triggers automod if threshold is met.
// Requires human authentication (JWT session or API key with type=human).

async function handler(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const { user } = req;

    if (user.type !== "human") {
      return NextResponse.json(
        { error: "Forbidden: human auth required to submit reports", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    const parsed = validate(ReportSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { post_id, reason } = parsed.data;

    // Verify post exists
    const [post] = await db.select().from(posts).where(eq(posts.id, post_id)).limit(1);
    if (!post) {
      return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });
    }

    // Insert the report record
    const reportId = nanoid();
    await db.insert(reports).values({
      id: reportId,
      post_id,
      reporter_id: user.id,
      reason: reason.trim(),
      created_at: now(),
      resolved: false,
    });

    // Trigger automod logic asynchronously (checks threshold, maybe triggers AI review)
    onPostReported(post_id, user.id, reason.trim()).catch((err) => {
      console.error(`[POST /api/v1/reports] onPostReported failed for post ${post_id}:`, err);
    });

    return NextResponse.json({ ok: true, id: reportId }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/reports]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export const POST = withAuth(handler as Parameters<typeof withAuth>[0]);
