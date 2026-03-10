import { NextRequest, NextResponse } from "next/server";
import { getAccountFromRequest, getPostsForAccount } from "@jawwing/api/accounts";

// ─── GET /api/v1/my/posts ─────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const account = await getAccountFromRequest(req);
    if (!account) {
      return NextResponse.json({ error: "Invalid session", code: "UNAUTHORIZED" }, { status: 401 });
    }
    const userPosts = await getPostsForAccount(account);

    // Strip any private fields — posts are already anonymous, just return them
    return NextResponse.json({
      posts: userPosts,
      meta: {
        count: userPosts.length,
        totalScore: userPosts.reduce((s, p) => s + p.score, 0),
        avgScore: userPosts.length > 0
          ? Math.round((userPosts.reduce((s, p) => s + p.score, 0) / userPosts.length) * 10) / 10
          : 0,
      },
    });
  } catch (err) {
    console.error("[GET /api/v1/my/posts]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
