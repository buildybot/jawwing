import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

await c.execute(`CREATE TABLE IF NOT EXISTS mod_strikes (
  id TEXT PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  account_id TEXT,
  post_id TEXT NOT NULL,
  rule_cited TEXT,
  created_at INTEGER NOT NULL
)`);
await c.execute("CREATE INDEX IF NOT EXISTS idx_strikes_ip ON mod_strikes(ip_hash)");
await c.execute("CREATE INDEX IF NOT EXISTS idx_strikes_account ON mod_strikes(account_id)");
await c.execute("CREATE INDEX IF NOT EXISTS idx_strikes_created ON mod_strikes(created_at)");
console.log("mod_strikes table created");
process.exit(0);
