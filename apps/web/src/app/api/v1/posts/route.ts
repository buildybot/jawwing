import { NextRequest, NextResponse } from "next/server";
import { db, posts, nanoid, now } from "@jawwing/db";
import { checkRateLimit } from "@jawwing/api/middleware";
import { latLngToH3 } from "@jawwing/api/geo";
import { buildFeedQuery, type SortMode } from "@jawwing/api/feed";
import { validate, PostSchema } from "@jawwing/api/validation";
import {
  getAnonymousId,
  getIpHash,
  hasSessionCookie,
  buildSessionCookieHeader,
} from "@jawwing/api/anonymous";
import { isBanned } from "@jawwing/api/bans";
import { onPostCreated } from "@jawwing/mod/automod";
import { CONSTITUTION_RULES } from "@jawwing/mod/engine";

// ─── Anti-Spoofing: In-memory last-known position per IP hash ─────────────────

interface LastPosition {
  lat: number;
  lng: number;
  ts: number;
}

const lastPositionMap = new Map<string, LastPosition>();

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TELEPORT_MAX_KM = 100;
const TELEPORT_WINDOW_SEC = 300;

// ─── Sanitize content ─────────────────────────────────────────────────────────

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

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ipHash = getIpHash(req);
    const anonymousId = getAnonymousId(req);
    const needsCookie = !hasSessionCookie(req);

    // Ban check
    if (isBanned(ipHash)) {
      return NextResponse.json(
        { error: "Forbidden", code: "BANNED" },
        { status: 403 }
      );
    }

    // Rate limit: 10 posts/hour per IP hash
    const rateLimit = checkRateLimit(ipHash, "human", "post");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Rate limit exceeded", code: "RATE_LIMIT", resetAt: rateLimit.resetAt },
        {
          status: 429,
          headers: {
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.floor(rateLimit.resetAt / 1000)),
          },
        }
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

    // Require GPS
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
      return NextResponse.json(
        { error: "GPS location required to post", code: "LOCATION_REQUIRED" },
        { status: 422 }
      );
    }

    // Reject null island
    if (lat === 0 && lng === 0) {
      return NextResponse.json(
        { error: "Invalid location: null island coordinates rejected", code: "INVALID_LOCATION" },
        { status: 422 }
      );
    }

    // Teleportation check
    const nowSec = Math.floor(Date.now() / 1000);
    const lastPos = lastPositionMap.get(ipHash);
    if (lastPos) {
      const elapsed = nowSec - lastPos.ts;
      if (elapsed < TELEPORT_WINDOW_SEC) {
        const distKm = haversineKm(lastPos.lat, lastPos.lng, lat, lng);
        if (distKm > TELEPORT_MAX_KM) {
          return NextResponse.json(
            {
              error: `Location jump too large (${Math.round(distKm)}km in ${elapsed}s). Try again later.`,
              code: "LOCATION_SPOOFING",
            },
            { status: 422 }
          );
        }
      }
    }

    const content = sanitizeContent(parsed.data.content);
    if (content.length === 0) {
      return NextResponse.json({ error: "content cannot be empty after sanitization", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const h3_index = latLngToH3(lat, lng);
    const nowTs = now();
    const expires_at = nowTs + 24 * 60 * 60;
    const id = nanoid();

    // ── Video domain check (AV-1) ─────────────────────────────────────────────
    // Extract any URLs from the post. If a URL points to a video platform domain
    // that is NOT on the constitution's allowed list, pre-flag the post for mod
    // review before the async AI pipeline runs.
    const ALLOWED_VIDEO_DOMAINS = new Set(
      CONSTITUTION_RULES.allowedVideoSources.allowedDomains.map((d) => d.domain)
    );
    // Common video platform hostnames to detect (catches unlisted platforms)
    const VIDEO_PLATFORM_RE = /^(youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|twitch\.tv|instagram\.com|dailymotion\.com|rumble\.com|odysee\.com|bitchute\.com|streamable\.com|loom\.com|wistia\.com|brightcove\.com|jwplayer\.com|kaltura\.com)$/i;
    let needsVideoReview = false;
    const urlMatches = content.match(/https?:\/\/[^\s)>]+/gi);
    if (urlMatches) {
      for (const rawUrl of urlMatches) {
        try {
          const hostname = new URL(rawUrl).hostname.replace(/^www\./, "").toLowerCase();
          if (VIDEO_PLATFORM_RE.test(hostname) && !ALLOWED_VIDEO_DOMAINS.has(hostname)) {
            needsVideoReview = true;
            break;
          }
        } catch {
          // ignore invalid URLs
        }
      }
    }

    const [created] = await db.insert(posts).values({
      id,
      user_id: anonymousId,
      ip_hash: ipHash,
      content,
      lat,
      lng,
      h3_index,
      score: 0,
      reply_count: 0,
      created_at: nowTs,
      expires_at,
      status: needsVideoReview ? "moderated" : "active",
    }).returning();

    lastPositionMap.set(ipHash, { lat, lng, ts: nowTs });

    onPostCreated(created);

    const response = NextResponse.json({ post: created }, { status: 201 });

    // Set session cookie if new visitor
    if (needsCookie) {
      response.headers.set("Set-Cookie", buildSessionCookieHeader(anonymousId));
    }

    return response;
  } catch (err) {
    console.error("[POST /api/v1/posts]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
