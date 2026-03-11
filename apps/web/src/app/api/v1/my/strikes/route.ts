import { NextRequest, NextResponse } from "next/server";
import { getStrikeCooldown } from "@jawwing/mod/engine";
import { getAccountFromRequest } from "@jawwing/api/accounts";
import { getIpHash } from "@jawwing/api/anonymous";

// ─── GET /api/v1/my/strikes ───────────────────────────────────────────────────
// Returns the current user's moderation strike count and cooldown status.

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const account = await getAccountFromRequest(req);
    const ipHash = getIpHash(req);

    const cooldown = await getStrikeCooldown(ipHash, account?.id);

    return NextResponse.json({
      strikes: cooldown.strikes,
      cooldownSeconds: cooldown.cooldownSeconds,
      cooldownUntil: cooldown.cooldownUntil,
      canPost: cooldown.canPost,
      // Explain the cooldown tiers
      tiers: [
        { strikes: 0, cooldown: "none" },
        { strikes: 1, cooldown: "5 minutes" },
        { strikes: 2, cooldown: "30 minutes" },
        { strikes: 3, cooldown: "2 hours" },
        { strikes: 4, cooldown: "12 hours" },
        { strikes: 5, cooldown: "24 hours" },
      ],
    });
  } catch (err) {
    console.error("[GET /api/v1/my/strikes]", err);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
