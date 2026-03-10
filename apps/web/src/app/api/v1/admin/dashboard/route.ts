import { NextRequest, NextResponse } from "next/server";
import { db, posts, votes, replies, accounts, territories } from "@jawwing/db";
import { sql, eq, gte, desc } from "drizzle-orm";
import { isAdmin } from "@jawwing/api/admin";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const now = Math.floor(Date.now() / 1000);
  const todayStart = now - (now % 86400); // midnight UTC
  const last24h = now - 86400;

  try {
    const [
      totalAccounts,
      accountsToday,
      accountsActive24h,
      totalPosts,
      postsToday,
      repliesToday,
      votesToday,
    ] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(accounts),
      db.select({ count: sql<number>`count(*)` }).from(accounts).where(gte(accounts.created_at, todayStart)),
      db.select({ count: sql<number>`count(*)` }).from(accounts).where(gte(accounts.last_seen_at, last24h)),
      db.select({ count: sql<number>`count(*)` }).from(posts).where(eq(posts.status, "active")),
      db.select({ count: sql<number>`count(*)` }).from(posts).where(gte(posts.created_at, todayStart)),
      db.select({ count: sql<number>`count(*)` }).from(replies).where(gte(replies.created_at, todayStart)),
      db.select({ count: sql<number>`count(*)` }).from(votes).where(gte(votes.created_at, todayStart)),
    ]);

    // Top 5 trending territories (most posts last 24h)
    const trendingTerritories = await db.execute(sql`
      SELECT t.id, t.name, COUNT(p.id) as post_count
      FROM territories t
      LEFT JOIN posts p ON p.h3_index IN (
        SELECT DISTINCT h3_index FROM posts 
        WHERE created_at >= ${last24h} AND status = 'active'
      ) AND p.created_at >= ${last24h} AND p.status = 'active'
      GROUP BY t.id, t.name
      ORDER BY post_count DESC
      LIMIT 5
    `);

    // Simpler approach: get top h3_indexes by post count last 24h
    const trendingH3 = await db.execute(sql`
      SELECT h3_index, COUNT(*) as post_count
      FROM posts
      WHERE created_at >= ${last24h} AND status = 'active'
      GROUP BY h3_index
      ORDER BY post_count DESC
      LIMIT 5
    `);

    // Top 5 trending posts (highest score last 24h)
    const trendingPosts = await db
      .select({
        id: posts.id,
        content: sql<string>`substr(${posts.content}, 1, 100)`,
        score: posts.score,
        upvotes: posts.upvotes,
        downvotes: posts.downvotes,
        reply_count: posts.reply_count,
        created_at: posts.created_at,
        status: posts.status,
      })
      .from(posts)
      .where(gte(posts.created_at, last24h))
      .orderBy(desc(posts.score))
      .limit(5);

    return NextResponse.json({
      stats: {
        total_accounts: Number(totalAccounts[0]?.count ?? 0),
        accounts_today: Number(accountsToday[0]?.count ?? 0),
        accounts_active_24h: Number(accountsActive24h[0]?.count ?? 0),
        total_posts: Number(totalPosts[0]?.count ?? 0),
        posts_today: Number(postsToday[0]?.count ?? 0),
        replies_today: Number(repliesToday[0]?.count ?? 0),
        votes_today: Number(votesToday[0]?.count ?? 0),
      },
      trending_h3: trendingH3.rows,
      trending_posts: trendingPosts,
    });
  } catch (err) {
    console.error("[GET /api/v1/admin/dashboard]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
