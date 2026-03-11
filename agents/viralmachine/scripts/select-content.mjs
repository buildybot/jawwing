#!/usr/bin/env node
/**
 * Content Selector — picks the best Jawwing posts for video content
 * Reads strategy.json to weight selection toward what performs
 */
import { createClient } from "@libsql/client";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Load strategy weights
function loadStrategy() {
  const path = join(DATA_DIR, "strategy.json");
  if (existsSync(path)) return JSON.parse(readFileSync(path, "utf-8"));
  return {
    format_weights: { confession: 1.0, hot_takes: 1.0, rate_this: 1.0, feed_scroll: 1.0, city_vs_city: 1.0 },
    theme_weights: { hot_take: 1.2, confession: 1.0, local_drama: 1.0, relatable: 0.8, controversy: 1.5 },
    hook_weights: { someone_near_you: 1.0, most_unhinged: 1.2, would_you_post: 0.9, rate_this: 1.1 },
    best_times: ["10:00", "13:00", "19:00", "22:00"],
    top_cities: ["dc", "nyc", "la", "chicago", "austin"],
    updated_at: null,
  };
}

// Load already-used post IDs to avoid repeats
function loadUsedPosts() {
  const path = join(DATA_DIR, "performance.jsonl");
  if (!existsSync(path)) return new Set();
  const used = new Set();
  for (const line of readFileSync(path, "utf-8").split("\n").filter(Boolean)) {
    try {
      const entry = JSON.parse(line);
      entry.post_ids?.forEach((id) => used.add(id));
    } catch {}
  }
  return used;
}

// Score a post for viral potential
function viralScore(post, strategy) {
  let score = 0;

  // Brevity bonus — shorter posts work better in video
  const words = post.content.split(/\s+/).length;
  if (words <= 15) score += 3;
  else if (words <= 30) score += 2;
  else if (words <= 50) score += 1;

  // Engagement signal
  score += (post.upvotes + post.downvotes) * 2;
  score += post.reply_count * 3;

  // Controversy bonus (lots of both up and down)
  if (post.upvotes > 0 && post.downvotes > 0) {
    const ratio = Math.min(post.upvotes, post.downvotes) / Math.max(post.upvotes, post.downvotes);
    score += ratio * 5;
  }

  // Content signals
  const content = post.content.toLowerCase();
  if (content.includes("?")) score += 1; // Questions drive comments
  if (content.match(/!{2,}/)) score += 1; // Excitement
  if (content.length < 100) score += 1; // Fits on screen easily
  if (content.match(/^(unpopular opinion|hot take|am i wrong|rate this|confession)/i)) score += 3;
  if (content.match(/(worst|best|most|overrated|underrated|honestly|literally|genuinely)/i)) score += 1;

  // Penalty for generic/boring
  if (content.match(/^(good morning|happy|nice day|hello)/i)) score -= 3;

  return Math.max(score, 0);
}

// Classify post theme
function classifyTheme(content) {
  const lower = content.toLowerCase();
  if (lower.match(/(confession|admit|guilty|nobody knows|secret)/i)) return "confession";
  if (lower.match(/(worst|best|overrated|underrated|unpopular|hot take|fight me)/i)) return "hot_take";
  if (lower.match(/(drama|beef|caught|exposed|cheating)/i)) return "local_drama";
  if (lower.match(/(anyone else|is it just me|does anyone|literally everyone|we all)/i)) return "relatable";
  if (lower.match(/(\?|agree|disagree|thoughts|opinions|debate)/i)) return "controversy";
  return "hot_take"; // default
}

// Detect metro from lat/lng
function detectMetro(lat, lng) {
  const metros = [
    { name: "dc", lat: 38.9072, lng: -77.0369, r: 0.5 },
    { name: "nyc", lat: 40.7128, lng: -74.006, r: 0.5 },
    { name: "la", lat: 34.0522, lng: -118.2437, r: 0.5 },
    { name: "chicago", lat: 41.8781, lng: -87.6298, r: 0.5 },
    { name: "austin", lat: 30.2672, lng: -97.7431, r: 0.3 },
    { name: "miami", lat: 25.7617, lng: -80.1918, r: 0.3 },
    { name: "seattle", lat: 47.6062, lng: -122.3321, r: 0.3 },
    { name: "denver", lat: 39.7392, lng: -104.9903, r: 0.3 },
    { name: "atlanta", lat: 33.749, lng: -84.388, r: 0.3 },
    { name: "boston", lat: 42.3601, lng: -71.0589, r: 0.3 },
    { name: "sf", lat: 37.7749, lng: -122.4194, r: 0.3 },
    { name: "philly", lat: 39.9526, lng: -75.1652, r: 0.3 },
  ];
  for (const m of metros) {
    if (Math.abs(lat - m.lat) < m.r && Math.abs(lng - m.lng) < m.r) return m.name;
  }
  return "unknown";
}

