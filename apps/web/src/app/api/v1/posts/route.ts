import { NextRequest, NextResponse } from "next/server";
import { db, posts, nanoid, now } from "@jawwing/db";
import { withAuth, checkRateLimit, type AuthenticatedRequest } from "@jawwing/api/middleware";
import { latLngToH3 } from "@jawwing/api/geo";
import { buildFeedQuery, type SortMode } from "@jawwing/api/feed";
import { validate, PostSchema } from "@jawwing/api/validation";

// ─── Sanitize content — strip HTML tags ───────────────────────────────────────

function sanitizeContent(raw: string): string {
  return raw.replace(/<[^>]*>/g, "").trim();
}

// ─── GET /api/v1/posts ────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lng = parseFloat(searchParams.get("lng") ?? "");

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: "lat and lng are required", code: "INVALID_PARAMS" }, { status: 400 });
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json({ error: "Invalid coordinates", code: "INVALID_PARAMS" }, { status: 400 });
    }

    const radius = parseInt(searchParams.get("radius") ?? "5000", 10);
    const sort = (searchParams.get("sort") ?? "hot") as SortMode;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    if (!["hot", "new", "top"].includes(sort)) {
      return NextResponse.json({ error: "sort must be hot, new, or top", code: "INVALID_PARAMS" }, { status: 400 });
    }

    const results = await buildFeedQuery({ lat, lng, radiusMeters: radius, sort, limit, offset });
    return NextResponse.json({ posts: results, meta: { limit, offset, count: results.length } });
  } catch (err) {
    console.error("[GET /api/v1/posts]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

// ─── POST /api/v1/posts ───────────────────────────────────────────────────────

async function createPost(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const { user } = req;

    const rateLimit = checkRateLimit(user.id, user.type, "post");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", code: "RATE_LIMIT", resetAt: rateLimit.resetAt },
        { status: 429, headers: { "X-RateLimit-Remaining": "0", "X-RateLimit-Reset": String(Math.floor(rateLimit.resetAt / 1000)) } }
      );
    }

    let body: unknown;
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 }); }

    const parsed = validate(PostSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error, code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const { lat, lng } = parsed.data;
    // Sanitize: strip HTML then re-trim (PostSchema already validated length pre-sanitize;
    // re-check after sanitize to be safe)
    const content = sanitizeContent(parsed.data.content);
    if (content.length === 0) {
      return NextResponse.json({ error: "content cannot be empty after sanitization", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const h3_index = latLngToH3(lat, lng);
    const nowTs = now();
    const expires_at = nowTs + 24 * 60 * 60;
    const id = nanoid();

    const [created] = await db.insert(posts).values({
      id, user_id: user.id, content, lat, lng,
      h3_index, score: 0, reply_count: 0, created_at: nowTs, expires_at, status: "active",
    }).returning();

    return NextResponse.json({ post: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/posts]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export const POST = withAuth(createPost as Parameters<typeof withAuth>[0]);
