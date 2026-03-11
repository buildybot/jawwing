/**
 * @jawwing/api — Turso-backed rate limiter
 *
 * Replaces in-process Map-based rate limiting which resets on every
 * Vercel cold start and is therefore completely ineffective in serverless.
 *
 * Uses a lightweight raw SQL table (no Drizzle migration needed):
 *
 *   CREATE TABLE IF NOT EXISTS rate_limits (
 *     key          TEXT    NOT NULL,
 *     window_start INTEGER NOT NULL,
 *     count        INTEGER NOT NULL DEFAULT 1,
 *     PRIMARY KEY (key, window_start)
 *   )
 */

import { createClient } from "@libsql/client";

// ─── DB client (lazy, reuses existing env vars) ───────────────────────────────

let _client: ReturnType<typeof createClient> | null = null;

function getClient(): ReturnType<typeof createClient> {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL is required for rate limiting");
    const authToken = process.env.TURSO_AUTH_TOKEN;
    _client = createClient({ url, authToken });
  }
  return _client;
}

// ─── One-time table bootstrap ─────────────────────────────────────────────────

let _tableReady = false;

async function ensureTable(): Promise<void> {
  if (_tableReady) return;
  await getClient().execute(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key          TEXT    NOT NULL,
      window_start INTEGER NOT NULL,
      count        INTEGER NOT NULL DEFAULT 1,
      PRIMARY KEY (key, window_start)
    )
  `);
  _tableReady = true;
}

// ─── checkRateLimit ───────────────────────────────────────────────────────────

/**
 * Sliding-window rate limiter backed by Turso.
 *
 * @param key           Unique identifier (e.g. "post:userId", "email:send-code:addr")
 * @param windowSeconds Window length in seconds
 * @param maxRequests   Max allowed requests within the window
 * @returns { allowed, remaining }
 */
export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<{ allowed: boolean; remaining: number }> {
  await ensureTable();

  const client = getClient();
  const nowSec = Math.floor(Date.now() / 1000);
  const windowStart = nowSec - (nowSec % windowSeconds); // floor to window boundary
  const oldWindowCutoff = windowStart - windowSeconds;   // one extra window for cleanup

  // Upsert: insert or increment count for this key+window
  await client.execute({
    sql: `
      INSERT INTO rate_limits (key, window_start, count)
      VALUES (?, ?, 1)
      ON CONFLICT (key, window_start) DO UPDATE SET count = count + 1
    `,
    args: [key, windowStart],
  });

  // Read current count
  const result = await client.execute({
    sql: `SELECT count FROM rate_limits WHERE key = ? AND window_start = ?`,
    args: [key, windowStart],
  });

  const count = Number(result.rows[0]?.count ?? 1);
  const allowed = count <= maxRequests;
  const remaining = Math.max(0, maxRequests - count);

  // Probabilistic cleanup (10% chance per call) — avoids a separate cron job
  if (Math.random() < 0.1) {
    client
      .execute({
        sql: `DELETE FROM rate_limits WHERE window_start < ?`,
        args: [oldWindowCutoff],
      })
      .catch((err) => console.error("[rateLimit] cleanup error", err));
  }

  return { allowed, remaining };
}
