#!/usr/bin/env node
/**
 * Strategy Optimizer — analyzes performance data and updates strategy weights
 * The feedback loop: what works → do more of it, what doesn't → do less
 */
import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const PERFORMANCE_LOG = join(DATA_DIR, "performance.jsonl");
const STRATEGY_PATH = join(DATA_DIR, "strategy.json");

const DEFAULT_STRATEGY = {
  format_weights: { confession: 1.0, hot_takes: 1.0, rate_this: 1.0, feed_scroll: 1.0, city_vs_city: 1.0 },
  theme_weights: { hot_take: 1.2, confession: 1.0, local_drama: 1.0, relatable: 0.8, controversy: 1.5 },
  hook_weights: { someone_near_you: 1.0, most_unhinged: 1.2, would_you_post: 0.9, rate_this: 1.1 },
  best_times: ["10:00", "13:00", "19:00", "22:00"],
  top_cities: ["dc", "nyc", "la", "chicago", "austin"],
  updated_at: null,
};

function loadEntries() {
  if (!existsSync(PERFORMANCE_LOG)) return [];
  return readFileSync(PERFORMANCE_LOG, "utf-8")
    .split("\n").filter(Boolean)
    .map(l => { try { return JSON.parse(l); } catch { return null; } })
    .filter(Boolean);
}

function loadStrategy() {
  if (existsSync(STRATEGY_PATH)) return JSON.parse(readFileSync(STRATEGY_PATH, "utf-8"));
  return JSON.parse(JSON.stringify(DEFAULT_STRATEGY));
}

/**
 * Calculate engagement score for an entry
 * Weighted: shares > comments > likes > views
 * Shares are 10x more valuable than likes (organic reach)
 */
function engagementScore(e) {
  return (e.stats.shares * 10) + (e.stats.comments * 5) + (e.stats.likes * 1) + (e.stats.views * 0.01);
}

/**
 * Update weights based on performance
 * Simple approach: calculate avg engagement per category,
 * then adjust weights proportionally. Clamp between 0.2 and 3.0.
 */
function optimizeWeights(entries, currentWeights, groupKey) {
  const groups = {};
  for (const e of entries) {
    const key = e[groupKey];
    if (!key) continue;
    if (!groups[key]) groups[key] = { total: 0, count: 0 };
    groups[key].total += engagementScore(e);
    groups[key].count++;
  }

  if (Object.keys(groups).length === 0) return currentWeights;

  // Calculate average engagement per group
  const avgs = {};
  for (const [key, val] of Object.entries(groups)) {
    avgs[key] = val.count > 0 ? val.total / val.count : 0;
  }

  // Find the mean average
  const avgValues = Object.values(avgs);
  const mean = avgValues.length > 0 ? avgValues.reduce((a, b) => a + b, 0) / avgValues.length : 1;
  if (mean === 0) return currentWeights;

  // Adjust weights: above-mean gets boosted, below-mean gets reduced
  const newWeights = { ...currentWeights };
  for (const [key, avg] of Object.entries(avgs)) {
    const ratio = avg / mean;
    // Blend: 70% old weight + 30% new signal (smooth adjustment)
    const oldWeight = currentWeights[key] || 1.0;
    newWeights[key] = Math.max(0.2, Math.min(3.0, oldWeight * 0.7 + ratio * 0.3));
  }

  return newWeights;
}

/**
 * Identify best posting times from performance data
 */
function optimizeTimes(entries) {
  const hourBuckets = {};
  for (const e of entries) {
    if (!e.posted_at) continue;
    const hour = new Date(e.posted_at).getHours();
    if (!hourBuckets[hour]) hourBuckets[hour] = { total: 0, count: 0 };
    hourBuckets[hour].total += engagementScore(e);
    hourBuckets[hour].count++;
  }

  // Sort hours by avg engagement, take top 4
  const ranked = Object.entries(hourBuckets)
    .map(([h, v]) => ({ hour: parseInt(h), avg: v.total / v.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 4)
    .sort((a, b) => a.hour - b.hour);

  if (ranked.length === 0) return DEFAULT_STRATEGY.best_times;
  return ranked.map((r) => `${r.hour.toString().padStart(2, "0")}:00`);
}

/**
 * Identify top-performing cities
 */
function optimizeCities(entries) {
  const cityEngagement = {};
  for (const e of entries) {
    if (!e.city || e.city === "unknown") continue;
    if (!cityEngagement[e.city]) cityEngagement[e.city] = { total: 0, count: 0 };
    cityEngagement[e.city].total += engagementScore(e);
    cityEngagement[e.city].count++;
  }

  return Object.entries(cityEngagement)
    .map(([city, v]) => ({ city, avg: v.total / v.count }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
    .map((c) => c.city);
}

function main() {
  const entries = loadEntries();
  const strategy = loadStrategy();

  console.log(`Analyzing ${entries.length} videos...`);

  if (entries.length < 5) {
    console.log("Not enough data to optimize (need ≥5 videos). Keeping defaults.");
    strategy.updated_at = new Date().toISOString();
    writeFileSync(STRATEGY_PATH, JSON.stringify(strategy, null, 2));
    return;
  }

  // Only optimize on entries with actual stats
  const withStats = entries.filter((e) => e.stats.views > 0 || e.stats.likes > 0);

  if (withStats.length < 3) {
    console.log("Not enough tracked stats to optimize. Post more and check stats.");
    strategy.updated_at = new Date().toISOString();
    writeFileSync(STRATEGY_PATH, JSON.stringify(strategy, null, 2));
    return;
  }

  // Optimize each dimension
  strategy.format_weights = optimizeWeights(withStats, strategy.format_weights, "format");
  strategy.theme_weights = optimizeWeights(withStats, strategy.theme_weights, "theme");
  strategy.hook_weights = optimizeWeights(withStats, strategy.hook_weights, "hook");
  strategy.best_times = optimizeTimes(withStats);
  const topCities = optimizeCities(withStats);
  if (topCities.length > 0) strategy.top_cities = topCities;
  strategy.updated_at = new Date().toISOString();

  writeFileSync(STRATEGY_PATH, JSON.stringify(strategy, null, 2));

  console.log("\nUpdated strategy:");
  console.log(JSON.stringify(strategy, null, 2));

  // Print insights
  console.log("\n─── INSIGHTS ───");
  const bestFormat = Object.entries(strategy.format_weights).sort((a, b) => b[1] - a[1])[0];
  const worstFormat = Object.entries(strategy.format_weights).sort((a, b) => a[1] - b[1])[0];
  console.log(`Best format: ${bestFormat[0]} (weight: ${bestFormat[1].toFixed(2)})`);
  console.log(`Worst format: ${worstFormat[0]} (weight: ${worstFormat[1].toFixed(2)})`);

  const bestHook = Object.entries(strategy.hook_weights).sort((a, b) => b[1] - a[1])[0];
  console.log(`Best hook: ${bestHook[0]} (weight: ${bestHook[1].toFixed(2)})`);
  console.log(`Best times: ${strategy.best_times.join(", ")}`);
  console.log(`Top cities: ${strategy.top_cities.join(", ")}`);
}

main();
