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
    env: {
      hasTursoUrl: !!process.env.TURSO_DATABASE_URL,
      hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
      tursoUrlPrefix: process.env.TURSO_DATABASE_URL?.substring(0, 20) || "missing",
    },
  });
}
