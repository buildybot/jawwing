import { NextRequest, NextResponse } from "next/server";
import { db, accounts, posts } from "@jawwing/db";
import { sql, desc, like, or, eq } from "drizzle-orm";
import { isAdmin } from "@jawwing/api/admin";
import { decryptEmail } from "@jawwing/api/accounts";

function maskEmail(email: string): string {
  try {
    const [local, domain] = email.split("@");
    if (!local || !domain) return "***@***";
    const masked = local[0] + "***" + (local.length > 1 ? local[local.length - 1] : "") + "@" + domain;
    return masked;
  } catch {
    return "***@***";
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");
  const search = searchParams.get("search") ?? "";

  try {
    const rows = await db.execute(sql`
      SELECT 
        a.id,
        a.email_encrypted,
        a.email_hash,
        a.is_admin,
        a.created_at,
        a.last_seen_at,
        a.session_ids,
        COUNT(p.id) as post_count
      FROM accounts a
      LEFT JOIN posts p ON p.account_id = a.id
      GROUP BY a.id
      ORDER BY a.last_seen_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    const users = rows.rows.map((row: Record<string, unknown>) => {
      let email = "encrypted";
      let emailMasked = "***@***";
      try {
        if (row.email_encrypted) {
          email = decryptEmail(row.email_encrypted as string);
          emailMasked = maskEmail(email);
        }
      } catch {}

      const sessionIds: string[] = (() => {
        try { return JSON.parse((row.session_ids as string) ?? "[]"); } catch { return []; }
      })();

      // Filter by search
      if (search && !email.toLowerCase().includes(search.toLowerCase())) {
        return null;
      }

      return {
        id: row.id,
        email: emailMasked,
        is_admin: row.is_admin,
        created_at: row.created_at,
        last_seen_at: row.last_seen_at,
        post_count: Number(row.post_count ?? 0),
        session_count: sessionIds.length,
      };
    }).filter(Boolean);

    const total = await db.execute(sql`SELECT COUNT(*) as count FROM accounts`);

    return NextResponse.json({
      users,
      total: Number(total.rows[0]?.count ?? 0),
      limit,
      offset,
    });
  } catch (err) {
    console.error("[GET /api/v1/admin/users]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
