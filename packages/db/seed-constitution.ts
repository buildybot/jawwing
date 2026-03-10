/**
 * seed-constitution.ts — Seeds the initial constitution v1.0
 *
 * Run with:
 *   npx tsx packages/db/seed-constitution.ts
 * from repo root.
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

import { constitution_versions } from "./schema.js";

// ─── Load .env.local ──────────────────────────────────────────────────────────

function loadEnv() {
  const locations = [
    path.resolve(process.cwd(), "../../.env.local"),
    path.resolve(process.cwd(), ".env.local"),
  ];
  for (const loc of locations) {
    try {
      const raw = fs.readFileSync(loc, "utf8");
      for (const line of raw.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
      console.log(`✅ Loaded env from: ${loc}`);
      return;
    } catch {
      // continue
    }
  }
  console.warn("⚠️  No .env.local found — relying on existing env vars");
}

loadEnv();

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) { console.error("❌ TURSO_DATABASE_URL not set"); process.exit(1); }

const client = createClient({ url, authToken });
const db = drizzle(client, { schema: { constitution_versions } });

const CONSTITUTION_V1 = {
  prohibited: [
    { id: "P-1", name: "Hate Speech", description: "Content that dehumanizes people based on race, ethnicity, religion, gender, sexual orientation, disability, or national origin. Includes slurs used as attacks, calls for discrimination, and content portraying groups as subhuman.", clarification: "Discussing these topics critically, historically, or analytically is not hate speech." },
    { id: "P-2", name: "Credible Threats", description: "Content threatening violence or serious harm to a specific person or group. Includes direct threats, conditional threats, and posts encouraging others to commit violence against identifiable targets.", clarification: '"I want to kill this exam" is not a threat. "I\'m going to find you and hurt you" is.' },
    { id: "P-3", name: "Doxxing", description: "Posting someone's private, personally identifying information without their consent. Includes real names tied to anonymous accounts, home addresses, phone numbers, workplace details, or combinations of information designed to identify or locate someone.", clarification: null },
    { id: "P-4", name: "Child Sexual Abuse Material (CSAM)", description: "Any sexual content involving minors. Results in immediate permanent ban and reporting to authorities.", clarification: "Zero exceptions. Zero tolerance." },
    { id: "P-5", name: "Illegal Activity Facilitation", description: "Content that directly facilitates illegal activity: soliciting or coordinating crimes, selling illegal goods/substances, sharing instructions for violence or weapon modification, or content that constitutes a crime (e.g., non-consensual intimate imagery).", clarification: "Discussing illegal topics (drug policy, crime news, legal gray areas) is different from actively facilitating illegal acts." },
  ],
  restricted: [
    { id: "R-1", name: "NSFW Content", description: "Sexually explicit or graphic content may only be posted in communities with NSFW mode enabled. In general communities, such content will be removed.", clarification: null },
    { id: "R-2", name: "Spam", description: "Repetitive posts, flooding a feed with near-identical content, or coordinated artificial amplification. A single post won't trigger this. A pattern will.", clarification: null },
    { id: "R-3", name: "Commercial Content", description: "Unsolicited advertising, promotional posts, or affiliate links. Limited community announcements (local events, genuine recommendations) are fine.", clarification: null },
    { id: "R-4", name: "Misleading Content", description: "Demonstrably false information designed to deceive, especially about local events, emergencies, or public safety. Satire and obvious jokes are not misleading. Content must be clearly false AND clearly intended to deceive.", clarification: null },
    { id: "R-5", name: "Graphic Violence", description: "Gratuitous graphic violence (shock content posted for its own sake) is restricted in general communities. News, journalism, documentation of real events, and safety information may involve graphic elements and will be evaluated in context.", clarification: null },
  ],
  principles: [
    "Free expression is the default. If a rule doesn't prohibit it, it's allowed.",
    "Context matters. Anonymous doesn't mean consequence-free, but don't assume the worst.",
    "Proportionality. Minor violations get minor responses.",
    "Consistency. Same content gets same treatment regardless of who posted it.",
    "Transparency. Every moderation action is logged with rule cited and reasoning.",
  ],
};

async function seedConstitution() {
  console.log("\n🌱 Seeding Constitution v1.0...\n");

  const CONST_V1_ID = "constitution_v1_0";

  // Check if already exists
  const existing = await db.select().from(constitution_versions).where(eq(constitution_versions.id, CONST_V1_ID));
  if (existing.length > 0) {
    console.log("⚠️  Constitution v1.0 already exists, skipping.");
    return;
  }

  await db.insert(constitution_versions).values({
    id: CONST_V1_ID,
    version: "1.0",
    content: JSON.stringify(CONSTITUTION_V1),
    summary: "Initial Jawwing Moderation Constitution. Establishes 5 prohibited categories (hate speech, credible threats, doxxing, CSAM, illegal facilitation), 5 restricted categories (NSFW, spam, commercial, misleading, graphic violence), and 5 core principles.",
    created_at: Math.floor(new Date("2026-03-01").getTime() / 1000),
    created_by: "system",
    status: "active",
  });

  console.log("✅ Constitution v1.0 seeded successfully.");
  console.log(`   ID: ${CONST_V1_ID}`);
  console.log(`   Status: active`);
}

seedConstitution().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
