/**
 * migrate.ts
 * Run Drizzle migrations against the Turso/libSQL database.
 *
 * Usage:
 *   npx tsx migrate.ts
 *   TURSO_DATABASE_URL=... TURSO_AUTH_TOKEN=... npx tsx migrate.ts
 */

import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import path from "path";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    console.error("❌  TURSO_DATABASE_URL is not set");
    process.exit(1);
  }

  console.log(`🔗  Connecting to: ${url}`);

  const client = createClient({ url, authToken });
  const db = drizzle(client);

  const migrationsFolder = path.resolve(__dirname, "migrations");

  console.log(`📂  Running migrations from: ${migrationsFolder}`);

  try {
    await migrate(db, { migrationsFolder });
    console.log("✅  Migrations complete");
  } catch (err) {
    console.error("❌  Migration failed:", err);
    process.exit(1);
  } finally {
    client.close();
  }
}

main();
