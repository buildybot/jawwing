import { NextRequest, NextResponse } from "next/server";
import { db, posts } from "@jawwing/db";
import { eq } from "drizzle-orm";
import { isAdmin } from "@jawwing/api/admin";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;

  try {
    const [updated] = await db
      .update(posts)
      .set({ status: "removed" })
      .where(eq(posts.id, id))
      .returning();

    if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ success: true, post: { id: updated.id, status: updated.status } });
  } catch (err) {
    console.error("[POST /api/v1/admin/posts/[id]/remove]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