// Pick format based on content and strategy weights
function pickFormat(posts, strategy) {
  const formats = Object.entries(strategy.format_weights);
  const totalWeight = formats.reduce((s, [, w]) => s + w, 0);
  let rand = Math.random() * totalWeight;
  for (const [format, weight] of formats) {
    rand -= weight;
    if (rand <= 0) return format;
  }
  return "confession";
}

// Pick hook style
function pickHook(format, strategy) {
  const hooks = {
    confession: ["someone_near_you", "would_you_post"],
    hot_takes: ["most_unhinged", "rate_this"],
    rate_this: ["rate_this", "would_you_post"],
    feed_scroll: ["someone_near_you", "most_unhinged"],
    city_vs_city: ["most_unhinged"],
  };
  const options = hooks[format] || ["someone_near_you"];
  // Weight by strategy
  let best = options[0], bestWeight = 0;
  for (const h of options) {
    const w = (strategy.hook_weights[h] || 1.0) + Math.random() * 0.5;
    if (w > bestWeight) { best = h; bestWeight = w; }
  }
  return best;
}

async function main() {
  const strategy = loadStrategy();
  const usedPosts = loadUsedPosts();
  const count = parseInt(process.argv[2] || "3", 10);

  // Fetch recent high-quality posts
  const results = await db.execute({
    sql: `SELECT id, content, lat, lng, score, upvotes, downvotes, reply_count, created_at
          FROM posts
          WHERE status = 'active'
            AND length(content) > 20
            AND length(content) < 280
          ORDER BY created_at DESC
          LIMIT 200`,
    args: [],
  });

  // Score and filter
  const scored = results.rows
    .filter((p) => !usedPosts.has(p.id))
    .map((p) => ({
      ...p,
      viral_score: viralScore(p, strategy),
      theme: classifyTheme(p.content),
      metro: detectMetro(Number(p.lat), Number(p.lng)),
    }))
    .sort((a, b) => b.viral_score - a.viral_score);

  // Generate content briefs
  const briefs = [];
  const usedInBatch = new Set();

  for (let i = 0; i < count; i++) {
    const format = pickFormat(scored, strategy);
    const hook = pickHook(format, strategy);

    // Select posts for this video
    let selectedPosts;
    if (format === "confession" || format === "rate_this") {
      // Single post formats
      const post = scored.find((p) => !usedInBatch.has(p.id));
      if (!post) continue;
      selectedPosts = [post];
      usedInBatch.add(post.id);
    } else if (format === "city_vs_city") {
      // Need posts from 2 different cities
      const cities = [...new Set(scored.map((p) => p.metro))].filter((c) => c !== "unknown");
      if (cities.length < 2) continue;
      const [city1, city2] = cities.sort(() => Math.random() - 0.5).slice(0, 2);
      const p1 = scored.find((p) => p.metro === city1 && !usedInBatch.has(p.id));
      const p2 = scored.find((p) => p.metro === city2 && !usedInBatch.has(p.id));
      if (!p1 || !p2) continue;
      selectedPosts = [p1, p2];
      usedInBatch.add(p1.id);
      usedInBatch.add(p2.id);
    } else {
      // Multi-post formats (hot_takes, feed_scroll)
      selectedPosts = scored
        .filter((p) => !usedInBatch.has(p.id))
        .slice(0, 5 + Math.floor(Math.random() * 3));
      selectedPosts.forEach((p) => usedInBatch.add(p.id));
    }

    if (selectedPosts.length === 0) continue;

    briefs.push({
      format,
      hook,
      theme: selectedPosts[0].theme,
      city: selectedPosts[0].metro,
      posts: selectedPosts.map((p) => ({
        id: p.id,
        content: p.content,
        metro: p.metro,
        score: p.viral_score,
      })),
    });
  }

  // Output briefs
  const output = JSON.stringify(briefs, null, 2);
  const outPath = join(DATA_DIR, "next-batch.json");
  writeFileSync(outPath, output);
  console.log(`Generated ${briefs.length} content briefs → ${outPath}`);
  console.log(output);
}

main().catch(console.error);
