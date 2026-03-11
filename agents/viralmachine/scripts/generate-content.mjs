#!/usr/bin/env node
/**
 * Content Generator — uses Claude to generate actually viral anonymous takes
 * NOT pulled from the database. Original, edgy, debate-worthy content.
 */
import { writeFileSync, readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY required");
  process.exit(1);
}

const count = parseInt(process.argv[2] || "5", 10);
const format = process.argv[3] || "mixed"; // confession, hot_take, rate_this, city_vs_city, mixed

async function generateTakes(n, fmt) {
  const prompt = `You are a content strategist for anonymous social media videos. Generate ${n} short anonymous posts that would go VIRAL on TikTok.

Rules:
- These are anonymous posts from a local social app called Jawwing
- Each post should be 1-3 sentences MAX (fits on a phone screen)
- They need to make people STOP SCROLLING
- They should provoke strong reactions: "omg so true", "absolutely not", "this is unhinged", "who hurt you"
- Be genuinely edgy, controversial, funny, or painfully relatable — NOT generic positivity
- Reference real cultural moments, dating, work life, city living, roommates, commuting, food takes, generational divides
- NO hashtags, no emojis (maybe one max), no "hey guys", no influencer speak
- Sound like a real person typed this on their phone at 2am
- Vary the energy: some angry, some confessional, some deadpan, some unhinged
- These should feel like the posts that get screenshotted and shared

${fmt === "city_vs_city" ? "For each post, also assign a US city (dc, nyc, la, chicago, austin, miami, seattle, denver, atlanta, boston, philly, sf, portland, nashville, detroit). Make the post feel local to that city." : ""}
${fmt === "confession" ? "Focus on confessions — things people think but never say out loud. Dark humor welcome." : ""}
${fmt === "hot_take" ? "Focus on scorching hot takes that will start arguments in the comments." : ""}
${fmt === "rate_this" ? "Focus on debatable opinions where people will be split 50/50." : ""}

Examples of GOOD viral anonymous posts:
- "i mass-unfollowed everyone who got engaged this year and my feed has never been better"
- "your dog doesn't like you. he likes that you feed him. i will not be elaborating"
- "the person who invented open floor plans in offices has never had a thought worth protecting"
- "i judge people who order well-done steak more than i judge most criminals"
- "normalize telling your uber driver you don't want to talk"
- "if you venmo request someone for less than $5 we can't be friends"
- "watched my roommate put ketchup on scrambled eggs and i've been reconsidering the lease ever since"
- "every man who says he's 6 feet is actually 5'10 and we all just agreed to pretend"

Examples of BAD posts (do NOT write like this):
- "Energy is on tonight!" (meaningless)
- "Love this city!" (generic)
- "Great weather today" (boring)
- "anyone else tired?" (too vague)
- "the vibes are immaculate" (influencer garbage)

Return a JSON array of objects with fields: content, city (if applicable, else null), format (confession/hot_take/rate_this/city_vs_city)`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.content[0].text;
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  return JSON.parse(cleaned);
}

async function main() {
  console.log(`Generating ${count} viral takes (format: ${format})...`);

  const takes = await generateTakes(count, format);

  console.log(`\nGenerated ${takes.length} takes:\n`);
  takes.forEach((t, i) => {
    console.log(`${i + 1}. [${t.format}${t.city ? ` / ${t.city}` : ""}] "${t.content}"`);
  });

  // Build briefs for video generator
  const briefs = takes.map((t) => ({
    format: t.format === "hot_take" ? "rate_this" : t.format,
    hook: t.format === "confession" ? "someone_near_you" :
          t.format === "rate_this" ? "rate_this" :
          t.format === "city_vs_city" ? "most_unhinged" : "would_you_post",
    theme: t.format,
    city: t.city || "anonymous",
    posts: [{ id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, content: t.content, metro: t.city || "unknown", score: 10 }],
  }));

  // For hot_takes format, bundle multiple takes into one video
  if (format === "mixed" || format === "hot_take") {
    const hotTakePosts = takes.filter(t => t.format === "hot_take");
    if (hotTakePosts.length >= 3) {
      briefs.push({
        format: "hot_takes",
        hook: "most_unhinged",
        theme: "hot_take",
        city: "anonymous",
        posts: hotTakePosts.slice(0, 7).map(t => ({
          id: `gen_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          content: t.content,
          metro: t.city || "unknown",
          score: 10,
        })),
      });
    }
  }

  const outPath = join(DATA_DIR, "next-batch.json");
  writeFileSync(outPath, JSON.stringify(briefs, null, 2));
  console.log(`\nBriefs saved → ${outPath}`);
  console.log("Run generate-video.mjs to create videos, then send for review.");
}

main().catch(console.error);
