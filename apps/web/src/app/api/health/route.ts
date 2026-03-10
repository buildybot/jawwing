import { NextResponse } from "next/server";
import { db } from "@jawwing/db";
import { sql } from "drizzle-orm";

// ─── GET /api/health ──────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  let dbOk = false;
  try {
    await db.run(sql`SELECT 1`);
    dbOk = true;
  } catch {
    // db unreachable — still return 200 but surface in body
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    db: dbOk ? "ok" : "unreachable",
  });
}
