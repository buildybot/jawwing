import { NextRequest, NextResponse } from "next/server";
import { db, posts } from "@jawwing/db";
import { isNull, eq } from "drizzle-orm";
import { reviewPost } from "@jawwing/mod/engine";
import { isAdmin } from "@jawwing/api/admin";

// ─── POST /api/v1/admin/moderate ──────────────────────────────────────────────
// Body: { "post_id": "..." } — moderate a single post
// Body: { "all": true }      — moderate all posts where mod_confidence IS NULL

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAdmin(req)) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    let body: { post_id?: string; all?: boolean };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body", code: "INVALID_BODY" }, { status: 400 });
    }

    if (body.all === true) {
      // Fetch all posts with no mod_confidence
      const unmoderated = await db
        .select()
        .from(posts)
        .where(isNull(posts.mod_confidence));

      const total = unmoderated.length;
      let moderated = 0;

      for (const post of unmoderated) {
        try {
          await reviewPost(post);
          moderated++;
        } catch (err) {
          console.error(`[admin/moderate] Failed to moderate post ${post.id}:`, err);
        }
        // 500ms delay between reviews to avoid rate limits
        await new Promise((r) => setTimeout(r, 500));
      }

      return NextResponse.json({ moderated, total });
    }

    if (body.post_id) {
      const [post] = await db
        .select()
        .from(posts)
        .where(eq(posts.id, body.post_id))
        .limit(1);

      if (!post) {
        return NextResponse.json({ error: "Post not found", code: "NOT_FOUND" }, { status: 404 });
      }

      const decision = await reviewPost(post);
      return NextResponse.json({ moderated: 1, total: 1, decision });
    }

    return NextResponse.json(
      { error: 'Provide { "post_id": "..." } or { "all": true }', code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  } catch (err) {
    console.error("[POST /api/v1/admin/moderate]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
