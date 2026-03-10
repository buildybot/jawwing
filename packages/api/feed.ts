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
const HOT_GRAVITY = 1.2; // softer decay to give engagement more room

/**
 * Wilson Score Lower Bound (95% confidence interval).
 * Measures statistical confidence that a post is positively received.
 * Returns 0 for posts with no votes.
 */
export function wilsonScore(ups: number, total: number): number {
  if (total === 0) return 0;
  const z = 1.96; // 95% confidence
  const p = ups / total;
  return (
    (p + (z * z) / (2 * total) - z * Math.sqrt((p * (1 - p) + (z * z) / (4 * total)) / total)) /
    (1 + (z * z) / total)
  );
}

/**
 * Engagement-aware hot score.
 *
 * engagement = upvotes + downvotes  (total interactions)
 * controversy = min(up, down) / max(up, down)  (0..1, higher = more split)
 * wilson = wilson lower bound (quality signal)
 *
 * hotScore = (wilson + 0.3 * log(1 + engagement) + 0.2 * controversy) / (age_hours + 2)^1.2
 *
 * A post with 1000 up + 999 down gets:
 *   - wilson ~= 0.499 (just under 0.5)
 *   - engagement = 1999, log(2000) ~= 7.6, * 0.3 = 2.28
 *   - controversy ~= 0.999, * 0.2 = 0.2
 *   Total numerator ~= 2.98 — way above a post with 1 up and nothing else.
 */
export function hotScore(
  upvotes: number,
  downvotes: number,
  createdAt: number,
  score?: number
): number {
  const ups = upvotes;
  const downs = downvotes;
  // Fallback: if upvotes/downvotes not available, use legacy score-based calc
  if (ups === 0 && downs === 0 && score != null) {
    const ageHours = (Date.now() / 1000 - createdAt) / SECONDS_PER_HOUR;
    return (score + 1) / Math.pow(ageHours + 2, HOT_GRAVITY);
  }

  const total = ups + downs;
  const engagement = total;
  const controversy = total === 0 ? 0 : Math.min(ups, downs) / Math.max(ups, downs);
  const wilson = wilsonScore(ups, total);
  const ageHours = (Date.now() / 1000 - createdAt) / SECONDS_PER_HOUR;

  const numerator = wilson + 0.3 * Math.log(1 + engagement) + 0.2 * controversy;
  return numerator / Math.pow(ageHours + 2, HOT_GRAVITY);
}

/**
 * SQL expression for engagement-aware hot score (DB-side ordering).
 *
 * SQLite notes:
 *   - No POW() — use EXP(gravity * LOG(x))
 *   - NULLIF to avoid division by zero
 *   - Wilson score computed inline
 *
 * Wilson lower bound (inline SQL):
 *   z = 1.96, p = upvotes / total, total = upvotes + downvotes
 *   = (p + z^2/(2n) - z*sqrt((p*(1-p) + z^2/(4n))/n)) / (1 + z^2/n)
 */
function hotScoreSql() {
  const z2 = 1.96 * 1.96; // 3.8416
  return sql<number>`
    (
      CASE
        WHEN (CAST(${posts.upvotes} AS REAL) + CAST(${posts.downvotes} AS REAL)) = 0 THEN
          -- No votes: fall back to legacy score-based hot
          CAST(${posts.score} + 1 AS REAL) /
          EXP(${HOT_GRAVITY} * LOG((CAST(unixepoch() - ${posts.created_at} AS REAL) / 3600.0) + 2.0))
        ELSE
          (
            -- Wilson lower bound
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
            -- Engagement boost: 0.3 * log(1 + total_votes)
            + 0.3 * LOG(1.0 + CAST(${posts.upvotes} AS REAL) + CAST(${posts.downvotes} AS REAL))
            -- Controversy boost: 0.2 * min/max ratio
            + 0.2 * (
                CAST(MIN(${posts.upvotes}, ${posts.downvotes}) AS REAL) /
                CAST(MAX(${posts.upvotes}, ${posts.downvotes}) AS REAL)
              )
          ) /
          EXP(${HOT_GRAVITY} * LOG((CAST(unixepoch() - ${posts.created_at} AS REAL) / 3600.0) + 2.0))
      END
    )
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
    // TOP: sort by total engagement (upvotes + downvotes), most interacted-with first
    return db
      .select()
      .from(posts)
      .where(conditions)
      .orderBy(desc(sql<number>`CAST(${posts.upvotes} AS INTEGER) + CAST(${posts.downvotes} AS INTEGER)`))
      .limit(limit)
      .offset(offset);
  }

  // hot (default): engagement-aware ranking
  return db
    .select()
    .from(posts)
    .where(conditions)
    .orderBy(desc(hotScoreSql()))
    .limit(limit)
    .offset(offset);
}
