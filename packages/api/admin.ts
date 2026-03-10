/**
 * Admin authentication middleware
 * Supports both JWT-based admin accounts and x-admin-key header
 */

import { getAccountFromRequest } from "./accounts";
import type { Account } from "@jawwing/db";

interface RequestLike {
  cookies: { get(name: string): { value: string } | undefined };
  headers: { get(name: string): string | null };
}

/**
 * Check if request is from an admin.
 * Returns the account if admin (JWT), true if x-admin-key, null if not authorized.
 */
export async function isAdmin(req: RequestLike): Promise<Account | boolean | null> {
  // 1. Check x-admin-key header
  const adminKey = req.headers.get("x-admin-key");
  if (adminKey && process.env.ADMIN_API_KEY && adminKey === process.env.ADMIN_API_KEY.trim()) {
    return true;
  }

  // 2. Check JWT-based admin account
  const account = await getAccountFromRequest(req);
  if (account && (account as Account & { is_admin?: number }).is_admin === 1) {
    return account;
  }

  return null;
}
