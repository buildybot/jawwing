import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/auth/me
 * Validates the Bearer token and returns current user info.
 * The client-side auth context can call this to re-validate a stored token.
 *
 * For now, we decode the JWT client-side for expiry. This endpoint
 * provides server-side validation when needed.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authHeader.slice(7);

  try {
    // Dynamically import server-only auth so this only runs on server
    const { validateSession } = await import("@jawwing/api/auth");
    const payload = validateSession(token);

    return NextResponse.json({
      user: {
        id: payload.sub,
        type: payload.type,
      },
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
