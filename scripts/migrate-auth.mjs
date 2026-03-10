/**
 * migrate-auth.mjs
 * Run: source .env.local && node scripts/migrate-auth.mjs
 *
 * Adds: saved_posts table, notifications table,
 *       account_id to votes, push_token to accounts
 */

import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("❌  TURSO_DATABASE_URL is not set. Did you source .env.local?");
  process.exit(1);
}

const client = createClient({ url, authToken });

const migrations = [
  {
    name: "saved_posts table",
    sql: `
      CREATE TABLE IF NOT EXISTS saved_posts (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        post_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(account_id, post_id)
      )
    `,
  },
  {
    name: "idx_saved_account index",
    sql: `CREATE INDEX IF NOT EXISTS idx_saved_account ON saved_posts(account_id)`,
  },
  {
    name: "notifications table",
    sql: `
      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        type TEXT NOT NULL,
        post_id TEXT,
        reply_id TEXT,
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL
      )
    `,
  },
  {
    name: "idx_notif_account index",
    sql: `CREATE INDEX IF NOT EXISTS idx_notif_account ON notifications(account_id)`,
  },
  {
    name: "idx_notif_unread index",
    sql: `CREATE INDEX IF NOT EXISTS idx_notif_unread ON notifications(account_id, read)`,
  },
  {
    name: "votes.account_id column",
    sql: `ALTER TABLE votes ADD COLUMN account_id TEXT`,
  },
  {
    name: "accounts.push_token column",
    sql: `ALTER TABLE accounts ADD COLUMN push_token TEXT`,
  },
];

let ok = 0;
let skipped = 0;

for (const m of migrations) {
  try {
    await client.execute(m.sql);
    console.log(`✅  ${m.name}`);
    ok++;
  } catch (err) {
    // SQLite reports "duplicate column" or "table already exists" as errors
    if (
      err.message?.includes("already exists") ||
      err.message?.includes("duplicate column")
    ) {
      console.log(`⏭️   ${m.name} (already exists — skipped)`);
      skipped++;
    } else {
      console.error(`❌  ${m.name}: ${err.message}`);
      process.exit(1);
    }
  }
}

console.log(`\nDone. ${ok} applied, ${skipped} skipped.`);
