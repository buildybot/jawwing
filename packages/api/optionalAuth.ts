/**
 * @jawwing/api — Optional auth helper
 *
 * Extracts account_id from JWT Bearer token if present.
 * Never throws — returns null if token is missing or invalid.
 * Use this for features that work anonymously but get richer when logged in.
 */

import { getAccountFromRequest } from "./accounts";
import { db, accounts } from "@jawwing/db";
import { eq } from "drizzle-orm";

interface RequestLike {
  cookies: { get(name: string): { value: string } | undefined };
  headers: { get(name: string): string | null };
}

/**
 * Returns the account_id of the authenticated user, or null if not logged in.
 * Supports both cookie (web) and Authorization: Bearer <token> (mobile).
 * Fire-and-forget: updates last_seen_at when account is found.
 */
export async function getOptionalAccountId(req: RequestLike): Promise<string | null> {
  const account = await getAccountFromRequest(req);
  if (account?.id) {
    // Fire-and-forget: track last active time
    const nowTs = Math.floor(Date.now() / 1000);
    db.update(accounts).set({ last_seen_at: nowTs }).where(eq(accounts.id, account.id)).catch(() => {/* best-effort */});
  }
  return account?.id ?? null;
}
