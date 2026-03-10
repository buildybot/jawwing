import { NextRequest, NextResponse } from "next/server";
import { db, posts, reports, nanoid, now } from "@jawwing/db";
import { eq, and, gte, count } from "drizzle-orm";
import { onPostReported } from "@jawwing/mod/automod";
import { validate, ReportSchema } from "@jawwing/api/validation";
import { getIpHash } from "@jawwing/api/anonymous";
import { isBanned } from "@jawwing/api/bans";

// ─── POST /api/v1/reports ─────────────────────────────────────────────────────
// Creates a report on a post or reply. No auth required — anonymous by IP hash.
// Rate limit: 10 reports/hour per IP. 1 report per IP per post/reply.

// ── In-memory rate limit tracker (replace with Redis in prod) ────────────────
// Map<ipHash, { count: number; windowStart: number }>
const reportRateLimit = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 3600; // 1 hour in seconds

function checkRateLimit(ipHash: string): { allowed: boolean; remaining: number } {
  const nowTs = now();
  const entry = reportRateLimit.get(ipHash);

  if (!entry || nowTs - entry.windowStart >= RATE_LIMIT_WINDOW) {
    // New window
    reportRateLimit.set(ipHash, { count: 1, windowStart: nowTs });
    return { allowed: true, remaining: RATE_LIMIT_MAX - 1 };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  reportRateLimit.set(ipHash, entry);
  return { allowed: true, remaining: RATE_LIMIT_MAX - entry.count };
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ipHash = getIpHash(req);

    if (isBanned(ipHash)) {
      return NextResponse.json(
        { error: "Forbidden", code: "BANNED" },
        { status: 403 }
      );
    }

    // ── Rate limit check ─────────────────────────────────────────────────────
    const rateResult = checkRateLimit(ipHash);
    if (!rateResult.allowed) {
      return NextResponse.json(
        { error: "Too many reports. Try again later.", code: "RATE_LIMITED" },
        { status: 429 }
      );
    }

    // ── Parse body ───────────────────────────────────────────────────────────
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const parsed = validate(ReportSchema, body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { post_id, reply_id, reason } = parsed.data;

    // ── Post must exist ──────────────────────────────────────────────────────
    const [post] = await db
      .select()
      .from(posts)
      .where(eq(posts.id, post_id))
      .limit(1);
    if (!post) {
      return NextResponse.json(
        { error: "Post not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // ── Dedup: 1 report per IP per target (post or specific reply) ────────────
    // For post reports (no reply_id): check for an existing post-level report.
    // For reply reports: check for an existing report on that reply.
    const dedupConditions = reply_id
      ? and(
          eq(reports.post_id, post_id),
          eq(reports.reporter_hash, ipHash),
          eq(reports.reply_id, reply_id)
        )
      : and(
          eq(reports.post_id, post_id),
          eq(reports.reporter_hash, ipHash)
        );

    const existingReports = await db
      .select({ id: reports.id })
      .from(reports)
      .where(dedupConditions)
      .limit(1);

    if (existingReports.length > 0) {
      return NextResponse.json(
        { error: "Already reported", code: "ALREADY_REPORTED" },
        { status: 409 }
      );
    }

    // ── Insert report ─────────────────────────────────────────────────────────
    const reportId = nanoid();
    await db.insert(reports).values({
      id: reportId,
      post_id,
      reply_id: reply_id ?? null,
      reporter_hash: ipHash,
      ip_hash: ipHash,
      reason: reason.trim(),
      created_at: now(),
      resolved: false,
    });

    // ── Trigger automod async (fire & forget) ─────────────────────────────────
    onPostReported(post_id, ipHash, reason.trim()).catch((err) => {
      console.error(
        `[POST /api/v1/reports] onPostReported failed for post ${post_id}:`,
        err
      );
    });

    return NextResponse.json({ ok: true, id: reportId }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/reports]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
