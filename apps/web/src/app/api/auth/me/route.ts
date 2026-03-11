import { NextRequest, NextResponse } from "next/server";
import { getAccountFromRequest, decryptEmail } from "@jawwing/api/accounts";

/**
 * GET /api/auth/me
 * Returns current account info from JWT cookie or Bearer token.
 */
export async function GET(req: NextRequest) {
  try {
    const account = await getAccountFromRequest(req);
    if (!account) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Decrypt email for display (masked on client side)
    let email: string | null = null;
    try {
      if (account.email_encrypted) {
        email = decryptEmail(account.email_encrypted);
      }
    } catch { /* can't decrypt — that's fine */ }

    return NextResponse.json({
      id: account.id,
      email,
      isAdmin: account.is_admin === 1,
      createdAt: account.created_at,
    });
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }
}
