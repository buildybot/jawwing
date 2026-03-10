import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";

// ─── GET /api/health ──────────────────────────────────────────────────────────

export async function GET(): Promise<NextResponse> {
  let dbOk = false;
  let dbError = "";
  try {
    const { db } = await import("@jawwing/db");
    await db.run(sql`SELECT 1`);
    dbOk = true;
  } catch (e: unknown) {
    dbError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    version: "0.1.0",
    db: dbOk ? "ok" : "unreachable",
    ...(dbError ? { dbError } : {}),
  });
}
