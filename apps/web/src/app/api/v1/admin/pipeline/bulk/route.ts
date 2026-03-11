export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@libsql/client";
import { isAdmin } from "@jawwing/api/admin";

function getClient() {
  return createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await req.json();
    const { action } = body;
    const c = getClient();

    if (action === "approve_flagged") {
      const result = await c.execute(`UPDATE posts SET status = 'active' WHERE status = 'flagged'`);
      return NextResponse.json({ ok: true, action, rows_affected: result.rowsAffected });
    }

    if (action === "remod_failed") {
      const result = await c.execute(`UPDATE posts SET status = 'pending' WHERE status = 'mod_failed'`);
      return NextResponse.json({ ok: true, action, rows_affected: result.rowsAffected });
    }

    return NextResponse.json({ error: "Unknown action. Use approve_flagged or remod_failed." }, { status: 400 });
  } catch (err) {
    console.error("[POST /api/v1/admin/pipeline/bulk]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
