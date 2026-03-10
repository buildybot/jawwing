import { NextRequest, NextResponse } from "next/server";
import { db, posts } from "@jawwing/db";
import { getHexesForRadius } from "@jawwing/api/geo";
import { and, inArray, gt, eq, desc } from "drizzle-orm";

/**
 * GET /api/v1/posts/new?since=<unix_ts>&lat=<lat>&lng=<lng>&radius=<meters>
 *
 * Returns posts created after `since` timestamp within the given lat/lng radius.
 * Used for the feed polling mechanism.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const lat = parseFloat(searchParams.get("lat") ?? "");
    const lng = parseFloat(searchParams.get("lng") ?? "");
    const since = parseInt(searchParams.get("since") ?? "0", 10);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "lat and lng are required", code: "INVALID_PARAMS" },
        { status: 400 }
      );
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return NextResponse.json(
        { error: "Invalid coordinates", code: "INVALID_PARAMS" },
        { status: 400 }
      );
    }
    if (isNaN(since) || since <= 0) {
      return NextResponse.json(
        { error: "since must be a valid unix timestamp", code: "INVALID_PARAMS" },
        { status: 400 }
      );
    }

    const radius = parseInt(searchParams.get("radius") ?? "5000", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
    const nowTs = Math.floor(Date.now() / 1000);

    const hexes = getHexesForRadius(lat, lng, radius);

    const results = await db
      .select()
      .from(posts)
      .where(
        and(
          inArray(posts.h3_index, hexes),
          gt(posts.created_at, since),
          gt(posts.expires_at, nowTs),
          eq(posts.status, "active")
        )
      )
      .orderBy(desc(posts.created_at))
      .limit(limit);

    // Sanitize coordinates for privacy
    const sanitized = results.map((p) => ({
      ...p,
      lat: Math.round(p.lat * 100) / 100,
      lng: Math.round(p.lng * 100) / 100,
      ip_hash: undefined,
      user_id: undefined,
    }));
    return NextResponse.json({
      posts: sanitized,
      meta: { since, count: results.length },
    });
  } catch (err) {
    console.error("[GET /api/v1/posts/new]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
