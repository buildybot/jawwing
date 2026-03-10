/**
 * @jawwing/api — Ban system (v1: in-memory)
 *
 * Stores banned IP hashes in a Set.
 * TODO: move to `banned_ips` DB table in v2.
 */

// ─── In-memory store ──────────────────────────────────────────────────────────

const bannedHashes = new Set<string>();

// ─── Public API ───────────────────────────────────────────────────────────────

/** Check if an IP hash is currently banned. */
export function isBanned(ipHash: string): boolean {
  if (!ipHash || ipHash === "unknown") return false;
  return bannedHashes.has(ipHash);
}

/** Ban an IP hash (in-memory; persists until process restart). */
export function banIp(ipHash: string): void {
  if (ipHash && ipHash !== "unknown") {
    bannedHashes.add(ipHash);
  }
}

/** Unban an IP hash. */
export function unbanIp(ipHash: string): void {
  bannedHashes.delete(ipHash);
}

/** List all banned IP hashes (for admin/debugging). */
export function listBanned(): string[] {
  return [...bannedHashes];
}
