import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// ─── Client ───────────────────────────────────────────────────────────────────

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  throw new Error("TURSO_DATABASE_URL is required");
}

const client = createClient({
  url,
  authToken,
});

// ─── DB instance ──────────────────────────────────────────────────────────────

export const db = drizzle(client, { schema });

// ─── Re-export tables ─────────────────────────────────────────────────────────

export {
  users,
  posts,
  votes,
  replies,
  mod_actions,
  territories,
  api_keys,
  reports,
} from "./schema";

// ─── Re-export types ──────────────────────────────────────────────────────────

export type {
  User,
  NewUser,
  Post,
  NewPost,
  Vote,
  NewVote,
  Reply,
  NewReply,
  ModAction,
  NewModAction,
  Territory,
  NewTerritory,
  ApiKey,
  NewApiKey,
  Report,
  NewReport,
} from "./schema";

// ─── Re-export schema (for drizzle-kit / migrations) ─────────────────────────

export { schema };

// ─── Helper: generate IDs ─────────────────────────────────────────────────────

export { nanoid } from "nanoid";

// ─── Helper: unix timestamp ───────────────────────────────────────────────────

export const now = (): number => Math.floor(Date.now() / 1000);
