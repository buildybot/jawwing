import { NextRequest, NextResponse } from "next/server";
import { db, constitution_versions } from "@jawwing/db";
import { eq } from "drizzle-orm";

// ─── GET /api/v1/constitution/versions/[id] ───────────────────────────────────
// Public — returns full version including content JSON

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const [version] = await db
      .select()
      .from(constitution_versions)
      .where(eq(constitution_versions.id, id));

    if (!version) {
      return NextResponse.json(
        { error: "Constitution version not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Parse content back to object for convenience
    let parsedContent: unknown = null;
    try {
      parsedContent = JSON.parse(version.content);
    } catch {
      parsedContent = version.content;
    }

    return NextResponse.json({ version: { ...version, content: parsedContent } });
  } catch (err) {
    console.error("[GET /api/v1/constitution/versions/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
