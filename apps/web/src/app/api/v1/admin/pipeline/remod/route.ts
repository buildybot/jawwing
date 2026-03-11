import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@jawwing/api/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const admin = await isAdmin(req);
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const postId = body.post_id;
  if (!postId) return NextResponse.json({ error: "post_id required" }, { status: 400 });

  const { createClient } = await import("@libsql/client");
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  // Get the post
  const result = await client.execute({ sql: "SELECT * FROM posts WHERE id = ?", args: [postId] });
  if (result.rows.length === 0) {
    client.close();
    return NextResponse.json({ error: "Post not found" }, { status: 404 });
  }

  const post = result.rows[0];

  // Reset to pending so the mod pipeline picks it up
  await client.execute({
    sql: "UPDATE posts SET status = 'pending', mod_confidence = NULL WHERE id = ?",
    args: [postId],
  });

  // Run moderation inline
  try {
    const { reviewPost } = await import("@jawwing/mod/engine");
    const decision = await reviewPost({
      postId: postId as string,
      content: post.content as string,
      imageUrl: post.image_url as string | undefined,
    });

    // Update post based on decision
    const statusMap: Record<string, string> = {
      approve: "active",
      remove: "removed",
      flag: "flagged",
      warn: "flagged",
    };
    const newStatus = statusMap[decision.action] ?? "flagged";

    await client.execute({
      sql: "UPDATE posts SET status = ?, mod_confidence = ? WHERE id = ?",
      args: [newStatus, decision.confidence, postId],
    });

    client.close();
    return NextResponse.json({ success: true, decision });
  } catch (err) {
    // If mod fails, mark as mod_failed
    await client.execute({
      sql: "UPDATE posts SET status = 'mod_failed' WHERE id = ?",
      args: [postId],
    });
    client.close();
    return NextResponse.json({ error: "Moderation failed", detail: String(err) }, { status: 500 });
  }
}
