/**
 * @jawwing/api — Optional auth helper
 *
 * Extracts account_id from JWT Bearer token if present.
 * Never throws — returns null if token is missing or invalid.
 * Use this for features that work anonymously but get richer when logged in.
 */

import { getAccountFromRequest } from "./accounts";

interface RequestLike {
  cookies: { get(name: string): { value: string } | undefined };
  headers: { get(name: string): string | null };
}

/**
 * Returns the account_id of the authenticated user, or null if not logged in.
 * Supports both cookie (web) and Authorization: Bearer <token> (mobile).
 */
export async function getOptionalAccountId(req: RequestLike): Promise<string | null> {
  const account = await getAccountFromRequest(req);
  return account?.id ?? null;
}
