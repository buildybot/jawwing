#!/usr/bin/env node
/**
 * Fetches top Jawwing posts and formats them for X/Twitter posting.
 * Outputs tweet text for each top post. Actual posting done via browser automation.
 * 
 * Usage: node post-to-x.mjs [--hours=24] [--limit=3]
 */

const ADMIN_KEY = "***REDACTED_ADMIN_KEY***";
const BASE = "https://www.jawwing.com";

// Metro display names for tweets
const METRO_NAMES = {
  "DC METRO": "DC",
  "NEW YORK": "NYC", 
  "BOSTON": "Boston",
  "CHICAGO": "Chicago",
  "LOS ANGELES": "LA",
  "AUSTIN": "Austin",
  "NASHVILLE": "Nashville",
  "MIAMI": "Miami",
  "ATLANTA": "Atlanta",
  "DENVER": "Denver",
  "SEATTLE": "Seattle",
  "SAN FRANCISCO": "SF",
};

async function getTopPosts(hours = 24, limit = 5) {
  const res = await fetch(
    `${BASE}/api/v1/admin/top-posts?hours=${hours}&limit=${limit}`,
    { headers: { "x-admin-key": ADMIN_KEY } }
  );
  if (!res.ok) {
    console.error("Failed to fetch top posts:", await res.text());
    process.exit(1);
  }
  return (await res.json()).posts;
}

function formatTweet(post) {
  // Truncate content for tweet (leave room for link + attribution)
  const maxContent = 200;
  let content = post.content;
  if (content.length > maxContent) {
    content = content.slice(0, maxContent - 3) + "...";
  }

  // Build tweet
  const stats = [];
  if (post.score > 0) stats.push(`+${post.score}`);
  if (post.reply_count > 0) stats.push(`${post.reply_count} replies`);
  
  const statsStr = stats.length > 0 ? ` [${stats.join(", ")}]` : "";
  const source = post.is_real_user ? "" : " (seeded)";
  
  return {
    text: `"${content}"${statsStr}\n\njawwing.com/post/${post.id}`,
    postId: post.id,
    score: post.score,
    isRealUser: post.is_real_user,
    url: post.url,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const hours = parseInt(args.find(a => a.startsWith("--hours="))?.split("=")[1] ?? "24");
  const limit = parseInt(args.find(a => a.startsWith("--limit="))?.split("=")[1] ?? "5");

  console.log(`Fetching top ${limit} posts from last ${hours}h...`);
  const posts = await getTopPosts(hours, limit);
  
  if (posts.length === 0) {
    console.log("No posts found.");
    return;
  }

  console.log(`\nFound ${posts.length} posts:\n`);
  
  const tweets = posts.map(formatTweet);
  for (const tweet of tweets) {
    console.log("─".repeat(60));
    console.log(`Score: ${tweet.score} | Real user: ${tweet.isRealUser}`);
    console.log(`Tweet:\n${tweet.text}`);
    console.log(`URL: ${tweet.url}`);
  }

  // Output best tweet (highest score, prefer real users)
  const best = tweets.sort((a, b) => {
    if (a.isRealUser !== b.isRealUser) return b.isRealUser ? 1 : -1;
    return b.score - a.score;
  })[0];

  console.log("\n" + "═".repeat(60));
  console.log("RECOMMENDED TWEET:");
  console.log(best.text);
}

main();
