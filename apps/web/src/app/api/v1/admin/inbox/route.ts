import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { isAdmin } from "@jawwing/api/admin";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Admin endpoint to read received emails (for automated signup flows)
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const to = searchParams.get("to");
  const unread = searchParams.get("unread") === "true";
  const limit = parseInt(searchParams.get("limit") || "10", 10);

  let sql = "SELECT * FROM inbound_emails";
  const args: (string | number)[] = [];
  const conditions: string[] = [];

  if (to) {
    conditions.push("to_email LIKE ?");
    args.push(`%${to}%`);
  }
  if (unread) {
    conditions.push("read = 0");
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }
  sql += " ORDER BY received_at DESC LIMIT ?";
  args.push(limit);

  try {
    const result = await db.execute({ sql, args });
    return NextResponse.json({ emails: result.rows });
  } catch (err) {
    // Table might not exist yet
    return NextResponse.json({ emails: [] });
  }
}

// Mark emails as read
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (id) {
    await db.execute({ sql: "UPDATE inbound_emails SET read = 1 WHERE id = ?", args: [id] });
  }
  return NextResponse.json({ ok: true });
}
