export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { isAdmin } from "@jawwing/api/admin";

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

interface MetroArea {
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
}

const METRO_AREAS: MetroArea[] = [
  { name: "DC METRO",       lat: 38.9072, lng: -77.0369,  radiusKm: 30 },
  { name: "NEW YORK",       lat: 40.7128, lng: -74.0060,  radiusKm: 40 },
  { name: "LOS ANGELES",    lat: 34.0522, lng: -118.2437, radiusKm: 50 },
  { name: "CHICAGO",        lat: 41.8781, lng: -87.6298,  radiusKm: 30 },
  { name: "HOUSTON",        lat: 29.7604, lng: -95.3698,  radiusKm: 40 },
  { name: "PHOENIX",        lat: 33.4484, lng: -112.0740, radiusKm: 30 },
  { name: "PHILADELPHIA",   lat: 39.9526, lng: -75.1652,  radiusKm: 25 },
  { name: "SAN FRANCISCO",  lat: 37.7749, lng: -122.4194, radiusKm: 30 },
  { name: "ATLANTA",        lat: 33.7490, lng: -84.3880,  radiusKm: 30 },
  { name: "BOSTON",         lat: 42.3601, lng: -71.0589,  radiusKm: 25 },
  { name: "MIAMI",          lat: 25.7617, lng: -80.1918,  radiusKm: 30 },
  { name: "SEATTLE",        lat: 47.6062, lng: -122.3321, radiusKm: 30 },
  { name: "DENVER",         lat: 39.7392, lng: -104.9903, radiusKm: 30 },
  { name: "AUSTIN",         lat: 30.2672, lng: -97.7431,  radiusKm: 25 },
  { name: "NASHVILLE",      lat: 36.1627, lng: -86.7816,  radiusKm: 25 },
  { name: "PORTLAND",       lat: 45.5051, lng: -122.6750, radiusKm: 25 },
  { name: "DALLAS",         lat: 32.7767, lng: -96.7970,  radiusKm: 35 },
  { name: "MINNEAPOLIS",    lat: 44.9778, lng: -93.2650,  radiusKm: 25 },
  { name: "DETROIT",        lat: 42.3314, lng: -83.0458,  radiusKm: 25 },
  { name: "CHARLOTTE",      lat: 35.2271, lng: -80.8431,  radiusKm: 25 },
  { name: "BALTIMORE",      lat: 39.2904, lng: -76.6122,  radiusKm: 25 },
  { name: "CINCINNATI",     lat: 39.1031, lng: -84.5120,  radiusKm: 25 },
  { name: "CLEVELAND",      lat: 41.4993, lng: -81.6944,  radiusKm: 25 },
  { name: "COLUMBUS",       lat: 39.9612, lng: -82.9988,  radiusKm: 25 },
  { name: "LAS VEGAS",      lat: 36.1699, lng: -115.1398, radiusKm: 25 },
  { name: "ORLANDO",        lat: 28.5384, lng: -81.3789,  radiusKm: 25 },
  { name: "SAN DIEGO",      lat: 32.7157, lng: -117.1611, radiusKm: 25 },
  { name: "TAMPA",          lat: 27.9506, lng: -82.4572,  radiusKm: 25 },
  { name: "RALEIGH",        lat: 35.7796, lng: -78.6382,  radiusKm: 25 },
  { name: "ST. LOUIS",      lat: 38.6270, lng: -90.1994,  radiusKm: 25 },
];

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getMetroName(lat: number, lng: number): string | null {
  for (const metro of METRO_AREAS) {
    if (haversineKm(lat, lng, metro.lat, metro.lng) <= metro.radiusKm) return metro.name;
  }
  return null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const c = getClient();

    // Fetch all posts (lat/lng, image_url, video_url, content) for metro grouping + content mix
    const [postsRaw, votesRaw, repliesRaw, growthPostsRaw, growthVotesRaw, uniqueRaw, modRaw] = await Promise.all([
      c.execute(`SELECT lat, lng, image_url, video_url, content FROM posts WHERE status != 'removed'`),
      c.execute(`SELECT COUNT(*) as total_votes, AVG(1) as dummy FROM votes`),
      c.execute(`SELECT COUNT(*) as total_replies FROM posts WHERE parent_id IS NOT NULL`),
      c.execute(`
        SELECT date(created_at, 'unixepoch') as day, COUNT(*) as count
        FROM posts
        WHERE created_at >= strftime('%s', 'now', '-7 days')
        GROUP BY day
        ORDER BY day ASC
      `),
      c.execute(`
        SELECT date(created_at, 'unixepoch') as day, COUNT(*) as count
        FROM votes
        WHERE created_at >= strftime('%s', 'now', '-7 days')
        GROUP BY day
        ORDER BY day ASC
      `),
      c.execute(`
        SELECT
          COUNT(DISTINCT ip_hash) as unique_posters,
          (SELECT COUNT(DISTINCT voter_hash) FROM votes) as unique_voters
        FROM posts
      `),
      c.execute(`
        SELECT
          COUNT(*) as total_actions,
          SUM(CASE WHEN action = 'approve' THEN 1 ELSE 0 END) as approvals,
          AVG(confidence) as avg_confidence,
          SUM(CASE WHEN action = 'remove' THEN 1 ELSE 0 END) as removed_count
        FROM mod_log
      `),
    ]);

    // Metro grouping (in-memory)
    const metroCounts: Record<string, number> = {};
    let withImages = 0, withLinks = 0, withVideos = 0, textOnly = 0;
    const urlRegex = /https?:\/\/[^\s)>\]"]+/i;

    for (const row of postsRaw.rows) {
      const lat = Number(row.lat), lng = Number(row.lng);
      const metro = getMetroName(lat, lng) ?? "OTHER";
      metroCounts[metro] = (metroCounts[metro] ?? 0) + 1;

      const hasImage = !!row.image_url;
      const hasVideo = !!row.video_url;
      const hasLink = !hasImage && !hasVideo && urlRegex.test(String(row.content ?? ""));
      if (hasImage) withImages++;
      else if (hasVideo) withVideos++;
      else if (hasLink) withLinks++;
      else textOnly++;
    }

    const postsByMetro = Object.entries(metroCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([metro, count]) => ({ metro, count }));

    // Engagement
    const totalPosts = postsRaw.rows.length;
    const totalVotes = Number(votesRaw.rows[0]?.total_votes ?? 0);
    const totalReplies = Number(repliesRaw.rows[0]?.total_replies ?? 0);
    const avgVotesPerPost = totalPosts > 0 ? +(totalVotes / totalPosts).toFixed(2) : 0;
    const avgRepliesPerPost = totalPosts > 0 ? +(totalReplies / totalPosts).toFixed(2) : 0;

    // Unique users
    const uniquePosters = Number(uniqueRaw.rows[0]?.unique_posters ?? 0);
    const uniqueVoters = Number(uniqueRaw.rows[0]?.unique_voters ?? 0);

    // Mod stats
    const totalModActions = Number(modRaw.rows[0]?.total_actions ?? 0);
    const approvals = Number(modRaw.rows[0]?.approvals ?? 0);
    const approvalRate = totalModActions > 0 ? +((approvals / totalModActions) * 100).toFixed(1) : 0;
    const avgConfidence = +(Number(modRaw.rows[0]?.avg_confidence ?? 0) * 100).toFixed(1);
    const removedCount = Number(modRaw.rows[0]?.removed_count ?? 0);

    return NextResponse.json({
      posts_by_metro: postsByMetro,
      content_mix: { images: withImages, links: withLinks, videos: withVideos, text_only: textOnly },
      engagement: { total_votes: totalVotes, total_replies: totalReplies, total_posts: totalPosts, avg_votes_per_post: avgVotesPerPost, avg_replies_per_post: avgRepliesPerPost },
      growth: {
        posts_per_day: growthPostsRaw.rows.map(r => ({ day: String(r.day), count: Number(r.count) })),
        votes_per_day: growthVotesRaw.rows.map(r => ({ day: String(r.day), count: Number(r.count) })),
      },
      unique_users: { unique_posters: uniquePosters, unique_voters: uniqueVoters },
      moderation: { approval_rate: approvalRate, avg_confidence: avgConfidence, removed_count: removedCount },
    });
  } catch (err) {
    console.error("[GET /api/v1/admin/analytics]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
