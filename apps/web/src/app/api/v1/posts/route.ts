import { NextRequest, NextResponse } from "next/server";
import { db, posts, nanoid, now } from "@jawwing/db";
import { withAuth, checkRateLimit, type AuthenticatedRequest } from "@jawwing/api/middleware";
import { latLngToH3, getHexesForRadius } from "@jawwing/api/geo";
import { buildFeedQuery, type SortMode } from "@jawwing/api/feed";

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

    let body: { content?: unknown; lat?: unknown; lng?: unknown };
    try { body = await req.json(); }
    catch { return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 }); }

    const { content, lat, lng } = body;

    if (!content || typeof content !== "string") {
      return NextResponse.json({ error: "content is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    const trimmed = content.trim();
    if (trimmed.length === 0) return NextResponse.json({ error: "content cannot be empty", code: "VALIDATION_ERROR" }, { status: 400 });
    if (trimmed.length > 300) return NextResponse.json({ error: "content must be 300 characters or fewer", code: "VALIDATION_ERROR" }, { status: 400 });

    const latNum = typeof lat === "string" ? parseFloat(lat) : Number(lat);
    const lngNum = typeof lng === "string" ? parseFloat(lng) : Number(lng);

    if (isNaN(latNum) || isNaN(lngNum)) return NextResponse.json({ error: "lat and lng are required", code: "VALIDATION_ERROR" }, { status: 400 });
    if (latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) return NextResponse.json({ error: "Invalid coordinates", code: "VALIDATION_ERROR" }, { status: 400 });

    const h3_index = latLngToH3(latNum, lngNum);
    const nowTs = now();
    const expires_at = nowTs + 24 * 60 * 60;
    const id = nanoid();

    const [created] = await db.insert(posts).values({
      id, user_id: user.id, content: trimmed, lat: latNum, lng: lngNum,
      h3_index, score: 0, reply_count: 0, created_at: nowTs, expires_at, status: "active",
    }).returning();

    return NextResponse.json({ post: created }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/posts]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export const POST = withAuth(createPost as Parameters<typeof withAuth>[0]);
