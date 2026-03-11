#!/usr/bin/env node
/**
 * Performance Tracker — scrapes TikTok video stats and logs to performance.jsonl
 * Run this 2x/day to track how content is performing
 */
import { readFileSync, writeFileSync, appendFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const PERFORMANCE_LOG = join(DATA_DIR, "performance.jsonl");

/**
 * Parse stats from a TikTok video page snapshot
 * This would be called by the posting agent after scraping via browser tool
 */
export function parseStats(statsObj) {
  return {
    views: parseInt(statsObj.views || "0", 10),
    likes: parseInt(statsObj.likes || "0", 10),
    comments: parseInt(statsObj.comments || "0", 10),
    shares: parseInt(statsObj.shares || "0", 10),
    saves: parseInt(statsObj.saves || "0", 10),
    checked_at: new Date().toISOString(),
  };
}

/**
 * Log a newly posted video
 */
export function logPost(entry) {
  const record = {
    id: entry.id,
    platform: entry.platform || "tiktok",
    format: entry.format,
    theme: entry.theme,
    hook: entry.hook,
    city: entry.city,
    post_ids: entry.post_ids,
    posted_at: new Date().toISOString(),
    url: entry.url || null,
    caption: entry.caption || null,
    stats: { views: 0, likes: 0, comments: 0, shares: 0, saves: 0, checked_at: null },
  };
  appendFileSync(PERFORMANCE_LOG, JSON.stringify(record) + "\n");
  console.log(`Logged: ${record.id} (${record.format}, ${record.platform})`);
  return record;
}

/**
 * Update stats for existing entries
 * Called with an array of { id, stats } objects
 */
export function updateStats(updates) {
  if (!existsSync(PERFORMANCE_LOG)) return;

  const lines = readFileSync(PERFORMANCE_LOG, "utf-8").split("\n").filter(Boolean);
  const updatesMap = new Map(updates.map((u) => [u.id, u.stats]));
  let updated = 0;

  const newLines = lines.map((line) => {
    try {
      const entry = JSON.parse(line);
      if (updatesMap.has(entry.id)) {
        entry.stats = { ...entry.stats, ...updatesMap.get(entry.id), checked_at: new Date().toISOString() };
        updated++;
      }
      return JSON.stringify(entry);
    } catch {
      return line;
    }
  });

  writeFileSync(PERFORMANCE_LOG, newLines.join("\n") + "\n");
  console.log(`Updated stats for ${updated}/${updates.length} entries`);
}

/**
 * Get all entries for analysis
 */
export function getAllEntries() {
  if (!existsSync(PERFORMANCE_LOG)) return [];
  return readFileSync(PERFORMANCE_LOG, "utf-8")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      try { return JSON.parse(line); }
      catch { return null; }
    })
    .filter(Boolean);
}

/**
 * Generate a performance summary
 */
export function summarize() {
  const entries = getAllEntries();
  if (entries.length === 0) {
    console.log("No performance data yet.");
    return null;
  }

  const byFormat = {};
  const byTheme = {};
  const byHook = {};
  const byCity = {};
  let totalViews = 0, totalLikes = 0, totalComments = 0, totalShares = 0;

  for (const e of entries) {
    totalViews += e.stats.views;
    totalLikes += e.stats.likes;
    totalComments += e.stats.comments;
    totalShares += e.stats.shares;

    // By format
    if (!byFormat[e.format]) byFormat[e.format] = { count: 0, views: 0, likes: 0, engagement: 0 };
    byFormat[e.format].count++;
    byFormat[e.format].views += e.stats.views;
    byFormat[e.format].likes += e.stats.likes;
    byFormat[e.format].engagement += e.stats.likes + e.stats.comments + e.stats.shares;

    // By theme
    if (!byTheme[e.theme]) byTheme[e.theme] = { count: 0, views: 0, engagement: 0 };
    byTheme[e.theme].count++;
    byTheme[e.theme].views += e.stats.views;
    byTheme[e.theme].engagement += e.stats.likes + e.stats.comments + e.stats.shares;

    // By hook
    if (!byHook[e.hook]) byHook[e.hook] = { count: 0, views: 0, engagement: 0 };
    byHook[e.hook].count++;
    byHook[e.hook].views += e.stats.views;
    byHook[e.hook].engagement += e.stats.likes + e.stats.comments + e.stats.shares;

    // By city
    if (!byCity[e.city]) byCity[e.city] = { count: 0, views: 0, engagement: 0 };
    byCity[e.city].count++;
    byCity[e.city].views += e.stats.views;
    byCity[e.city].engagement += e.stats.likes + e.stats.comments + e.stats.shares;
  }

  const summary = {
    total_videos: entries.length,
    total_views: totalViews,
    total_likes: totalLikes,
    total_comments: totalComments,
    total_shares: totalShares,
    avg_views_per_video: Math.round(totalViews / entries.length),
    engagement_rate: totalViews > 0 ? ((totalLikes + totalComments + totalShares) / totalViews * 100).toFixed(2) + "%" : "0%",
    by_format: byFormat,
    by_theme: byTheme,
    by_hook: byHook,
    by_city: byCity,
  };

  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

// CLI
const cmd = process.argv[2];
if (cmd === "summary") summarize();
else if (cmd === "list") console.log(JSON.stringify(getAllEntries(), null, 2));
else console.log("Usage: track-performance.mjs [summary|list]");
