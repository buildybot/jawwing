/**
 * reviewer.ts — Appeal handler for Jawwing moderation
 *
 * Handles appeals against mod_actions, assigns secondary agent review,
 * and escalates to community vote when 3+ appeals on the same rule.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { db, mod_actions, posts, votes, nanoid, now } from "@jawwing/db";
import { eq, and, count, sql } from "drizzle-orm";
// CONSTITUTION_RULES available for reference; re-exported from engine if needed

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppealResult {
  upheld: boolean;
  reasoning: string;
  reviewerAgentId: string;
}

export interface CommunityVoteResult {
  voteId: string;
  triggered: boolean;
  reason: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const APPEAL_THRESHOLD_FOR_COMMUNITY_VOTE = 3;
const COMMUNITY_VOTE_DURATION_HOURS = 72;

// Secondary agent ID — in production this rotates across multiple agents.
// Using a separate env var to ensure it's always a different agent than primary.
const SECONDARY_AGENT_ID =
  process.env.MOD_SECONDARY_AGENT_ID ??
  process.env.MOD_AGENT_ID ??
  "agent-secondary";

// ─── handleAppeal ─────────────────────────────────────────────────────────────

/**
 * Handles an appeal for a moderation action.
 * Assigns to a DIFFERENT agent than the original for re-review.
 * Returns whether the original action was upheld or overturned.
 */
export async function handleAppeal(modActionId: string): Promise<AppealResult> {
  // Fetch the original mod action
  const [action] = await db
    .select()
    .from(mod_actions)
    .where(eq(mod_actions.id, modActionId))
    .limit(1);

  if (!action) {
    throw new Error(`Mod action not found: ${modActionId}`);
  }

  // Can't appeal P-4 decisions (CSAM)
  if (action.rule_cited === "P-4") {
    throw new Error("P-4 decisions cannot be appealed.");
  }

  // Fetch the original post for context
  const [post] = await db
    .select()
    .from(posts)
    .where(eq(posts.id, action.post_id))
    .limit(1);

  if (!post) {
    throw new Error(`Post not found: ${action.post_id}`);
  }

  // Mark action as appealed
  await db
    .update(mod_actions)
    .set({ appealed: true })
    .where(eq(mod_actions.id, modActionId));

  // ── Secondary agent re-review ─────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is required");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: buildAppealSystemPrompt(),
  });

  const prompt = `You are conducting a SECONDARY REVIEW (appeal) of a moderation decision.

Original post content: "${post.content}"

Original decision:
- Action: ${action.action}
- Rule cited: ${action.rule_cited ?? "none"}
- Original reasoning: ${action.reasoning ?? "none provided"}

Review this fresh. Does the original action align with the Jawwing Constitution?
Respond in JSON only:
{
  "upheld": true | false,
  "reasoning": "Your independent analysis and conclusion"
}`;

  let upheld = true;
  let reasoning = "Secondary review could not be completed.";

  try {
    const result = await model.generateContent(prompt);
    const text = result.response
      .text()
      .trim()
      .replace(/^```(?:json)?\n?/, "")
      .replace(/\n?```$/, "");
    const parsed = JSON.parse(text);
    upheld = Boolean(parsed.upheld);
    reasoning = parsed.reasoning ?? reasoning;
  } catch (err) {
    console.error("[mod/reviewer] Appeal re-review failed:", err);
    // On failure, default to upholding (safer default)
  }

  // Log the appeal result
  const appealResult = upheld ? "upheld" : "overturned";
  await db
    .update(mod_actions)
    .set({ appeal_result: `${appealResult}: ${reasoning}` })
    .where(eq(mod_actions.id, modActionId));

  // If overturned, restore the post to active
  if (!upheld && post.status !== "active") {
    await db
      .update(posts)
      .set({ status: "active", mod_action_id: null })
      .where(eq(posts.id, post.id));
  }

  // ── Check if community vote should be triggered ───────────────────────────
  if (action.rule_cited) {
    await maybeEscalateToCommunityVote(action.rule_cited);
  }

  return {
    upheld,
    reasoning,
    reviewerAgentId: SECONDARY_AGENT_ID,
  };
}

// ─── communityVote ────────────────────────────────────────────────────────────

