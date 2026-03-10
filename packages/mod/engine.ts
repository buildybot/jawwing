import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@libsql/client";
import { db, mod_actions, posts, nanoid, now } from "@jawwing/db";
import { eq } from "drizzle-orm";
import type { Post } from "@jawwing/db";

// Raw libSQL client for operations that bypass Drizzle ORM (e.g. new columns)
function getRawClient() {
  const url = process.env.TURSO_DATABASE_URL;
  if (!url) throw new Error("TURSO_DATABASE_URL is required");
  return createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN });
}

// ─── Constitution Rules (parseable constant) ──────────────────────────────────

export const CONSTITUTION_RULES = {
  prohibited: [
    {
      id: "P-1",
      name: "Hate Speech",
      description:
        "Content that dehumanizes people based on race, ethnicity, religion, gender, sexual orientation, disability, or national origin. Includes slurs used as attacks, calls for discrimination, and content portraying groups as subhuman.",
      clarification:
        "Discussing these topics critically, historically, or analytically is not hate speech.",
    },
    {
      id: "P-2",
      name: "Credible Threats",
      description:
        "Content threatening violence or serious harm to a specific person or group. Includes direct threats, conditional threats, and posts encouraging others to commit violence against identifiable targets.",
      clarification:
        '"I want to kill this exam" is not a threat. "I\'m going to find you and hurt you" is.',
    },
    {
      id: "P-3",
      name: "Doxxing",
      description:
        "Posting someone's private, personally identifying information without their consent. Includes real names tied to anonymous accounts, home addresses, phone numbers, workplace details, or combinations of information designed to identify or locate someone.",
      clarification: null,
    },
    {
      id: "P-4",
      name: "Child Sexual Abuse Material (CSAM)",
      description:
        "Any sexual content involving minors. Results in immediate permanent ban and reporting to authorities.",
      clarification: "Zero exceptions. Zero tolerance.",
    },
    {
      id: "P-5",
      name: "Illegal Activity Facilitation",
      description:
        "Content that directly facilitates illegal activity: soliciting or coordinating crimes, selling illegal goods/substances, sharing instructions for violence or weapon modification, or content that constitutes a crime (e.g., non-consensual intimate imagery).",
      clarification:
        "Discussing illegal topics (drug policy, crime news, legal gray areas) is different from actively facilitating illegal acts.",
    },
    {
      id: "II.6",
      name: "Sexually Explicit Content",
      description:
        "Nudity, pornography, sexual solicitation, and graphic sexual descriptions. This platform is not for adult content. Applies to both text and images.",
      clarification:
        "Educational discussions of sexuality, clinical language, and non-graphic references are permitted. Obvious NSFW content should be flagged with high confidence (>0.9). Borderline or ambiguous content may use lower confidence.",
    },
  ],
  restricted: [
    {
      id: "R-1",
      name: "NSFW Content",
      description:
        "Sexually explicit or graphic content may only be posted in communities with NSFW mode enabled. In general communities, such content will be removed.",
      clarification: null,
    },
    {
      id: "R-2",
      name: "Spam",
      description:
        "Repetitive posts, flooding a feed with near-identical content, or coordinated artificial amplification. A single post won't trigger this. A pattern will.",
      clarification: null,
    },
    {
      id: "R-3",
      name: "Commercial Content",
      description:
        "Unsolicited advertising, promotional posts, or affiliate links. Limited community announcements (local events, genuine recommendations) are fine.",
      clarification: null,
    },
    {
      id: "R-4",
      name: "Misleading Content",
      description:
        "Demonstrably false information designed to deceive, especially about local events, emergencies, or public safety. Satire and obvious jokes are not misleading. Content must be clearly false AND clearly intended to deceive.",
      clarification: null,
    },
    {
      id: "R-5",
      name: "Graphic Violence",
      description:
        "Gratuitous graphic violence (shock content posted for its own sake) is restricted in general communities. News, journalism, documentation of real events, and safety information may involve graphic elements and will be evaluated in context.",
      clarification: null,
    },
  ],
  principles: [
    "Free expression is the default. If a rule doesn't prohibit it, it's allowed.",
    "Context matters. Anonymous doesn't mean consequence-free, but don't assume the worst.",
    "Proportionality. Minor violations get minor responses.",
    "Consistency. Same content gets same treatment regardless of who posted it.",
    "Transparency. Every moderation action is logged with rule cited and reasoning.",
  ],
  allowedVideoSources: {
    id: "AV-1",
    name: "Allowed Video Links",
    description:
      "Video content may only be linked from platforms with established moderation policies. Users may share links to videos on these platforms. Native video upload is not supported.",
    allowedDomains: [
      { domain: "youtube.com", name: "YouTube", reason: "Google-moderated, community guidelines enforced" },
      { domain: "youtu.be", name: "YouTube (short)", reason: "Same as youtube.com" },
      { domain: "tiktok.com", name: "TikTok", reason: "ByteDance-moderated, community guidelines enforced" },
      { domain: "vimeo.com", name: "Vimeo", reason: "Staff-moderated, strict content policies" },
      { domain: "twitch.tv", name: "Twitch", reason: "Amazon-moderated, community guidelines enforced" },
      { domain: "instagram.com", name: "Instagram", reason: "Meta-moderated, community guidelines enforced" },
    ],
    policy:
      "Links to video hosting platforms not on this list will be flagged for review. This list can be amended through the standard amendment process.",
  },
  technology: {
    currentModel: "claude-haiku-4-5",
    modelProvider: "Google",
    rationale:
      "Fast inference (~200ms), cost-effective for high-volume content review, strong instruction following for rule-based decisions, sufficient capability for text content moderation.",
    selectionCriteria: [
      {
        id: "TC-1",
        label: "Speed",
        requirement: "Must process posts within 2 seconds of submission.",
      },
      {
        id: "TC-2",
        label: "Accuracy",
        requirement: "Must maintain >95% agreement with human reviewers on test set.",
      },
      {
        id: "TC-3",
        label: "Cost",
        requirement: "Must not exceed $0.001 per moderation decision at scale.",
      },
      {
        id: "TC-4",
        label: "Transparency",
        requirement: "Model provider must publish safety documentation.",
      },
      {
        id: "TC-5",
        label: "Independence",
        requirement:
          "No single provider lock-in. Model can be swapped with community notice.",
      },
    ],
    changePolicy:
      "Any model change requires 7-day public notice before deployment. The old and new model's test results must be published side-by-side prior to cutover.",
    auditCommitment:
      "Monthly publication of moderation accuracy statistics: false positive rate, false negative rate, and appeal overturn rate.",
  },
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type ModerationAction = "approve" | "flag" | "warn" | "remove";

export interface ModerationDecision {
  action: ModerationAction;
  ruleCited: string | null;
  reasoning: string;
  confidence: number;
}

// ─── System Prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a moderation agent for Jawwing, an anonymous location-based social platform. Your job is to evaluate posts against the Jawwing Moderation Constitution.

## Core Principles
${CONSTITUTION_RULES.principles.map((p) => `- ${p}`).join("\n")}

## Prohibited Content (always remove):
${CONSTITUTION_RULES.prohibited
  .map(
    (r) =>
      `### ${r.id}: ${r.name}\n${r.description}${r.clarification ? `\nNote: ${r.clarification}` : ""}`
  )
  .join("\n\n")}

## Restricted Content (warn/remove based on severity):
${CONSTITUTION_RULES.restricted
  .map(
    (r) =>
      `### ${r.id}: ${r.name}\n${r.description}${r.clarification ? `\nNote: ${r.clarification}` : ""}`
  )
  .join("\n\n")}

## NSFW / Sexually Explicit Content (II.6):
This is a prohibited content rule. Sexually explicit text or images must be removed:
- Pornographic content, graphic sexual descriptions, sexual solicitation → action: "remove", ruleCited: "II.6", confidence: >0.9
- Nudity (non-medical, non-artistic in clearly sexual context) → action: "remove", ruleCited: "II.6", confidence: 0.8-0.95
- Borderline or ambiguous sexual content → action: "flag", ruleCited: "II.6", confidence: 0.5-0.7
- This platform is NOT for adult content. When in doubt about sexual content, flag it.

## Image Moderation (when an image is attached):
Evaluate the image against the same rules above. Pay special attention to:
- Explicit/sexual content (P-1, R-1, II.6) — use rule II.6 for nudity/sexual imagery
- Violence or gore (P-2, R-5)
- Personally identifying information visible in the image (P-3)
- CSAM — zero tolerance, immediate remove (P-4)
- If you cannot determine the image content, use "flag"

## Video Link Policy (AV-1):
If the post contains a link to a video platform, check if the domain is in the allowed list: ${CONSTITUTION_RULES.allowedVideoSources.allowedDomains.map((d) => d.domain).join(", ")}. If the video domain is NOT on this list, use "flag" and cite rule AV-1.

## Your Decision Rules:
- "approve" — Content is fine. No violations. Default when in doubt.
- "warn" — Minor first violation of a Restricted rule (R-1 through R-5).
- "remove" — Clear violation of Prohibited rules (P-1 through P-5, II.6) OR clear repeated/severe Restricted rule violation.
- "flag" — You are genuinely uncertain. Use this when context is ambiguous and you cannot confidently determine if a rule is violated.

## Response Format (JSON only, no markdown):
{
  "action": "approve" | "flag" | "warn" | "remove",
  "ruleCited": "P-1" | "R-2" | "II.6" | null,
  "reasoning": "Brief explanation of your decision",
  "confidence": 0.0 to 1.0
}

Rules:
- NEVER include markdown code fences in your response. Return raw JSON only.
- If confidence is below 0.7 on a removal, use "flag" instead.
- Free expression is the default — approve when uncertain.
- Always cite the most relevant rule if taking action.
- If approving, ruleCited should be null.`;

// ─── AI Provider Abstraction ──────────────────────────────────────────────────
// Supports Groq (primary, free, fast) and Gemini (fallback)

interface AIProvider {
  name: string;
  reviewText(systemPrompt: string, userPrompt: string): Promise<string>;
  reviewWithImage?(systemPrompt: string, userPrompt: string, imageData: { data: string; mimeType: string }): Promise<string>;
}

function getGroqProvider(): AIProvider | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return {
    name: "groq/llama-3.3-70b",
    async reviewText(systemPrompt: string, userPrompt: string): Promise<string> {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.1,
          max_tokens: 500,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Groq API ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.choices[0].message.content;
    },
    // Groq doesn't support image input natively — fall through to Gemini for images
  };
}

function getGeminiProvider(): AIProvider | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  const genAI = new GoogleGenerativeAI(apiKey);
  return {
    name: "gemini/2.5-flash",
    async reviewText(systemPrompt: string, userPrompt: string): Promise<string> {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: systemPrompt });
      const result = await model.generateContent(userPrompt);
      return result.response.text().trim();
    },
    async reviewWithImage(systemPrompt: string, userPrompt: string, imageData: { data: string; mimeType: string }): Promise<string> {
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: systemPrompt });
      const result = await model.generateContent([
        { text: userPrompt },
        { inlineData: imageData },
      ]);
      return result.response.text().trim();
    },
  };
}

function getAnthropicProvider(): AIProvider | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return {
    name: "anthropic/claude-haiku-4-5",
    async reviewText(systemPrompt: string, userPrompt: string): Promise<string> {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20250514",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.content[0].text;
    },
    async reviewWithImage(systemPrompt: string, userPrompt: string, imageData: { data: string; mimeType: string }): Promise<string> {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20250514",
          max_tokens: 500,
          system: systemPrompt,
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: imageData.mimeType, data: imageData.data } },
              { type: "text", text: userPrompt },
            ],
          }],
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Anthropic API ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = await res.json();
      return data.content[0].text;
    },
  };
}

/** Get the best available AI provider. Priority: Anthropic Haiku (primary) → Groq (free) → Gemini (fallback) */
function getProvider(): AIProvider | null {
  return getAnthropicProvider() ?? getGroqProvider() ?? getGeminiProvider();
}

/** Get a provider that supports image review. Haiku 4.5 supports vision. */
function getImageProvider(): AIProvider | null {
  const anthropic = getAnthropicProvider();
  if (anthropic?.reviewWithImage) return anthropic;
  const gemini = getGeminiProvider();
  if (gemini?.reviewWithImage) return gemini;
  return null;
}

// Legacy — keep for backward compat
function getGenAI(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

// ─── The system agent ID for AI-initiated mod actions ─────────────────────────
// This should be a real agent user ID in production; use env var.
const AI_AGENT_ID = process.env.MOD_AGENT_ID ?? "agent-system";

// ─── reviewPost ───────────────────────────────────────────────────────────────

// ─── Download image as base64 ─────────────────────────────────────────────────

async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const contentType = res.headers.get("content-type") ?? "image/jpeg";
    const mimeType = contentType.split(";")[0].trim();
    const buffer = await res.arrayBuffer();
    const data = Buffer.from(buffer).toString("base64");
    return { data, mimeType };
  } catch {
    return null;
  }
}

/** Log a moderation decision and update post status. Reusable across all review paths. */
async function logAndUpdatePost(post: Post, decision: ModerationDecision): Promise<ModerationDecision> {
  let actionId: string | null = null;
  try {
    actionId = nanoid();
    await db.insert(mod_actions).values({
      id: actionId, post_id: post.id, agent_id: AI_AGENT_ID,
      action: decision.action, rule_cited: decision.ruleCited,
      reasoning: decision.reasoning, created_at: now(),
      appealed: false, appeal_result: null,
    });
  } catch (dbErr) {
    console.error("[mod/engine] Failed to log mod action:", dbErr);
    actionId = null;
  }

  try {
    const rawClient = getRawClient();
    const statusMap: Record<string, string> = { remove: "removed", flag: "moderated", warn: "moderated", approve: "active" };
    const newStatus = statusMap[decision.action] ?? "active";
    if (actionId) {
      await rawClient.execute({ sql: `UPDATE posts SET status = ?, mod_action_id = ?, mod_confidence = ? WHERE id = ?`, args: [newStatus, actionId, decision.confidence, post.id] });
    } else {
      await rawClient.execute({ sql: `UPDATE posts SET status = ?, mod_confidence = ? WHERE id = ?`, args: [newStatus, decision.confidence, post.id] });
    }
  } catch (updateErr) {
    console.error("[mod/engine] Failed to update post status:", updateErr);
  }

  console.log('[MOD] Decision for', post.id, ':', decision.action, 'confidence:', decision.confidence);
  return decision;
}

export async function reviewPost(post: Post): Promise<ModerationDecision> {
  console.log('[MOD] Reviewing post:', post.id, 'content:', post.content.slice(0, 50));

  const provider = getProvider();

  // No AI provider available — fallback
  if (!provider) {
    console.warn('[MOD] WARNING: No AI provider (GROQ_API_KEY or GEMINI_API_KEY) - auto-approving text, flagging images');
    const fallbackAction = post.image_url ? "flag" : "approve";
    const fallbackDecision: ModerationDecision = {
      action: fallbackAction,
      ruleCited: null,
      reasoning: post.image_url
        ? "No moderation AI available. Post with image held for manual review."
        : "No moderation AI available. Auto-approved.",
      confidence: fallbackAction === "approve" ? 1 : 0,
    };
    try {
      await db.insert(mod_actions).values({
        id: nanoid(), post_id: post.id, agent_id: AI_AGENT_ID,
        action: fallbackDecision.action, rule_cited: fallbackDecision.ruleCited,
        reasoning: fallbackDecision.reasoning, created_at: now(),
        appealed: false, appeal_result: null,
      });
    } catch (dbErr) {
      console.error("[mod/engine] Failed to log fallback mod action:", dbErr);
    }
    try {
      const rawClient = getRawClient();
      const newStatus = fallbackAction === "approve" ? "active" : "moderated";
      await rawClient.execute({ sql: `UPDATE posts SET status = '${newStatus}', mod_confidence = ? WHERE id = ?`, args: [fallbackDecision.confidence, post.id] });
    } catch (e) {
      console.error("[mod/engine] Failed to update post status in fallback:", e);
    }
    return fallbackDecision;
  }

  console.log(`[MOD] Using provider: ${provider.name}`);

  // Handle image posts — need image-capable provider (Gemini)
  if (post.image_url) {
    const imageProvider = getImageProvider();
    if (imageProvider?.reviewWithImage) {
      const imageData = await fetchImageAsBase64(post.image_url);
      if (imageData) {
        try {
          const text = await imageProvider.reviewWithImage(
            SYSTEM_PROMPT,
            `Please review this post (it includes an attached image):\n\n"${post.content}"`,
            imageData
          );
          const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
          const parsed = JSON.parse(cleaned);
          const decision: ModerationDecision = {
            action: parsed.action as ModerationAction,
            ruleCited: parsed.ruleCited ?? null,
            reasoning: `[${imageProvider.name}] ${parsed.reasoning ?? ""}`,
            confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
          };
          if (decision.action === "remove" && decision.confidence < 0.7) {
            decision.action = "flag";
            decision.reasoning = `[Downgraded: confidence ${decision.confidence.toFixed(2)} < 0.7] ${decision.reasoning}`;
          }
          return await logAndUpdatePost(post, decision);
        } catch (err) {
          console.error("[mod/engine] Image review failed, flagging:", err);
        }
      }
      // Image download failed or review failed — flag for manual review
      const flagDecision: ModerationDecision = {
        action: "flag", ruleCited: null,
        reasoning: "Image could not be reviewed by AI. Flagged for manual review.",
        confidence: 0,
      };
      return await logAndUpdatePost(post, flagDecision);
    } else {
      // No image-capable provider — flag image posts
      const flagDecision: ModerationDecision = {
        action: "flag", ruleCited: null,
        reasoning: "No image-capable AI available. Image post flagged for manual review.",
        confidence: 0,
      };
      return await logAndUpdatePost(post, flagDecision);
    }
  }

  // Text-only post — use primary provider (Groq or Gemini)
  let decision: ModerationDecision;

  try {
    const text = await provider.reviewText(
      SYSTEM_PROMPT,
      `Please review this post:\n\n"${post.content}"`
    );

    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);

    decision = {
      action: parsed.action as ModerationAction,
      ruleCited: parsed.ruleCited ?? null,
      reasoning: `[${provider.name}] ${parsed.reasoning ?? ""}`,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };

    if (decision.action === "remove" && decision.confidence < 0.7) {
      decision.action = "flag";
      decision.reasoning = `[Downgraded: confidence ${decision.confidence.toFixed(2)} < 0.7] ${decision.reasoning}`;
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[mod/engine] AI review failed:", errMsg);
    decision = {
      action: "flag",
      ruleCited: null,
      reasoning: `AI review failed: ${errMsg.slice(0, 200)}. Flagged for secondary review.`,
      confidence: 0,
    };
  }

  return await logAndUpdatePost(post, decision);
}
