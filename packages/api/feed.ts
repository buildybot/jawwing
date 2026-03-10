import { db, posts } from "@jawwing/db";
import { inArray, gt, eq, desc, sql, and } from "drizzle-orm";
import { getHexesForRadius } from "./geo";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SortMode = "hot" | "new" | "top";

export interface FeedParams {
  lat: number;
  lng: number;
  radiusMeters?: number;
  sort?: SortMode;
  limit?: number;
  offset?: number;
  /** If provided, use these hexes directly instead of computing from radius */
  hexes?: string[];
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

const SECONDS_PER_HOUR = 3600;
const HOT_GRAVITY = 1.8; // higher = faster decay (like HN)

/**
 * Hot score: time-decayed score similar to Hacker News gravity formula.
 * (score + 1) / (age_in_hours + 2) ^ gravity
 * Returns a float suitable for in-memory ordering.
 */
export function hotScore(score: number, createdAt: number): number {
  const ageHours = (Date.now() / 1000 - createdAt) / SECONDS_PER_HOUR;
  return (score + 1) / Math.pow(ageHours + 2, HOT_GRAVITY);
}

/**
 * SQL expression for hot score (DB-side ordering).
 * SQLite: uses EXP + LOG since POW() is unavailable in older builds.
 */
function hotScoreSql() {
  return sql<number>`
    CAST(${posts.score} + 1 AS REAL) /
    EXP(${HOT_GRAVITY} * LOG((CAST(unixepoch() - ${posts.created_at} AS REAL) / 3600.0) + 2.0))
  `;
}

// ─── Feed Query Builder ───────────────────────────────────────────────────────

/**
 * Build and execute a geo-filtered feed query.
 * If `hexes` is provided, uses those directly (territory-based feed).
 * Otherwise computes hexes from lat/lng + radiusMeters.
 */
export async function buildFeedQuery(params: FeedParams) {
  const {
    lat,
    lng,
    radiusMeters = 5000,
    sort = "hot",
    limit = 20,
    offset = 0,
    hexes: precomputedHexes,
  } = params;

  const hexes = precomputedHexes ?? getHexesForRadius(lat, lng, radiusMeters);
  const nowTs = Math.floor(Date.now() / 1000);

  const conditions = and(
    inArray(posts.h3_index, hexes),
    gt(posts.expires_at, nowTs),
    eq(posts.status, "active")
  );

  if (sort === "new") {
    return db
      .select()
      .from(posts)
      .where(conditions)
      .orderBy(desc(posts.created_at))
      .limit(limit)
      .offset(offset);
  }

  if (sort === "top") {
    return db
      .select()
      .from(posts)
      .where(conditions)
      .orderBy(desc(posts.score))
      .limit(limit)
      .offset(offset);
  }

  // hot (default)
  return db
    .select()
    .from(posts)
    .where(conditions)
    .orderBy(desc(hotScoreSql()))
    .limit(limit)
    .offset(offset);
}
