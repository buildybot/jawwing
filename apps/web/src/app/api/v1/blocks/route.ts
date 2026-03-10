import { NextRequest, NextResponse } from "next/server";
import { db, blocks, nanoid, now } from "@jawwing/db";
import { eq, and, or } from "drizzle-orm";
import { getIpHash } from "@jawwing/api/anonymous";
import { getOptionalAccountId } from "@jawwing/api/optionalAuth";

// ─── GET /api/v1/blocks — list blocked user_ids for current user ──────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const ipHash = getIpHash(req);
    const accountId = await getOptionalAccountId(req);

    const conditions = accountId
      ? or(eq(blocks.blocker_hash, ipHash), eq(blocks.blocker_account_id, accountId))
      : eq(blocks.blocker_hash, ipHash);

    const rows = await db.select({ blocked_user_id: blocks.blocked_user_id })
      .from(blocks)
      .where(conditions);

    return NextResponse.json({ blocked: rows.map((r) => r.blocked_user_id) });
  } catch (err) {
    console.error("[GET /api/v1/blocks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── POST /api/v1/blocks — block a user ──────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ipHash = getIpHash(req);
    const accountId = await getOptionalAccountId(req);

    let body: { blocked_user_id?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const { blocked_user_id } = body;
    if (!blocked_user_id || typeof blocked_user_id !== "string") {
      return NextResponse.json({ error: "blocked_user_id required" }, { status: 400 });
    }

    const id = nanoid();
    const nowTs = now();

    await db.insert(blocks).values({
      id,
      blocker_hash: ipHash,
      blocker_account_id: accountId,
      blocked_user_id,
      created_at: nowTs,
    }).onConflictDoNothing();

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[POST /api/v1/blocks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── DELETE /api/v1/blocks — unblock a user ──────────────────────────────────

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    const ipHash = getIpHash(req);

    let body: { blocked_user_id?: string };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const { blocked_user_id } = body;
    if (!blocked_user_id || typeof blocked_user_id !== "string") {
      return NextResponse.json({ error: "blocked_user_id required" }, { status: 400 });
    }

    await db.delete(blocks).where(
      and(eq(blocks.blocker_hash, ipHash), eq(blocks.blocked_user_id, blocked_user_id))
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/v1/blocks]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
