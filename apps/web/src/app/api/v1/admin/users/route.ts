import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { isAdmin } from "@jawwing/api/admin";
import { decryptEmail } from "@jawwing/api/accounts";

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

function maskEmail(email: string): string {
  try {
    const [local, domain] = email.split("@");
    if (!local || !domain) return "***@***";
    return local[0] + "***" + (local.length > 1 ? local[local.length - 1] : "") + "@" + domain;
  } catch { return "***@***"; }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 200);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  try {
    const c = getClient();
    const rows = await c.execute({
      sql: `SELECT a.id, a.email_encrypted, a.email_hash, a.is_admin, a.created_at, a.last_seen_at, a.session_ids,
            (SELECT COUNT(*) FROM posts WHERE account_id = a.id) as post_count
            FROM accounts a ORDER BY a.last_seen_at DESC LIMIT ? OFFSET ?`,
      args: [limit, offset],
    });

    const users = rows.rows.map((row) => {
      let emailMasked = "***@***";
      try {
        if (row.email_encrypted) emailMasked = maskEmail(decryptEmail(String(row.email_encrypted)));
      } catch {}

      let sessionCount = 0;
      try { sessionCount = JSON.parse(String(row.session_ids ?? "[]")).length; } catch {}

      return {
        id: row.id,
        email: emailMasked,
        is_admin: Number(row.is_admin),
        created_at: Number(row.created_at),
        last_seen_at: row.last_seen_at ? Number(row.last_seen_at) : null,
        post_count: Number(row.post_count ?? 0),
        session_count: sessionCount,
      };
    });

    const total = await c.execute("SELECT COUNT(*) as count FROM accounts");

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
