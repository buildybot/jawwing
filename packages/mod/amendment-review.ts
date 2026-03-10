import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, constitution_amendments, now } from "@jawwing/db";
import { eq } from "drizzle-orm";
import { CONSTITUTION_RULES } from "./engine";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface AmendmentInput {
  id: string;
  title: string;
  description: string;
  section: string;
  proposed_text: string;
}

interface AmendmentReviewDecision {
  approved: boolean; // true → under_vote, false → rejected
  reasoning: string;
  confidence: number;
}

// ─── System Prompt ─────────────────────────────────────────────────────────────

const AMENDMENT_REVIEW_PROMPT = `You are a constitutional review agent for Jawwing, an anonymous location-based social platform.

Your job is to evaluate user-proposed constitutional amendments for the Jawwing Moderation Constitution.

## Current Constitution Summary
Prohibited sections: ${CONSTITUTION_RULES.prohibited.map((r) => r.name).join(", ")}
Restricted sections: ${CONSTITUTION_RULES.restricted.map((r) => r.name).join(", ")}
Core principles:
${CONSTITUTION_RULES.principles.map((p) => `- ${p}`).join("\n")}

## Your Evaluation Criteria
Approve for community vote if:
- The amendment is reasonable, good-faith, and coherent
- It doesn't fundamentally undermine user safety (e.g., removing CSAM protections)
- It doesn't grant unchecked power to any individual or company
- It's not spam, trolling, or gibberish
- It doesn't conflict with the core principle of transparency

Reject if:
- It's spam, gibberish, or clearly bad faith
- It would remove critical safety protections (CSAM, doxxing, credible threats)
- It's identical or nearly identical to an existing rule
- It would reduce transparency or oversight requirements

## Response Format (JSON only, no markdown):
{
  "approved": true | false,
  "reasoning": "Brief explanation (1-3 sentences)",
  "confidence": 0.0 to 1.0
}`;

// ─── Gemini client ─────────────────────────────────────────────────────────────

function getGenAI(): GoogleGenerativeAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenerativeAI(apiKey);
}

// ─── 7-day deadline ────────────────────────────────────────────────────────────

function sevenDaysFromNow(): number {
  return now() + 7 * 24 * 60 * 60;
}

// ─── reviewAmendment ──────────────────────────────────────────────────────────

export async function reviewAmendment(amendment: AmendmentInput): Promise<void> {
  const genAI = getGenAI();

  let decision: AmendmentReviewDecision;

  if (!genAI) {
    // No API key — auto-approve for voting with note
    decision = {
      approved: true,
      reasoning: "AI review unavailable — amendment forwarded to community vote automatically.",
      confidence: 1,
    };
  } else {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      systemInstruction: AMENDMENT_REVIEW_PROMPT,
    });

    const userMessage = `Please review this proposed amendment:

Title: ${amendment.title}
Section: ${amendment.section}
Description: ${amendment.description}
Proposed Text: ${amendment.proposed_text}`;

    try {
      const result = await model.generateContent(userMessage);
      const text = result.response.text().trim();
      const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
      const parsed = JSON.parse(cleaned);

      decision = {
        approved: Boolean(parsed.approved),
        reasoning: String(parsed.reasoning ?? ""),
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      };

      // Low-confidence rejection → approve for vote instead (give benefit of the doubt)
      if (!decision.approved && decision.confidence < 0.7) {
        decision.approved = true;
        decision.reasoning = `[Low-confidence rejection upgraded to community vote: ${decision.confidence.toFixed(2)}] ${decision.reasoning}`;
      }
    } catch (err) {
      console.error("[amendment-review] AI review failed:", err);
      // On failure, approve for vote rather than silently reject
      decision = {
        approved: true,
        reasoning: "AI review failed — amendment forwarded to community vote for review.",
        confidence: 0,
      };
    }
  }

  // ── Update amendment status in DB ────────────────────────────────────────────
  try {
    if (decision.approved) {
      await db
        .update(constitution_amendments)
        .set({
          status: "under_vote",
          mod_reasoning: decision.reasoning,
          vote_deadline: sevenDaysFromNow(),
        })
        .where(eq(constitution_amendments.id, amendment.id));
    } else {
      await db
        .update(constitution_amendments)
        .set({
          status: "rejected",
          mod_reasoning: decision.reasoning,
          resolved_at: now(),
        })
        .where(eq(constitution_amendments.id, amendment.id));
    }
  } catch (dbErr) {
    console.error("[amendment-review] Failed to update amendment status:", dbErr);
  }
}
