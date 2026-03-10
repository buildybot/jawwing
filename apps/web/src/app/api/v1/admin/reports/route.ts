import { NextRequest, NextResponse } from "next/server";
import { db, reports, posts } from "@jawwing/db";
import { sql, eq, desc } from "drizzle-orm";
import { isAdmin } from "@jawwing/api/admin";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const rows = await db.execute(sql`
      SELECT 
        r.id, r.post_id, r.reply_id, r.reporter_hash, r.reason, r.created_at, r.resolved,
        substr(p.content, 1, 200) as post_content, p.status as post_status, p.score
      FROM reports r
      LEFT JOIN posts p ON p.id = r.post_id
      WHERE r.resolved = 0
      ORDER BY r.created_at DESC
      LIMIT 100
    `);

    return NextResponse.json({ reports: rows.rows });
  } catch (err) {
    console.error("[GET /api/v1/admin/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const { report_id } = await req.json();
    if (!report_id) return NextResponse.json({ error: "report_id required" }, { status: 400 });

    await db.update(reports).set({ resolved: true }).where(eq(reports.id, report_id));
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[POST /api/v1/admin/reports]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
