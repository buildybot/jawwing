import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";

export const runtime = "nodejs"; // Required for moderation (crypto + Gemini SDK)
import { db, posts, territories, nanoid, now } from "@jawwing/db";
import { eq, gt, and, desc, sql, inArray } from "drizzle-orm";
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
import { getAccountFromToken } from "@jawwing/api/accounts";
import { isBanned } from "@jawwing/api/bans";
import { onPostCreated } from "@jawwing/mod/automod";
import { CONSTITUTION_RULES } from "@jawwing/mod/engine";

// ─── Video URL extraction ─────────────────────────────────────────────────────

interface VideoMeta {
  video_url: string;
  video_id: string | null;
  video_thumbnail: string | null;
}

function extractVideoMeta(content: string): VideoMeta | null {
  const urlMatches = content.match(/https?:\/\/[^\s)>\]"]+/gi);
  if (!urlMatches) return null;

  for (const raw of urlMatches) {
    try {
      const u = new URL(raw);
      const hostname = u.hostname.replace(/^www\./, "").toLowerCase();

      // YouTube: youtube.com/watch?v=ID or youtube.com/shorts/ID
      if (hostname === "youtube.com") {
        let videoId: string | null = null;
        if (u.pathname.startsWith("/watch")) {
          videoId = u.searchParams.get("v");
        } else if (u.pathname.startsWith("/shorts/")) {
          videoId = u.pathname.split("/shorts/")[1]?.split(/[?#]/)[0] ?? null;
        } else if (u.pathname.startsWith("/embed/")) {
          videoId = u.pathname.split("/embed/")[1]?.split(/[?#]/)[0] ?? null;
        }
        if (videoId) {
          return {
            video_url: raw,
            video_id: videoId,
            video_thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          };
        }
      }

      // youtu.be/ID
      if (hostname === "youtu.be") {
        const videoId = u.pathname.slice(1).split(/[?#]/)[0];
        if (videoId) {
          return {
            video_url: raw,
            video_id: videoId,
            video_thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
          };
        }
      }

      // Vimeo: vimeo.com/ID
      if (hostname === "vimeo.com") {
        const videoId = u.pathname.slice(1).split(/[?#/]/)[0];
        if (videoId && /^\d+$/.test(videoId)) {
          return {
            video_url: raw,
            video_id: videoId,
            video_thumbnail: null, // Vimeo requires API call for thumbnail
          };
        }
      }

      // TikTok: tiktok.com/@user/video/ID
      if (hostname === "tiktok.com") {
        return {
          video_url: raw,
          video_id: null,
          video_thumbnail: null,
        };
      }
    } catch {
      // invalid URL, skip
    }
  }
  return null;
}

// ─── Privacy: strip exact coordinates from responses ──────────────────────────
// Round to 2 decimal places (~1.1km) so client can still compute approximate
// distance but nobody can pinpoint the poster's exact location.
function sanitizePostForResponse<T extends { lat: number; lng: number; ip_hash?: string | null; user_id?: string | null }>(post: T): T {
  return {
    ...post,
    lat: Math.round(post.lat * 100) / 100,
    lng: Math.round(post.lng * 100) / 100,
    ip_hash: undefined,  // never expose IP hash to clients
    user_id: undefined,  // never expose user_id to clients
  };
}

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

// ─── Metro area reverse-geocoding ─────────────────────────────────────────────

interface MetroArea {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

const METRO_AREAS: MetroArea[] = [
  { name: "DC METRO",      lat: 38.9072, lng: -77.0369,  radiusKm: 30 },
  { name: "NEW YORK",      lat: 40.7128, lng: -74.0060,  radiusKm: 40 },
  { name: "LOS ANGELES",   lat: 34.0522, lng: -118.2437, radiusKm: 50 },
  { name: "CHICAGO",       lat: 41.8781, lng: -87.6298,  radiusKm: 30 },
  { name: "HOUSTON",       lat: 29.7604, lng: -95.3698,  radiusKm: 40 },
  { name: "PHOENIX",       lat: 33.4484, lng: -112.0740, radiusKm: 30 },
  { name: "PHILADELPHIA",  lat: 39.9526, lng: -75.1652,  radiusKm: 25 },
  { name: "SAN FRANCISCO", lat: 37.7749, lng: -122.4194, radiusKm: 30 },
  { name: "ATLANTA",       lat: 33.7490, lng: -84.3880,  radiusKm: 30 },
  { name: "BOSTON",        lat: 42.3601, lng: -71.0589,  radiusKm: 25 },
  { name: "MIAMI",         lat: 25.7617, lng: -80.1918,  radiusKm: 30 },
  { name: "SEATTLE",       lat: 47.6062, lng: -122.3321, radiusKm: 30 },
  { name: "DENVER",        lat: 39.7392, lng: -104.9903, radiusKm: 30 },
  { name: "AUSTIN",        lat: 30.2672, lng: -97.7431,  radiusKm: 25 },
  { name: "NASHVILLE",     lat: 36.1627, lng: -86.7816,  radiusKm: 25 },
  { name: "PORTLAND",      lat: 45.5051, lng: -122.6750, radiusKm: 25 },
  { name: "DALLAS",        lat: 32.7767, lng: -96.7970,  radiusKm: 35 },
  { name: "MINNEAPOLIS",   lat: 44.9778, lng: -93.2650,  radiusKm: 25 },
  { name: "DETROIT",       lat: 42.3314, lng: -83.0458,  radiusKm: 25 },
  { name: "CHARLOTTE",     lat: 35.2271, lng: -80.8431,  radiusKm: 25 },
  { name: "BALTIMORE",     lat: 39.2904, lng: -76.6122,  radiusKm: 25 },
  { name: "CINCINNATI",    lat: 39.1031, lng: -84.5120,  radiusKm: 25 },
  { name: "CLEVELAND",     lat: 41.4993, lng: -81.6944,  radiusKm: 25 },
  { name: "COLUMBUS",      lat: 39.9612, lng: -82.9988,  radiusKm: 25 },
  { name: "HONOLULU",      lat: 21.3069, lng: -157.8583, radiusKm: 25 },
  { name: "INDIANAPOLIS",  lat: 39.7684, lng: -86.1581,  radiusKm: 25 },
  { name: "JACKSONVILLE",  lat: 30.3322, lng: -81.6557,  radiusKm: 25 },
  { name: "KANSAS CITY",   lat: 39.0997, lng: -94.5786,  radiusKm: 25 },
  { name: "LAS VEGAS",     lat: 36.1699, lng: -115.1398, radiusKm: 25 },
  { name: "MEMPHIS",       lat: 35.1495, lng: -90.0490,  radiusKm: 25 },
  { name: "MILWAUKEE",     lat: 43.0389, lng: -87.9065,  radiusKm: 25 },
  { name: "NEW ORLEANS",   lat: 29.9511, lng: -90.0715,  radiusKm: 25 },
  { name: "NORFOLK",       lat: 36.8508, lng: -76.2859,  radiusKm: 25 },
  { name: "OKLAHOMA CITY", lat: 35.4676, lng: -97.5164,  radiusKm: 25 },
  { name: "ORLANDO",       lat: 28.5384, lng: -81.3789,  radiusKm: 25 },
  { name: "PITTSBURGH",    lat: 40.4406, lng: -79.9959,  radiusKm: 25 },
  { name: "RALEIGH",       lat: 35.7796, lng: -78.6382,  radiusKm: 25 },
  { name: "RICHMOND",      lat: 37.5407, lng: -77.4360,  radiusKm: 25 },
  { name: "SACRAMENTO",    lat: 38.5816, lng: -121.4944, radiusKm: 25 },
  { name: "SALT LAKE CITY",lat: 40.7608, lng: -111.8910, radiusKm: 25 },
  { name: "SAN ANTONIO",   lat: 29.4241, lng: -98.4936,  radiusKm: 25 },
  { name: "SAN DIEGO",     lat: 32.7157, lng: -117.1611, radiusKm: 25 },
  { name: "ST. LOUIS",     lat: 38.6270, lng: -90.1994,  radiusKm: 25 },
  { name: "TAMPA",         lat: 27.9506, lng: -82.4572,  radiusKm: 25 },
  { name: "TUCSON",        lat: 32.2226, lng: -110.9747, radiusKm: 25 },
  { name: "WASHINGTON DC", lat: 38.9072, lng: -77.0369,  radiusKm: 30 },
];

function getMetroName(lat: number, lng: number): string | null {
  for (const metro of METRO_AREAS) {
    if (haversineKm(lat, lng, metro.lat, metro.lng) <= metro.radiusKm) {
      return metro.name;
    }
  }
  return null;
}

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

    const radius = parseInt(searchParams.get("radius") ?? "20000", 10);
    const sort = (searchParams.get("sort") ?? "hot") as SortMode;
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);
    const mode = searchParams.get("mode") ?? "auto"; // "auto" | "radius" | "territory" | "everywhere"
    const territoryParam = searchParams.get("territory"); // explicit territory ID

    if (!["hot", "new", "top"].includes(sort)) {
      return NextResponse.json({ error: "sort must be hot, new, or top", code: "INVALID_PARAMS" }, { status: 400 });
    }

    // EVERYWHERE mode: return all active posts, no geo filter
    if (mode === "everywhere") {
      const nowTs = Math.floor(Date.now() / 1000);
      const conditions = and(gt(posts.expires_at, nowTs), eq(posts.status, "active"));
      const HOT_GRAVITY = 1.2;
      let results;
      if (sort === "new") {
        results = await db.select().from(posts).where(conditions).orderBy(desc(posts.created_at)).limit(limit).offset(offset);
      } else if (sort === "top") {
        // TOP: most interacted-with posts (total engagement = upvotes + downvotes)
        results = await db.select().from(posts).where(conditions).orderBy(desc(sql<number>`CAST(${posts.upvotes} AS INTEGER) + CAST(${posts.downvotes} AS INTEGER)`)).limit(limit).offset(offset);
      } else {
        // HOT: engagement-aware ranking (Wilson + engagement boost + controversy)
        const z2 = 1.96 * 1.96;
        results = await db.select().from(posts).where(conditions)
          .orderBy(desc(sql<number>`
            CASE
              WHEN (CAST(${posts.upvotes} AS REAL) + CAST(${posts.downvotes} AS REAL)) = 0 THEN
                CAST(${posts.score} + 1 AS REAL) /
                EXP(${HOT_GRAVITY} * LOG((CAST(unixepoch() - ${posts.created_at} AS REAL) / 3600.0) + 2.0))
              ELSE
                (
                  (
                    (CAST(${posts.upvotes} AS REAL) / (CAST(${posts.upvotes} AS REAL) + CAST(${posts.downvotes} AS REAL)))
                    + ${z2} / (2.0 * (CAST(${posts.upvotes} AS REAL) + CAST(${posts.downvotes} AS REAL)))
                    - 1.96 * SQRT(
                        (
                          (CAST(${posts.upvotes} AS REAL) / (CAST(${posts.upvotes} AS REAL) + CAST(${posts.downvotes} AS REAL)))
                          * (1.0 - (CAST(${posts.upvotes} AS REAL) / (CAST(${posts.upvotes} AS REAL) + CAST(${posts.downvotes} AS REAL))))
                          + ${z2} / (4.0 * (CAST(${posts.upvotes} AS REAL) + CAST(${posts.downvotes} AS REAL)))
                        ) / (CAST(${posts.upvotes} AS REAL) + CAST(${posts.downvotes} AS REAL))
                      )
                  ) / (1.0 + ${z2} / (CAST(${posts.upvotes} AS REAL) + CAST(${posts.downvotes} AS REAL)))
                  + 0.3 * LOG(1.0 + CAST(${posts.upvotes} AS REAL) + CAST(${posts.downvotes} AS REAL))
                  + 0.2 * (
                      CAST(MIN(${posts.upvotes}, ${posts.downvotes}) AS REAL) /
                      CAST(MAX(${posts.upvotes}, ${posts.downvotes}) AS REAL)
                    )
                ) /
                EXP(${HOT_GRAVITY} * LOG((CAST(unixepoch() - ${posts.created_at} AS REAL) / 3600.0) + 2.0))
            END
          `))
          .limit(limit).offset(offset);
      }
      const resultsWithMetro = results.map((p) => sanitizePostForResponse({ ...p, metro: getMetroName(p.lat, p.lng) }));
      return NextResponse.json({ posts: resultsWithMetro, meta: { limit, offset, count: results.length, mode: "everywhere" } });
    }

    // Territory-based feed: explicit territory ID or auto-detect from lat/lng
    let territoryHexes: string[] | undefined;
    let resolvedTerritoryId: string | undefined;

    if (mode !== "radius") {
      if (territoryParam) {
        // Explicit territory ID provided
        const [territory] = await db.select().from(territories).where(eq(territories.id, territoryParam)).limit(1);
        if (territory?.h3_indexes?.length) {
          territoryHexes = territory.h3_indexes;
          resolvedTerritoryId = territory.id;
        }
      } else if (mode === "auto" || mode === "territory") {
        // Auto-detect: find which territory contains the user's H3 hex
        const userH3 = latLngToH3(lat, lng);
        const allTerritories = await db.select({ id: territories.id, h3_indexes: territories.h3_indexes }).from(territories);
        for (const territory of allTerritories) {
          if (territory.h3_indexes?.includes(userH3)) {
            territoryHexes = territory.h3_indexes;
            resolvedTerritoryId = territory.id;
            break;
          }
        }
      }
    }

    const results = await buildFeedQuery({
      lat,
      lng,
      radiusMeters: radius,
      sort,
      limit,
      offset,
      hexes: territoryHexes,
    });

    const resultsWithMetro = results.map((p) => sanitizePostForResponse({ ...p, metro: getMetroName(p.lat, p.lng) }));
    return NextResponse.json({
      posts: resultsWithMetro,
      meta: {
        limit,
        offset,
        count: results.length,
        mode: territoryHexes ? "territory" : "radius",
        territoryId: resolvedTerritoryId,
      },
    });
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

    // Optional: link post to email account if logged in (cookie OR Bearer token)
    let accountId: string | null = null;
    {
      const { getOptionalAccountId } = await import("@jawwing/api/optionalAuth");
      accountId = await getOptionalAccountId(req);
    }

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

    // ── Video metadata extraction ──────────────────────────────────────────────
    const videoMeta = extractVideoMeta(content);

    // ── Fuzz coordinates for privacy (~1 mile radius) ──────────────────────
    // Round to 2 decimal places (~1.1km grid) then add random noise ±0.005 (~500m)
    // This prevents exact location from being stored or returned.
    // h3_index is computed from real coords above so territory lookup stays accurate.
    const fuzzedLat = Math.round(lat * 100) / 100 + (Math.random() - 0.5) * 0.01;
    const fuzzedLng = Math.round(lng * 100) / 100 + (Math.random() - 0.5) * 0.01;

    const [created] = await db.insert(posts).values({
      id,
      user_id: anonymousId,
      account_id: accountId,
      ip_hash: ipHash,
      content,
      lat: fuzzedLat,
      lng: fuzzedLng,
      h3_index,
      score: 0,
      reply_count: 0,
      created_at: nowTs,
      expires_at,
      status: needsVideoReview ? "moderated" : "active",
      video_url: videoMeta?.video_url ?? null,
      video_thumbnail: videoMeta?.video_thumbnail ?? null,
    }).returning();

    lastPositionMap.set(ipHash, { lat, lng, ts: nowTs });

    // Run moderation async AFTER response is sent (Vercel-compatible)
    after(() => {
      onPostCreated(created);
    });

    const response = NextResponse.json({ post: sanitizePostForResponse(created) }, { status: 201 });

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
