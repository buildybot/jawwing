import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Reset mod_confidence on all pending posts so admin/moderate picks them up
const r = await client.execute("UPDATE posts SET mod_confidence = NULL WHERE status = 'pending'");
console.log(`Reset mod_confidence on ${r.rowsAffected} pending posts`);

// Now call admin moderate endpoint in batches
const BASE = "https://www.jawwing.com";
const KEY = "***REDACTED_ADMIN_KEY***";

let total = 0;
for (let batch = 0; batch < 20; batch++) {
  const res = await fetch(`${BASE}/api/v1/admin/moderate`, {
    method: "POST",
    headers: { "x-admin-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ all: true }),
  });
  const data = await res.json();
  const count = data.moderated ?? 0;
  total += count;
  console.log(`Batch ${batch + 1}: moderated ${count} posts (total: ${total})`);
  if (count === 0) break;
  // Small delay to not hammer the API
  await new Promise(r => setTimeout(r, 1000));
}

// Check final stats
const stats = await client.execute("SELECT status, COUNT(*) as c FROM posts GROUP BY status");
console.log("\n=== Final post stats ===");
for (const row of stats.rows) {
  console.log(`${row.status}: ${row.c}`);
}

process.exit(0);
