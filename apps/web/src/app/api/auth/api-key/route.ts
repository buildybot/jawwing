import { NextResponse } from "next/server";
import { generateApiKey } from "@jawwing/api/auth";
import { withAuth, type AuthenticatedRequest } from "@jawwing/api/middleware";

// ─── POST /api/auth/api-key ───────────────────────────────────────────────────

async function handler(req: AuthenticatedRequest): Promise<NextResponse> {
  try {
    const { user } = req;

    let body: { territory_id?: unknown } = {};
    try {
      body = await req.json();
    } catch {
      // body is optional
    }

    const territoryId =
      body.territory_id && typeof body.territory_id === "string"
        ? body.territory_id
        : undefined;

    const result = await generateApiKey(user.id, territoryId);

    // Raw key shown once — caller must store it securely
    return NextResponse.json({ key: result.key, id: result.id }, { status: 201 });
  } catch (err) {
    console.error("[POST /api/auth/api-key]", err);
    return NextResponse.json({ error: "Internal server error", code: "INTERNAL_ERROR" }, { status: 500 });
  }
}

export const POST = withAuth(handler as Parameters<typeof withAuth>[0]);
