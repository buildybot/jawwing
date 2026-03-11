import { createClient } from "@libsql/client";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// 1. Reset ALL votes
console.log("=== Resetting all votes ===");
await client.execute("UPDATE posts SET score = 0, upvotes = 0, downvotes = 0");
await client.execute("DELETE FROM votes");
const r1 = await client.execute("SELECT changes() as c");
console.log("Votes deleted, all post scores reset to 0");

// 2. Count posts that need moderation
const r2 = await client.execute("SELECT COUNT(*) as c FROM posts WHERE status = 'active' AND mod_confidence IS NULL");
const r3 = await client.execute("SELECT COUNT(*) as c FROM posts WHERE status = 'active'");
console.log(`\n=== Post stats ===`);
console.log(`Active posts: ${r3.rows[0].c}`);
console.log(`Unmoderated (null confidence): ${r2.rows[0].c}`);

// 3. Set all active unmoderated posts to "pending" so they go through moderation
const updated = await client.execute("UPDATE posts SET status = 'pending' WHERE status = 'active'");
console.log(`\nSet ${updated.rowsAffected} active posts to 'pending' for re-moderation`);

process.exit(0);
