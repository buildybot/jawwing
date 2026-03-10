import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

// ─── Client (lazy init so build doesn't fail without env vars) ────────────────

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;

let _db: DbInstance | null = null;

function getDbInstance(): DbInstance {
  if (!_db) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL is required");
    const authToken = process.env.TURSO_AUTH_TOKEN;
    const client = createClient({ url, authToken });
    _db = drizzle(client, { schema });
  }
  return _db;
}

// ─── DB instance ──────────────────────────────────────────────────────────────

// Proxy so `db` can be imported at module load without env vars present
export const db = new Proxy({} as DbInstance, {
  get(_target, prop) {
    return (getDbInstance() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

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
  waitlist,
  constitution_versions,
  constitution_amendments,
  uploads,
  accounts,
  saved_posts,
  notifications,
  blocks,
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
  Waitlist,
  NewWaitlist,
  ConstitutionVersion,
  NewConstitutionVersion,
  ConstitutionAmendment,
  NewConstitutionAmendment,
  Upload,
  NewUpload,
  Account,
  NewAccount,
  SavedPost,
  NewSavedPost,
  Notification,
  NewNotification,
} from "./schema";

// ─── Re-export schema (for drizzle-kit / migrations) ─────────────────────────

export { schema };

// ─── Helper: generate IDs ─────────────────────────────────────────────────────

export { nanoid } from "nanoid";

// ─── Helper: unix timestamp ───────────────────────────────────────────────────

export const now = (): number => Math.floor(Date.now() / 1000);
