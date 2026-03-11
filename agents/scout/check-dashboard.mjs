#!/usr/bin/env node
/**
 * Scout dashboard check — pulls admin stats
 */

const ADMIN_KEY = "***REDACTED_ADMIN_KEY***";
const BASE = "https://www.jawwing.com";

async function check() {
  // Dashboard stats
  const dashRes = await fetch(`${BASE}/api/v1/admin/dashboard`, {
    headers: { "x-admin-key": ADMIN_KEY },
  });
  const dash = await dashRes.json();
  
  console.log("═══ JAWWING DASHBOARD ═══");
  if (dash.stats) {
    const s = dash.stats;
    console.log(`Accounts:     ${s.total_accounts} total, ${s.accounts_today} today, ${s.accounts_active_24h} active 24h`);
    console.log(`Posts:        ${s.total_posts} active, ${s.pending_posts ?? '?'} pending, ${s.posts_today} today`);
    console.log(`Engagement:   ${s.replies_today} replies today, ${s.votes_today} votes today`);
  } else {
    console.log("Dashboard error:", dash.error);
  }
  
  if (dash.trending_posts?.length > 0) {
    console.log("\n── TRENDING POSTS ──");
    for (const p of dash.trending_posts.slice(0, 5)) {
      console.log(`  [${p.score >= 0 ? '+' : ''}${p.score}] ${p.content?.slice(0, 70)}...`);
    }
  }
  
  // Feed counts per metro
  console.log("\n── METRO ACTIVITY ──");
  const feedRes = await fetch(`${BASE}/api/v1/posts?lat=38.9&lng=-77.0&mode=everywhere&limit=500&sort=new`, {
    headers: { "x-admin-key": ADMIN_KEY },
  });
  const feed = await feedRes.json();
  const metros = {};
  for (const p of feed.posts || []) {
    const m = p.metro || "Unknown";
    metros[m] = (metros[m] || 0) + 1;
  }
  const sorted = Object.entries(metros).sort((a, b) => b[1] - a[1]);
  for (const [metro, count] of sorted) {
    console.log(`  ${metro}: ${count} posts`);
  }
  console.log(`\n  Total in feed: ${feed.posts?.length || 0}`);
}

check().catch(console.error);
