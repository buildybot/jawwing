import { NextRequest, NextResponse } from "next/server";
import { db, posts, reports, nanoid, now } from "@jawwing/db";
import { eq } from "drizzle-orm";
import { onPostReported } from "@jawwing/mod/automod";
import { validate, ReportSchema } from "@jawwing/api/validation";
import { getIpHash } from "@jawwing/api/anonymous";
import { isBanned } from "@jawwing/api/bans";

// ─── POST /api/v1/reports ─────────────────────────────────────────────────────
// Creates a report on a post. No auth required — anonymous by IP hash.

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ipHash = getIpHash(req);

    if (isBanned(ipHash)) {
      return NextResponse.json(
        { error: "Forbidden", code: "BANNED" },
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

    const [post] = await db.select().from(posts).where(eq(posts.id, post_id)).limit(1);
    if (!post) {
      return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const reportId = nanoid();
    await db.insert(reports).values({
      id: reportId,
      post_id,
      reporter_hash: ipHash,
      ip_hash: ipHash,
      reason: reason.trim(),
      created_at: now(),
      resolved: false,
    });

    onPostReported(post_id, ipHash, reason.trim()).catch((err) => {
      console.error(`[POST /api/v1/reports] onPostReported failed for post ${post_id}:`, err);
    });

    return NextResponse.json({ ok: true, id: reportId }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/reports]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
