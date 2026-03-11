#!/usr/bin/env node
/**
 * Video Generator — creates short-form videos from content briefs
 * Uses ffmpeg drawtext with textfile approach (avoids shell escaping hell)
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const OUTPUT_DIR = join(__dirname, "..", "output");
const TMP_DIR = join(__dirname, "..", "tmp");

mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

const W = 1080;
const H = 1920;
const FPS = 30;
const FONT = "/System/Library/Fonts/Courier.dfont";

// Strip URLs from text for video display (keep it clean)
function stripUrls(text) {
  return text.replace(/https?:\/\/[^\s]+/g, "").replace(/\s{2,}/g, " ").trim();
}

// Escape text for ffmpeg drawtext (when using text= directly)
function esc(text) {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\u2019")  // Use curly apostrophe
    .replace(/:/g, "\\:")
    .replace(/%/g, "%%")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/;/g, "\\;");
}

// Wrap text into lines of maxChars
function wrapText(text, maxChars = 26) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > maxChars) {
      if (cur) lines.push(cur.trim());
      cur = w;
    } else cur = cur ? cur + " " + w : w;
  }
  if (cur.trim()) lines.push(cur.trim());
  return lines;
}

// Build a single drawtext filter string
function dt(text, opts) {
  const escaped = esc(text);
  const parts = [`text='${escaped}'`, `fontfile=${FONT}`];
  parts.push(`fontsize=${opts.size || 40}`);
  parts.push(`fontcolor=${opts.color || "white"}`);
  if (opts.x) parts.push(`x=${opts.x}`);
  else parts.push("x=(w-text_w)/2");
  parts.push(`y=${opts.y || 100}`);
  if (opts.alpha) parts.push(`alpha='${opts.alpha}'`);
  if (opts.enable) parts.push(`enable='${opts.enable}'`);
  return "drawtext=" + parts.join(":");
}

// ─── FORMAT: Confession ───────────────────────────────────────────────────────
function generateConfession(brief, outputPath) {
  const post = brief.posts[0];
  const content = stripUrls(post.content);
  const lines = wrapText(content);
  const hookText = brief.hook === "would_you_post"
    ? "would you post this?"
    : "someone near you just posted this anonymously...";
  const duration = Math.max(8, Math.min(25, content.length / 8 + 5));
  const hookEnd = 3;
  const textStart = hookEnd + 0.5;
  const textDuration = duration - textStart - 2.5;
  const charDelay = textDuration / (lines.reduce((s, l) => s + l.length, 0) + 1);
  const lineH = 60;
  const startY = Math.max(300, (H / 2) - (lines.length * lineH / 2));

  const filters = [];

  // Hook
  filters.push(dt(hookText, { size: 36, color: "#888888", y: H / 2, enable: `between(t\\,0.5\\,${hookEnd})` }));

  // Lines with staggered reveal
  let charIdx = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineStart = textStart + charIdx * charDelay;
    charIdx += lines[i].length;
    filters.push(dt(lines[i], {
      size: 48, y: startY + i * lineH,
      alpha: `if(lt(t\\,${lineStart.toFixed(2)})\\,0\\,min(1\\,(t-${lineStart.toFixed(2)})*4))`,
      enable: `gte(t\\,${lineStart.toFixed(2)})`,
    }));
  }

  // End card
  const endStart = duration - 2;
  filters.push(dt("jawwing.com", { size: 32, color: "#AAAAAA", y: H - 160, enable: `gte(t\\,${endStart})` }));
  filters.push(dt("anonymous. local. unfiltered.", { size: 22, color: "#555555", y: H - 110, enable: `gte(t\\,${endStart})` }));

  runFfmpeg(filters, duration, outputPath);
  return { duration, format: "confession" };
}

// ─── FORMAT: Hot Takes ────────────────────────────────────────────────────────
function generateHotTakes(brief, outputPath) {
  const posts = brief.posts.slice(0, 7);
  const perPost = 4;
  const hookDur = 2.5;
  const endDur = 2;
  const duration = hookDur + posts.length * perPost + endDur;

  const hookText = brief.hook === "rate_this"
    ? "rate these takes"
    : `the most unhinged takes from ${brief.city || "today"}`;

  const filters = [];

  // Hook
  filters.push(dt(hookText, { size: 38, y: H / 2, enable: `between(t\\,0.3\\,${hookDur})` }));

  // Each post
  for (let i = 0; i < posts.length; i++) {
    const start = hookDur + i * perPost;
    const end = start + perPost;
    const content = stripUrls(posts[i].content).slice(0, 120);
    const lines = wrapText(content);
    const metro = (posts[i].metro || "").toUpperCase();

    // Counter
    filters.push(dt(`${i + 1}/${posts.length}`, { size: 24, color: "#888888", x: 60, y: 200, enable: `between(t\\,${start}\\,${end})` }));

    // City tag
    if (metro && metro !== "UNKNOWN") {
      filters.push(dt(metro, { size: 28, color: "#888888", x: 60, y: 250, enable: `between(t\\,${start}\\,${end})` }));
    }

    // Post lines
    for (let j = 0; j < Math.min(lines.length, 5); j++) {
      filters.push(dt(lines[j], {
        size: 42, y: 450 + j * 55,
        enable: `between(t\\,${(start + 0.2).toFixed(1)}\\,${end})`,
      }));
    }
  }

  // End card
  const endStart = hookDur + posts.length * perPost;
  filters.push(dt("jawwing.com", { size: 36, y: H / 2, enable: `gte(t\\,${endStart})` }));
  filters.push(dt("see what your city is really saying", { size: 22, color: "#888888", y: H / 2 + 50, enable: `gte(t\\,${endStart})` }));

  runFfmpeg(filters, duration, outputPath);
  return { duration, format: "hot_takes" };
}

// ─── FORMAT: Rate This Take ───────────────────────────────────────────────────
function generateRateThis(brief, outputPath) {
  const post = brief.posts[0];
  const content = stripUrls(post.content).slice(0, 200);
  const lines = wrapText(content);
  const metro = (post.metro || "").toUpperCase();
  const duration = 12;

  const filters = [];

  filters.push(dt("RATE THIS TAKE", { size: 32, color: "#888888", y: 300, enable: `gte(t\\,0.3)` }));
  if (metro && metro !== "UNKNOWN") {
    filters.push(dt(metro, { size: 24, color: "#555555", y: 350, enable: `gte(t\\,0.3)` }));
  }

  for (let j = 0; j < Math.min(lines.length, 6); j++) {
    filters.push(dt(lines[j], {
      size: 48, y: 480 + j * 60,
      alpha: `min(1\\,(t-0.8)*3)`, enable: `gte(t\\,0.8)`,
    }));
  }

  // Vote prompt
  filters.push(dt("agree or disagree?", { size: 44, y: H - 500, enable: `gte(t\\,4)` }));
  filters.push(dt("comment below", { size: 24, color: "#888888", y: H - 440, enable: `gte(t\\,4.5)` }));

  // Watermark
  filters.push(dt("jawwing.com", { size: 22, color: "#333333", y: H - 120, enable: `gte(t\\,1)` }));

  runFfmpeg(filters, duration, outputPath);
  return { duration, format: "rate_this" };
}

// ─── FORMAT: City vs City ─────────────────────────────────────────────────────
function generateCityVsCity(brief, outputPath) {
  const [p1, p2] = brief.posts;
  const city1 = (p1.metro || "CITY 1").toUpperCase();
  const city2 = (p2.metro || "CITY 2").toUpperCase();
  const duration = 15;

  const lines1 = wrapText(stripUrls(p1.content).slice(0, 150));
  const lines2 = wrapText(stripUrls(p2.content).slice(0, 150));

  const filters = [];

  // Title
  filters.push(dt(`${city1}  vs  ${city2}`, { size: 36, y: 250, enable: `gte(t\\,0.3)` }));
  filters.push(dt("who is more unhinged?", { size: 24, color: "#888888", y: 300, enable: `gte(t\\,0.5)` }));

  // City 1 (top)
  filters.push(dt(city1, { size: 22, color: "#888888", y: 420, enable: `gte(t\\,1)` }));
  for (let j = 0; j < Math.min(lines1.length, 4); j++) {
    filters.push(dt(lines1[j], {
      size: 40, y: 480 + j * 50,
      alpha: `min(1\\,(t-1.5)*3)`, enable: `gte(t\\,1.5)`,
    }));
  }

  // Divider
  filters.push(dt("- - - - - - - - - - - -", { size: 24, color: "#222222", y: H / 2, enable: `gte(t\\,0.3)` }));

  // City 2 (bottom)
  filters.push(dt(city2, { size: 22, color: "#888888", y: H / 2 + 50, enable: `gte(t\\,4)` }));
  for (let j = 0; j < Math.min(lines2.length, 4); j++) {
    filters.push(dt(lines2[j], {
      size: 40, y: H / 2 + 110 + j * 50,
      alpha: `min(1\\,(t-4.5)*3)`, enable: `gte(t\\,4.5)`,
    }));
  }

  // Watermark
  filters.push(dt("jawwing.com", { size: 22, color: "#333333", y: H - 120, enable: `gte(t\\,1)` }));

  runFfmpeg(filters, duration, outputPath);
  return { duration, format: "city_vs_city" };
}

// ─── ffmpeg runner ────────────────────────────────────────────────────────────
function runFfmpeg(filters, duration, outputPath) {
  // Write filter to temp file to avoid shell escaping issues
  const filterFile = join(TMP_DIR, `filter_${Date.now()}.txt`);
  const filterChain = filters.join(",\n");
  writeFileSync(filterFile, filterChain);

  const cmd = [
    "ffmpeg -y",
    `-f lavfi -i color=c=black:s=${W}x${H}:d=${duration}:r=${FPS}`,
    `-f lavfi -i anullsrc=r=44100:cl=stereo:d=${duration}`,
    `-filter_complex_script "${filterFile}"`,
    "-c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p",
    "-c:a aac -b:a 128k",
    "-shortest",
    `"${outputPath}"`,
  ].join(" ");

  try {
    execSync(cmd, { stdio: "pipe", timeout: 120000 });
  } finally {
    try { unlinkSync(filterFile); } catch {}
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const briefPath = join(DATA_DIR, "next-batch.json");
  if (!existsSync(briefPath)) {
    console.error("No content briefs found. Run select-content.mjs first.");
    process.exit(1);
  }

  const briefs = JSON.parse(readFileSync(briefPath, "utf-8"));
  const results = [];

  for (const brief of briefs) {
    const id = `vm_${randomUUID().slice(0, 8)}`;
    const outputPath = join(OUTPUT_DIR, `${id}.mp4`);

    console.log(`Generating ${brief.format} video (${brief.posts.length} posts, ${brief.city})...`);

    try {
      let meta;
      switch (brief.format) {
        case "confession": meta = generateConfession(brief, outputPath); break;
        case "hot_takes":
        case "feed_scroll": meta = generateHotTakes(brief, outputPath); break;
        case "rate_this": meta = generateRateThis(brief, outputPath); break;
        case "city_vs_city": meta = generateCityVsCity(brief, outputPath); break;
        default: meta = generateConfession(brief, outputPath);
      }

      results.push({
        id, path: outputPath, format: brief.format, hook: brief.hook,
        theme: brief.theme, city: brief.city,
        post_ids: brief.posts.map((p) => p.id), duration: meta.duration,
      });
      console.log(`  ✓ ${outputPath} (${meta.duration.toFixed(1)}s)`);
    } catch (err) {
      console.error(`  ✗ Failed: ${err.message.split("\n")[0]}`);
    }
  }

  const manifestPath = join(DATA_DIR, "video-manifest.json");
  writeFileSync(manifestPath, JSON.stringify(results, null, 2));
  console.log(`\nGenerated ${results.length}/${briefs.length} videos → ${manifestPath}`);
}

main().catch(console.error);
