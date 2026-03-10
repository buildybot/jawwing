import { NextRequest, NextResponse } from "next/server";
import { db, accounts, posts } from "@jawwing/db";
import { sql, eq, desc } from "drizzle-orm";
import { isAdmin } from "@jawwing/api/admin";
import { decryptEmail } from "@jawwing/api/accounts";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const account = await db.query.accounts.findFirst({
      where: eq(accounts.id, id),
    });

    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let email = "encrypted";
    try {
      if (account.email_encrypted) {
        email = decryptEmail(account.email_encrypted);
      }
    } catch {}

    const sessionIds: string[] = (() => {
      try { return JSON.parse(account.session_ids ?? "[]"); } catch { return []; }
    })();

    const userPosts = await db
      .select()
      .from(posts)
      .where(eq(posts.account_id, id))
      .orderBy(desc(posts.created_at))
      .limit(50);

    return NextResponse.json({
      id: account.id,
      email,
      email_hash: account.email_hash,
      is_admin: (account as typeof account & { is_admin?: number }).is_admin ?? 0,
      created_at: account.created_at,
      last_seen_at: account.last_seen_at,
      session_ids: sessionIds,
      session_count: sessionIds.length,
      posts: userPosts,
      post_count: userPosts.length,
      notification_prefs: account.notification_prefs,
    });
  } catch (err) {
    console.error("[GET /api/v1/admin/users/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
