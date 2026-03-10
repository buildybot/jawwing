import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, mod_actions, posts, nanoid, now } from "@jawwing/db";
import { eq } from "drizzle-orm";
import type { Post } from "@jawwing/db";

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
  technology: {
    currentModel: "gemini-2.5-flash",
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

## Your Decision Rules:
- "approve" — Content is fine. No violations. Default when in doubt.
- "warn" — Minor first violation of a Restricted rule (R-1 through R-5).
- "remove" — Clear violation of Prohibited rules (P-1 through P-5) OR clear repeated/severe Restricted rule violation.
- "flag" — You are genuinely uncertain. Use this when context is ambiguous and you cannot confidently determine if a rule is violated.

## Response Format (JSON only, no markdown):
{
  "action": "approve" | "flag" | "warn" | "remove",
  "ruleCited": "P-1" | "R-2" | null,
  "reasoning": "Brief explanation of your decision",
  "confidence": 0.0 to 1.0
}

Rules:
- NEVER include markdown code fences in your response. Return raw JSON only.
- If confidence is below 0.7 on a removal, use "flag" instead.
- Free expression is the default — approve when uncertain.
- Always cite the most relevant rule if taking action.
- If approving, ruleCited should be null.`;

// ─── Gemini client ────────────────────────────────────────────────────────────

function getGenAI(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

// ─── The system agent ID for AI-initiated mod actions ─────────────────────────
// This should be a real agent user ID in production; use env var.
const AI_AGENT_ID = process.env.MOD_AGENT_ID ?? "agent-system";

// ─── reviewPost ───────────────────────────────────────────────────────────────

export async function reviewPost(post: Post): Promise<ModerationDecision> {
  const genAI = getGenAI();

  // Graceful fallback: if GEMINI_API_KEY is not configured, auto-approve
  if (!genAI) {
    const fallbackDecision: ModerationDecision = {
      action: "approve",
      ruleCited: null,
      reasoning: "Moderation service unavailable. Auto-approved.",
      confidence: 1,
    };
    try {
      await db.insert(mod_actions).values({
        id: nanoid(),
        post_id: post.id,
        agent_id: AI_AGENT_ID,
        action: fallbackDecision.action,
        rule_cited: fallbackDecision.ruleCited,
        reasoning: fallbackDecision.reasoning,
        created_at: now(),
        appealed: false,
        appeal_result: null,
      });
    } catch (dbErr) {
      console.error("[mod/engine] Failed to log fallback mod action:", dbErr);
    }
    return fallbackDecision;
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: SYSTEM_PROMPT,
  });

  const userMessage = `Please review this post:\n\n"${post.content}"`;

  let decision: ModerationDecision;

  try {
    const result = await model.generateContent(userMessage);
    const text = result.response.text().trim();

    // Strip any accidental markdown fences
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned);

    decision = {
      action: parsed.action as ModerationAction,
      ruleCited: parsed.ruleCited ?? null,
      reasoning: parsed.reasoning ?? "",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
    };

    // Safety: downgrade low-confidence removals to flags
    if (decision.action === "remove" && decision.confidence < 0.7) {
      decision.action = "flag";
      decision.reasoning = `[Downgraded from remove: confidence ${decision.confidence.toFixed(2)} < 0.7] ${decision.reasoning}`;
    }
  } catch (err) {
    // On AI failure, flag for human review rather than blocking
    console.error("[mod/engine] AI review failed:", err);
    decision = {
      action: "flag",
      ruleCited: null,
      reasoning: "AI review failed. Flagged for secondary review.",
      confidence: 0,
    };
  }

  // ── Log to mod_actions ───────────────────────────────────────────────────
  try {
    const actionId = nanoid();
    await db.insert(mod_actions).values({
      id: actionId,
      post_id: post.id,
      agent_id: AI_AGENT_ID,
      action: decision.action,
      rule_cited: decision.ruleCited,
      reasoning: decision.reasoning,
      created_at: now(),
      appealed: false,
      appeal_result: null,
    });

    // Update post status if action warrants it
    if (decision.action === "remove") {
      await db
        .update(posts)
        .set({ status: "removed", mod_action_id: actionId })
        .where(eq(posts.id, post.id));
    } else if (decision.action === "flag" || decision.action === "warn") {
      await db
        .update(posts)
        .set({ status: "moderated", mod_action_id: actionId })
        .where(eq(posts.id, post.id));
    }
  } catch (dbErr) {
    console.error("[mod/engine] Failed to log mod action:", dbErr);
  }

  return decision;
}
