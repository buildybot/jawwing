/**
 * @jawwing/api — Core auth logic
 * Shared between web (Next.js) and future mobile (Expo).
 *
 * v1 notes:
 *  - Verification codes stored in-memory (move to DB / Redis later)
 *  - Rate limiting stored in-memory (move to DB / Redis later)
 */

import crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db, users, api_keys, now as dbNow } from "@jawwing/db";
import type { User } from "@jawwing/db";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SessionPayload {
  sub: string;       // user id
  type: "human" | "agent";
  iat?: number;
  exp?: number;
}

export interface AuthResult {
  token: string;
  user: Pick<User, "id" | "display_name" | "type" | "verified">;
}

export interface ApiKeyResult {
  key: string;   // raw key — shown ONCE to caller
  id: string;    // record id
}

// ─── In-memory code store (v1) ────────────────────────────────────────────────

interface PendingCode {
  code: string;
  expiresAt: number; // unix ms
}

const pendingCodes = new Map<string, PendingCode>();
const CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Prune expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of pendingCodes.entries()) {
    if (val.expiresAt < now) pendingCodes.delete(key);
  }
}, 60_000);

// ─── Display name wordlists ───────────────────────────────────────────────────

const ADJECTIVES = [
  "Swift", "Quiet", "Bold", "Calm", "Eager", "Fierce", "Gentle",
  "Happy", "Icy", "Jolly", "Keen", "Lively", "Misty", "Noble",
  "Odd", "Proud", "Quick", "Rare", "Sly", "Tame", "Unique",
  "Vivid", "Wild", "Yonder", "Zany", "Brave", "Clever", "Daring",
  "Epic", "Frosty", "Grim", "Hasty",
];

const ANIMALS = [
  "Falcon", "Moose", "Otter", "Lynx", "Crane", "Bison", "Viper",
  "Raven", "Trout", "Quail", "Panda", "Newt", "Mole", "Lemur",
  "Koala", "Jaguar", "Ibis", "Heron", "Gecko", "Finch", "Egret",
  "Dingo", "Crane", "Bream", "Asp", "Wolf", "Stag", "Pike",
  "Kite", "Wren", "Stoat", "Toad",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Normalize phone to E.164. Assumes US (+1) if no country code present. */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (phone.startsWith("+")) return `+${digits}`;
  return `+${digits}`;
}

/** SHA-256 hash of phone with env salt. */
export function hashPhone(phone: string): string {
  const salt = process.env.PHONE_HASH_SALT;
  if (!salt) throw new Error("PHONE_HASH_SALT env var is required");
  return crypto
    .createHash("sha256")
    .update(salt + normalizePhone(phone))
    .digest("hex");
}

/** Random adjective+animal display name. */
export function generateDisplayName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj}${animal}`;
}

// ─── SMS verification ─────────────────────────────────────────────────────────

/** Send a 6-digit SMS verification code via Twilio. */
export async function sendVerificationCode(phone: string): Promise<void> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;

  if (!sid || !token || !from) {
    throw new Error(
      "Twilio env vars missing: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER"
    );
  }

  const normalized = normalizePhone(phone);
  const code = String(Math.floor(100_000 + Math.random() * 900_000));

  // Lazy-import twilio so it doesn't load in environments that don't use it
  const { default: twilio } = await import("twilio");
  const client = twilio(sid, token);

  await client.messages.create({
    body: `Your Jawwing code is: ${code}`,
    from,
    to: normalized,
  });

  pendingCodes.set(normalized, {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
}

// ─── Code verification + user creation ───────────────────────────────────────

/** Verify code, create user if new, return JWT session token. */
export async function verifyCode(
  phone: string,
  code: string
): Promise<AuthResult> {
  const normalized = normalizePhone(phone);
  const pending = pendingCodes.get(normalized);

  if (!pending) throw new Error("No pending verification code for this number");
  if (Date.now() > pending.expiresAt) {
    pendingCodes.delete(normalized);
    throw new Error("Verification code has expired");
  }
  if (pending.code !== code.trim()) throw new Error("Invalid verification code");

  // Code consumed — delete immediately
  pendingCodes.delete(normalized);

  const phoneHash = hashPhone(phone);

  // Find or create user
  let user = await db.query.users.findFirst({
    where: eq(users.phone_hash, phoneHash),
  });

  if (!user) {
    const id = nanoid();
    const displayName = generateDisplayName();
    const ts = dbNow();

    await db.insert(users).values({
      id,
      phone_hash: phoneHash,
      display_name: displayName,
      type: "human",
      verified: true,
      created_at: ts,
    });

    user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) throw new Error("Failed to create user");
  } else if (!user.verified) {
    // Mark existing user as verified
    await db
      .update(users)
      .set({ verified: true })
      .where(eq(users.id, user.id));
    user = { ...user, verified: true };
  }

  const token = generateSessionToken(user);

  return {
    token,
    user: {
      id: user.id,
      display_name: user.display_name,
      type: user.type,
      verified: user.verified,
    },
  };
}

// ─── Session tokens (JWT) ─────────────────────────────────────────────────────

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is required");
  return secret;
}

export function generateSessionToken(user: Pick<User, "id" | "type">): string {
  const payload: SessionPayload = { sub: user.id, type: user.type };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "30d" });
}

/** Validate a JWT session token. Returns the payload or throws. */
export function validateSession(token: string): SessionPayload {
  try {
    const payload = jwt.verify(token, getJwtSecret()) as SessionPayload;
    return payload;
  } catch (err) {
    throw new Error("Invalid or expired session token");
  }
}

// ─── API keys ─────────────────────────────────────────────────────────────────

const API_KEY_PREFIX = "jw_";

/** Generate a new API key for an agent user. Stores key hash in DB. */
export async function generateApiKey(
  userId: string,
  territoryId?: string
): Promise<ApiKeyResult> {
  const rawKey = `${API_KEY_PREFIX}${nanoid(32)}`;
  const keyHash = crypto
    .createHash("sha256")
    .update(rawKey)
    .digest("hex");

  const id = nanoid();
  const ts = dbNow();

  await db.insert(api_keys).values({
    id,
    user_id: userId,
    key_hash: keyHash,
    territory_id: territoryId ?? null,
    rate_limit: 50,
    created_at: ts,
    revoked: false,
  });

  return { key: rawKey, id };
}

/** Validate an API key. Updates last_used_at and returns the owning user. */
export async function validateApiKey(key: string): Promise<User> {
  const keyHash = crypto
    .createHash("sha256")
    .update(key)
    .digest("hex");

  const record = await db.query.api_keys.findFirst({
    where: eq(api_keys.key_hash, keyHash),
  });

  if (!record) throw new Error("API key not found");
  if (record.revoked) throw new Error("API key has been revoked");

  // Update last_used_at (fire-and-forget — don't block the request)
  db.update(api_keys)
    .set({ last_used_at: dbNow() })
    .where(eq(api_keys.id, record.id))
    .catch(() => {/* best-effort */});

  const user = await db.query.users.findFirst({
    where: eq(users.id, record.user_id),
  });

  if (!user) throw new Error("API key owner not found");

  return user;
}
