import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
async function check() {
  const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  const r = await c.execute("SELECT status, COUNT(*) as cnt FROM posts GROUP BY status");
  console.log("Status:", r.rows);
  const p = await c.execute("SELECT id, status, mod_retries, created_at FROM posts WHERE status = 'pending'");
  console.log("Pending:", p.rows);
}
check();