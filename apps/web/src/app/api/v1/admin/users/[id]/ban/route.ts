import { NextRequest, NextResponse } from "next/server";
import { db, accounts, posts, banned_ips } from "@jawwing/db";
import { sql, eq } from "drizzle-orm";
import { isAdmin } from "@jawwing/api/admin";
import { nanoid } from "@jawwing/db";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    // Get all IP hashes from the user's posts
    const userPosts = await db
      .select({ ip_hash: posts.ip_hash })
      .from(posts)
      .where(eq(posts.account_id, id));

    const ipHashes = [...new Set(userPosts.map(p => p.ip_hash).filter(Boolean))] as string[];

    const now = Math.floor(Date.now() / 1000);
    for (const ip_hash of ipHashes) {
      await db
        .insert(banned_ips)
        .values({ id: nanoid(), ip_hash, reason: `Banned by admin (account: ${id})`, banned_at: now })
        .onConflictDoNothing();
    }

    return NextResponse.json({ banned: true, ip_hashes_banned: ipHashes.length });
  } catch (err) {
    console.error("[POST /api/v1/admin/users/[id]/ban]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const userPosts = await db
      .select({ ip_hash: posts.ip_hash })
      .from(posts)
      .where(eq(posts.account_id, id));

    const ipHashes = [...new Set(userPosts.map(p => p.ip_hash).filter(Boolean))] as string[];

    for (const ip_hash of ipHashes) {
      await db.delete(banned_ips).where(eq(banned_ips.ip_hash, ip_hash));
    }

    return NextResponse.json({ banned: false, ip_hashes_unbanned: ipHashes.length });
  } catch (err) {
    console.error("[DELETE /api/v1/admin/users/[id]/ban]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
