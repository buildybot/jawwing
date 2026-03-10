import { NextResponse } from "next/server";
import { db, constitution_versions } from "@jawwing/db";
import { desc, eq } from "drizzle-orm";

// ─── GET /api/v1/constitution/versions ───────────────────────────────────────
// Public — returns all constitution versions (summary, no full content)

export async function GET(): Promise<NextResponse> {
  try {
    const versions = await db
      .select({
        id: constitution_versions.id,
        version: constitution_versions.version,
        summary: constitution_versions.summary,
        created_at: constitution_versions.created_at,
        created_by: constitution_versions.created_by,
        status: constitution_versions.status,
      })
      .from(constitution_versions)
      .orderBy(desc(constitution_versions.created_at));

    return NextResponse.json({ versions });
  } catch (err) {
    console.error("[GET /api/v1/constitution/versions]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
