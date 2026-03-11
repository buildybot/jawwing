#!/usr/bin/env node
/**
 * Video Generator v3 — FAST (10s max), with music, TikTok-optimized
 */
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const ASSETS_DIR = join(__dirname, "..", "assets");
const OUTPUT_DIR = join(__dirname, "..", "output");
const TMP_DIR = join(__dirname, "..", "tmp");

mkdirSync(OUTPUT_DIR, { recursive: true });
mkdirSync(TMP_DIR, { recursive: true });

const W = 1080, H = 1920, FPS = 30;
const FONT = "/System/Library/Fonts/Courier.dfont";
const MUSIC = join(ASSETS_DIR, "dark-ambient.aac");

function esc(text) {
  return text
    .replace(/\\/g, "\\\\\\\\")
    .replace(/'/g, "\u2019")
    .replace(/:/g, "\\:")
    .replace(/%/g, "%%")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/;/g, "\\;");
}

function wrapText(text, maxChars = 24) {
  const words = text.replace(/https?:\/\/[^\s]+/g, "").replace(/\s{2,}/g, " ").trim().split(/\s+/);
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

function dt(text, opts) {
  const parts = [`text='${esc(text)}'`, `fontfile=${FONT}`];
  parts.push(`fontsize=${opts.size || 40}`);
  parts.push(`fontcolor=${opts.color || "white"}`);
  parts.push(opts.x ? `x=${opts.x}` : "x=(w-text_w)/2");
  parts.push(`y=${opts.y || 100}`);
  if (opts.alpha) parts.push(`alpha='${opts.alpha}'`);
  if (opts.enable) parts.push(`enable='${opts.enable}'`);
  return "drawtext=" + parts.join(":");
}

// ─── CONFESSION: Hook → reveal → watermark. 10s total ────────────────────────
function genConfession(brief) {
  const content = brief.posts[0].content.replace(/https?:\/\/[^\s]+/g, "").trim();
  const lines = wrapText(content);
  const dur = 10;
  const lineH = 58;
  const startY = Math.max(500, (H / 2) - (lines.length * lineH / 2));
  const f = [];

  // Hook text (0-2.5s)
  f.push(dt("someone posted this near you...", { size: 32, color: "#666666", y: H / 2, enable: "between(t\\,0.3\\,2.5)" }));

  // Content lines appear staggered (3s-7.5s)
  const perLine = 4.5 / Math.max(lines.length, 1);
  for (let i = 0; i < lines.length; i++) {
    const t = (3 + i * perLine).toFixed(2);
    f.push(dt(lines[i], {
      size: 46, y: startY + i * lineH,
      alpha: `if(lt(t\\,${t})\\,0\\,min(1\\,(t-${t})*5))`,
      enable: `gte(t\\,${t})`,
    }));
  }

  // Watermark (8-10s)
  f.push(dt("jawwing.com", { size: 28, color: "#888888", y: H - 140, enable: "gte(t\\,8)" }));

  return { filters: f, duration: dur };
}

// ─── RATE THIS: Post + agree/disagree prompt. 10s ────────────────────────────
function genRateThis(brief) {
  const content = brief.posts[0].content.replace(/https?:\/\/[^\s]+/g, "").trim();
  const lines = wrapText(content);
  const dur = 10;
  const f = [];

  f.push(dt("RATE THIS TAKE", { size: 30, color: "#666666", y: 350, enable: "gte(t\\,0.2)" }));

  // Content (0.8s onwards)
  for (let j = 0; j < Math.min(lines.length, 5); j++) {
    f.push(dt(lines[j], {
      size: 48, y: 500 + j * 60,
      alpha: "min(1\\,(t-0.8)*4)", enable: "gte(t\\,0.8)",
    }));
  }

  // Vote prompt (4s)
  f.push(dt("agree or disagree?", { size: 42, y: H - 550, enable: "gte(t\\,4)" }));
  f.push(dt("jawwing.com", { size: 24, color: "#555555", y: H - 140, enable: "gte(t\\,4)" }));

  return { filters: f, duration: dur };
}

// ─── HOT TAKES: 3-4 posts, rapid cuts. 10s ──────────────────────────────────
function genHotTakes(brief) {
  const posts = brief.posts.slice(0, 4);
  const dur = 10;
  const perPost = 7 / posts.length; // 7s for content, 1s hook, 2s end
  const f = [];

  f.push(dt("unhinged takes right now", { size: 34, color: "#666666", y: H / 2, enable: "between(t\\,0.1\\,1.2)" }));

  for (let i = 0; i < posts.length; i++) {
    const start = 1.5 + i * perPost;
    const end = start + perPost;
    const content = posts[i].content.replace(/https?:\/\/[^\s]+/g, "").trim().slice(0, 100);
    const lines = wrapText(content);

    f.push(dt(`${i + 1}`, { size: 22, color: "#444444", x: 80, y: 400, enable: `between(t\\,${start.toFixed(1)}\\,${end.toFixed(1)})` }));

    for (let j = 0; j < Math.min(lines.length, 4); j++) {
      f.push(dt(lines[j], {
        size: 44, y: 500 + j * 55,
        enable: `between(t\\,${(start + 0.1).toFixed(1)}\\,${end.toFixed(1)})`,
      }));
    }
  }

  f.push(dt("jawwing.com", { size: 28, color: "#888888", y: H / 2, enable: "gte(t\\,8.5)" }));

  return { filters: f, duration: dur };
}

// ─── CITY VS CITY: Split reveal. 10s ─────────────────────────────────────────
function genCityVsCity(brief) {
  const [p1, p2] = brief.posts;
  const c1 = (p1.metro || "CITY 1").toUpperCase();
  const c2 = (p2.metro || "CITY 2").toUpperCase();
  const dur = 10;
  const f = [];

  f.push(dt(`${c1} vs ${c2}`, { size: 36, y: 300, enable: "gte(t\\,0.2)" }));

  // City 1 (1.5s)
  const l1 = wrapText(p1.content.replace(/https?:\/\/[^\s]+/g, "").trim().slice(0, 100));
  f.push(dt(c1, { size: 20, color: "#666666", y: 450, enable: "gte(t\\,1)" }));
  for (let j = 0; j < Math.min(l1.length, 3); j++) {
    f.push(dt(l1[j], { size: 40, y: 500 + j * 50, alpha: "min(1\\,(t-1.3)*4)", enable: "gte(t\\,1.3)" }));
  }

  // Divider
  f.push(dt("- - - - - - - - -", { size: 24, color: "#222222", y: H / 2 + 20, enable: "gte(t\\,0.5)" }));

  // City 2 (4.5s)
  const l2 = wrapText(p2.content.replace(/https?:\/\/[^\s]+/g, "").trim().slice(0, 100));
  f.push(dt(c2, { size: 20, color: "#666666", y: H / 2 + 80, enable: "gte(t\\,4)" }));
  for (let j = 0; j < Math.min(l2.length, 3); j++) {
    f.push(dt(l2[j], { size: 40, y: H / 2 + 130 + j * 50, alpha: "min(1\\,(t-4.3)*4)", enable: "gte(t\\,4.3)" }));
  }

  f.push(dt("jawwing.com", { size: 24, color: "#555555", y: H - 140, enable: "gte(t\\,8)" }));

  return { filters: f, duration: dur };
}

// ─── ffmpeg runner with music ─────────────────────────────────────────────────
function render(filters, duration, outputPath) {
  const filterFile = join(TMP_DIR, `f_${Date.now()}.txt`);
  writeFileSync(filterFile, filters.join(",\n"));

  const hasMusic = existsSync(MUSIC);
  const audioInput = hasMusic
    ? `-i "${MUSIC}"`
    : `-f lavfi -i anullsrc=r=44100:cl=stereo:d=${duration}`;

  // If we have music, mix it and trim to duration
  const audioFilter = hasMusic
    ? `-af "afade=t=in:st=0:d=0.5,afade=t=out:st=${duration - 1}:d=1,volume=0.6"`
    : "";

  const cmd = [
    "ffmpeg -y",
    `-f lavfi -i color=c=black:s=${W}x${H}:d=${duration}:r=${FPS}`,
    audioInput,
    `-filter_complex_script "${filterFile}"`,
    "-c:v libx264 -preset fast -crf 23 -pix_fmt yuv420p",
    `-c:a aac -b:a 128k ${audioFilter}`,
    `-t ${duration}`,
    "-shortest",
    `"${outputPath}"`,
  ].join(" ");

  try {
    execSync(cmd, { stdio: "pipe", timeout: 60000 });
  } finally {
    try { unlinkSync(filterFile); } catch {}
  }
}

async function main() {
  const briefPath = join(DATA_DIR, "next-batch.json");
  if (!existsSync(briefPath)) { console.error("Run generate-content.mjs first."); process.exit(1); }

  const briefs = JSON.parse(readFileSync(briefPath, "utf-8"));
  const results = [];

  for (const brief of briefs) {
    const id = `vm_${randomUUID().slice(0, 8)}`;
    const outputPath = join(OUTPUT_DIR, `${id}.mp4`);
    console.log(`${brief.format} (${brief.city})...`);

    try {
      let spec;
      switch (brief.format) {
        case "confession": spec = genConfession(brief); break;
        case "hot_takes": case "feed_scroll": spec = genHotTakes(brief); break;
        case "rate_this": spec = genRateThis(brief); break;
        case "city_vs_city": spec = genCityVsCity(brief); break;
        default: spec = genConfession(brief);
      }
      render(spec.filters, spec.duration, outputPath);
      results.push({ id, path: outputPath, format: brief.format, hook: brief.hook, theme: brief.theme, city: brief.city, post_ids: brief.posts.map(p => p.id), duration: spec.duration });
      console.log(`  ✓ ${id}.mp4 (${spec.duration}s)`);
    } catch (err) {
      console.error(`  ✗ ${err.message.split("\n")[0]}`);
    }
  }

  writeFileSync(join(DATA_DIR, "video-manifest.json"), JSON.stringify(results, null, 2));
  console.log(`\n${results.length}/${briefs.length} videos generated`);
}

main().catch(console.error);
