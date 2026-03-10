import { NextRequest, NextResponse } from "next/server";
import { db, constitution_amendments, nanoid, now } from "@jawwing/db";
import { withAuth, type AuthenticatedRequest } from "@jawwing/api/middleware";
import { desc, eq } from "drizzle-orm";
import { reviewAmendment } from "@jawwing/mod/amendment-review";

// ─── GET /api/v1/constitution/amendments ─────────────────────────────────────
// Public — list amendments with optional ?status= filter

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get("status") as
      | "pending_review"
      | "under_vote"
      | "accepted"
      | "rejected"
      | null;

    const valid = ["pending_review", "under_vote", "accepted", "rejected"];
    if (statusFilter && !valid.includes(statusFilter)) {
      return NextResponse.json(
        { error: "Invalid status filter", code: "INVALID_PARAMS" },
        { status: 400 }
      );
    }

    const query = db
      .select({
        id: constitution_amendments.id,
        proposer_id: constitution_amendments.proposer_id,
        title: constitution_amendments.title,
        description: constitution_amendments.description,
        section: constitution_amendments.section,
        proposed_text: constitution_amendments.proposed_text,
        status: constitution_amendments.status,
        mod_reasoning: constitution_amendments.mod_reasoning,
        votes_for: constitution_amendments.votes_for,
        votes_against: constitution_amendments.votes_against,
        vote_deadline: constitution_amendments.vote_deadline,
        created_at: constitution_amendments.created_at,
        resolved_at: constitution_amendments.resolved_at,
      })
      .from(constitution_amendments)
      .orderBy(desc(constitution_amendments.created_at));

    const amendments = statusFilter
      ? await query.where(eq(constitution_amendments.status, statusFilter))
      : await query;

    return NextResponse.json({ amendments });
  } catch (err) {
    console.error("[GET /api/v1/constitution/amendments]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// ─── POST /api/v1/constitution/amendments ────────────────────────────────────
// Auth required — submit an amendment proposal

async function submitAmendment(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const { user } = req;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", code: "INVALID_BODY" },
        { status: 400 }
      );
    }

    const b = body as Record<string, unknown>;
    const title = typeof b.title === "string" ? b.title.trim() : "";
    const description = typeof b.description === "string" ? b.description.trim() : "";
    const section = typeof b.section === "string" ? b.section.trim() : "";
    const proposed_text = typeof b.proposed_text === "string" ? b.proposed_text.trim() : "";

    if (!title || title.length < 5 || title.length > 200) {
      return NextResponse.json(
        { error: "title is required (5–200 chars)", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    if (!description || description.length < 20) {
      return NextResponse.json(
        { error: "description is required (min 20 chars)", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    const validSections = ["prohibited", "restricted", "principles", "process", "amendments", "other"];
    if (!section || !validSections.includes(section)) {
      return NextResponse.json(
        { error: `section must be one of: ${validSections.join(", ")}`, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    if (!proposed_text || proposed_text.length < 10) {
      return NextResponse.json(
        { error: "proposed_text is required (min 10 chars)", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const id = nanoid();
    const created_at = now();

    // Insert as pending_review first
    await db.insert(constitution_amendments).values({
      id,
      proposer_id: user.id,
      title,
      description,
      section,
      proposed_text,
      status: "pending_review",
      mod_review_id: null,
      mod_reasoning: null,
      votes_for: 0,
      votes_against: 0,
      vote_deadline: null,
      created_at,
      resolved_at: null,
    });

    // Fire async AI review — does not block response
    reviewAmendment({ id, title, description, section, proposed_text }).catch((err) => {
      console.error("[constitution/amendments] AI review failed:", err);
    });

    const [amendment] = await db
      .select()
      .from(constitution_amendments)
      .where(eq(constitution_amendments.id, id));

    return NextResponse.json({ amendment }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/v1/constitution/amendments]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export const POST = withAuth(submitAmendment as Parameters<typeof withAuth>[0]);
