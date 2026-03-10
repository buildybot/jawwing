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
import { Resend } from "resend";

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

/** Normalize email: lowercase + trim. */
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/** SHA-256 hash of email with env salt. */
export function hashEmail(email: string): string {
  const salt = process.env.EMAIL_HASH_SALT ?? process.env.PHONE_HASH_SALT;
  if (!salt) throw new Error("EMAIL_HASH_SALT env var is required");
  return crypto
    .createHash("sha256")
    .update(salt + normalizeEmail(email))
    .digest("hex");
}

/** Random adjective+animal display name. */
export function generateDisplayName(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const animal = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  return `${adj}${animal}`;
}

// ─── Email verification ───────────────────────────────────────────────────────

/** Send a 6-digit email verification code via Resend. */
export async function sendVerificationCode(email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY env var is required");
  }

  const normalized = normalizeEmail(email);
  const code = String(Math.floor(100_000 + Math.random() * 900_000));

  const resend = new Resend(apiKey);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Jawwing verification code</title>
</head>
<body style="margin:0;padding:0;background:#000000;font-family:'Courier New',Courier,monospace;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#000000;min-height:100vh;">
    <tr>
      <td align="center" valign="middle" style="padding:48px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:400px;">
          <!-- Wordmark -->
          <tr>
            <td align="center" style="padding-bottom:48px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:20px;font-weight:700;letter-spacing:0.18em;color:#FFFFFF;">JAWWING</span>
            </td>
          </tr>
          <!-- Label -->
          <tr>
            <td align="center" style="padding-bottom:16px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:0.1em;color:#777777;text-transform:uppercase;">Your verification code</span>
            </td>
          </tr>
          <!-- Code -->
          <tr>
            <td align="center" style="padding:24px;border:1px solid #1F1F1F;background:#0A0A0A;margin-bottom:24px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:48px;font-weight:700;letter-spacing:0.3em;color:#FFFFFF;">${code}</span>
            </td>
          </tr>
          <!-- Expiry -->
          <tr>
            <td align="center" style="padding-top:24px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:0.06em;color:#777777;">This code expires in 5 minutes.</span>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:8px;">
              <span style="font-family:'Courier New',Courier,monospace;font-size:11px;letter-spacing:0.06em;color:#333333;">Do not share it with anyone.</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await resend.emails.send({
    from: "noreply@jawwing.com",
    to: normalized,
    subject: "Your Jawwing verification code",
    html,
  });

  pendingCodes.set(normalized, {
    code,
    expiresAt: Date.now() + CODE_TTL_MS,
  });
}

// ─── Code verification + user creation ───────────────────────────────────────

/**
 * Check and consume a verification code WITHOUT creating a user record.
 * Used by the optional email accounts system.
 * Throws if code is invalid/expired.
 */
export function checkAndConsumeCode(email: string, code: string): void {
  const normalized = normalizeEmail(email);
  const pending = pendingCodes.get(normalized);
  if (!pending) throw new Error("No pending verification code for this email");
  if (Date.now() > pending.expiresAt) {
    pendingCodes.delete(normalized);
    throw new Error("Verification code has expired");
  }
  if (pending.code !== code.trim()) throw new Error("Invalid verification code");
  pendingCodes.delete(normalized);
}

/** Verify code, create user if new, return JWT session token. */
export async function verifyCode(
  email: string,
  code: string
): Promise<AuthResult> {
  const normalized = normalizeEmail(email);
  const pending = pendingCodes.get(normalized);

  if (!pending) throw new Error("No pending verification code for this email");
  if (Date.now() > pending.expiresAt) {
    pendingCodes.delete(normalized);
    throw new Error("Verification code has expired");
  }
  if (pending.code !== code.trim()) throw new Error("Invalid verification code");

  // Code consumed — delete immediately
  pendingCodes.delete(normalized);

  const emailHash = hashEmail(email);

  // Find or create user
  let user = await db.query.users.findFirst({
    where: eq(users.phone_hash, emailHash),
  });

  if (!user) {
    const id = nanoid();
    const displayName = generateDisplayName();
    const ts = dbNow();

    await db.insert(users).values({
      id,
      phone_hash: emailHash,
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