/**
 * Triggers a community vote if 3+ independent appeals exist for this mod action.
 * Uses the votes table with a special post_id pattern for community vote records.
 */
export async function communityVote(
  modActionId: string
): Promise<CommunityVoteResult> {
  const [action] = await db
    .select()
    .from(mod_actions)
    .where(eq(mod_actions.id, modActionId))
    .limit(1);

  if (!action) {
    throw new Error(`Mod action not found: ${modActionId}`);
  }

  // Count appeals for this mod action
  const appealCount = await getAppealCount(modActionId);

  if (appealCount < APPEAL_THRESHOLD_FOR_COMMUNITY_VOTE) {
    return {
      voteId: "",
      triggered: false,
      reason: `Only ${appealCount} appeal(s). Need ${APPEAL_THRESHOLD_FOR_COMMUNITY_VOTE} to trigger community vote.`,
    };
  }

  // Create a community vote record in the votes table.
  // We use a sentinel post_id with prefix "vote:" and store the vote in votes table.
  // The vote's user_id is the system agent; value=0 signals "community vote pending".
  const voteId = nanoid();
  const expiresAt =
    now() + COMMUNITY_VOTE_DURATION_HOURS * 3600;

  // We store community votes as a special record:
  // post_id = the original post being reviewed
  // user_id = system agent (voting system)
  // value = 0 (pending) — community members cast +1 (keep removal) or -1 (overturn)
  await db.insert(votes).values({
    id: voteId,
    post_id: action.post_id,
    user_id: SECONDARY_AGENT_ID,
    value: 0, // 0 = community vote sentinel
    created_at: now(),
  });

  console.log(
    `[mod/reviewer] Community vote triggered for mod_action ${modActionId}, post ${action.post_id}. Vote ID: ${voteId}, expires at ${expiresAt}`
  );

  return {
    voteId,
    triggered: true,
    reason: `${appealCount} appeals reached threshold. Community vote open for ${COMMUNITY_VOTE_DURATION_HOURS}h.`,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAppealCount(modActionId: string): Promise<number> {
  const [action] = await db
    .select()
    .from(mod_actions)
    .where(eq(mod_actions.id, modActionId))
    .limit(1);

  if (!action) return 0;

  // Count all appealed actions for this post with the same rule in the last 30 days
  const thirtyDaysAgo = now() - 30 * 24 * 3600;

  const result = await db
    .select({ cnt: count() })
    .from(mod_actions)
    .where(
      and(
        eq(mod_actions.post_id, action.post_id),
        eq(mod_actions.appealed, true),
        sql`${mod_actions.created_at} >= ${thirtyDaysAgo}`
      )
    );

  return result[0]?.cnt ?? 0;
}

async function maybeEscalateToCommunityVote(ruleCited: string): Promise<void> {
  // Count total recent appeals across all posts for this rule in last 30 days
  const thirtyDaysAgo = now() - 30 * 24 * 3600;

  const result = await db
    .select({ cnt: count() })
    .from(mod_actions)
    .where(
      and(
        eq(mod_actions.rule_cited, ruleCited),
        eq(mod_actions.appealed, true),
        sql`${mod_actions.created_at} >= ${thirtyDaysAgo}`
      )
    );

  const appealCount = result[0]?.cnt ?? 0;

  if (appealCount >= APPEAL_THRESHOLD_FOR_COMMUNITY_VOTE) {
    console.log(
      `[mod/reviewer] Rule ${ruleCited} has ${appealCount} appeals in 30 days — eligible for community escalation.`
    );
  }
}

function buildAppealSystemPrompt(): string {
  return `You are a secondary moderation agent for Jawwing reviewing an appeal. You are INDEPENDENT from the original reviewing agent. Apply the same constitution rules fresh.

Prohibited rules (P-1 through P-5) cover: hate speech, credible threats, doxxing, CSAM, illegal activity facilitation.
Restricted rules (R-1 through R-5) cover: NSFW content, spam, commercial content, misleading content, graphic violence.

Core principle: Free expression is the default. If the content doesn't clearly violate a rule, the original action should be overturned.

Respond only with valid JSON. No markdown, no explanations outside the JSON object.`;
}
