/**
 * @jawwing/api — Optional email accounts
 *
 * Completely separate from the agents/users system.
 * Email is NEVER stored in plaintext.
 * Accounts are 100% optional — the app works without them.
 */

import crypto from "crypto";
import * as jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import { eq, or, inArray } from "drizzle-orm";
import { db, accounts, posts, now as dbNow } from "@jawwing/db";
import type { Account } from "@jawwing/db";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACCOUNT_COOKIE = "jw_account";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 365 days

// ─── Email hashing ────────────────────────────────────────────────────────────

export function hashEmailForAccount(email: string): string {
  const salt = process.env.EMAIL_HASH_SALT;
  if (!salt) throw new Error("EMAIL_HASH_SALT env var is required");
  return crypto
    .createHash("sha256")
    .update(salt + email.toLowerCase().trim())
    .digest("hex");
}

// ─── Email encryption (AES-256-GCM) ──────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const encKey = process.env.EMAIL_ENCRYPTION_KEY;
  if (encKey) {
    return crypto.createHash("sha256").update(encKey).digest();
  }
  // Backward compatibility: fall back to JWT_SECRET with a warning
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("EMAIL_ENCRYPTION_KEY (or JWT_SECRET) env var is required");
  console.warn("[security] EMAIL_ENCRYPTION_KEY is not set — falling back to JWT_SECRET for email encryption. Set EMAIL_ENCRYPTION_KEY to a separate value.");
  return crypto.createHash("sha256").update(secret).digest();
}

export function encryptEmail(email: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(email.toLowerCase().trim(), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), encrypted.toString("hex"), tag.toString("hex")].join(":");
}

export function decryptEmail(encrypted: string): string {
  const key = getEncryptionKey();
  const [ivHex, dataHex, tagHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const data = Buffer.from(dataHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

// ─── Account JWT ──────────────────────────────────────────────────────────────

interface AccountPayload {
  sub: string; // account id
  kind: "account";
  iat?: number;
  exp?: number;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET env var is required");
  return secret;
}

export function signAccountToken(accountId: string): string {
  const payload: AccountPayload = { sub: accountId, kind: "account" };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: "365d" });
}

export function verifyAccountToken(token: string): AccountPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as AccountPayload;
  } catch {
    return null;
  }
}

const SECURE_FLAG = process.env.NODE_ENV === "production" ? "; Secure" : "";

export function buildAccountCookieHeader(token: string): string {
  return `${ACCOUNT_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}${SECURE_FLAG}`;
}

export function buildAccountCookieClearHeader(): string {
  return `${ACCOUNT_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${SECURE_FLAG}`;
}

// ─── Find or create account ───────────────────────────────────────────────────

export async function findOrCreateAccount(
  email: string,
  sessionId: string
): Promise<Account> {
  const emailHash = hashEmailForAccount(email);
  const emailEncrypted = encryptEmail(email);
  const ts = dbNow();

  const existing = await db.query.accounts.findFirst({
    where: eq(accounts.email_hash, emailHash),
  });

  if (existing) {
    // Link this session to the account
    const sessionIds: string[] = JSON.parse(existing.session_ids ?? "[]");
    if (!sessionIds.includes(sessionId)) {
      sessionIds.push(sessionId);
    }
    const [updated] = await db
      .update(accounts)
      .set({ session_ids: JSON.stringify(sessionIds), last_seen_at: ts })
      .where(eq(accounts.id, existing.id))
      .returning();
    return updated;
  }

  // Auto-admin for configured admin emails
  const adminEmails = (process.env.ADMIN_EMAILS ?? "benl1291@gmail.com").toLowerCase().split(",").map(e => e.trim());
  const isAdmin = adminEmails.includes(email.toLowerCase().trim()) ? 1 : 0;

  // Create new account
  const [created] = await db
    .insert(accounts)
    .values({
      id: nanoid(),
      email_hash: emailHash,
      email_encrypted: emailEncrypted,
      session_ids: JSON.stringify([sessionId]),
      notification_prefs: '{"replies":true,"trending":false}',
      is_admin: isAdmin,
      created_at: ts,
      last_seen_at: ts,
    })
    .returning();

  return created;
}

// ─── Get account from token ───────────────────────────────────────────────────

export async function getAccountFromToken(token: string): Promise<Account | null> {
  const payload = verifyAccountToken(token);
  if (!payload) return null;

  const account = await db.query.accounts.findFirst({
    where: eq(accounts.id, payload.sub),
  });
  return account ?? null;
}

// ─── Get posts for account ────────────────────────────────────────────────────

export async function getPostsForAccount(account: Account) {
  const sessionIds: string[] = JSON.parse(account.session_ids ?? "[]");

  // Get posts by account_id OR by any linked session_id
  const conditions = [];
  conditions.push(eq(posts.account_id, account.id));
  if (sessionIds.length > 0) {
    conditions.push(inArray(posts.user_id, sessionIds));
  }

  const { or: dbOr, desc } = await import("drizzle-orm");
  const results = await db
    .select()
    .from(posts)
    .where(dbOr(...conditions))
    .orderBy(desc(posts.created_at));

  return results;
}

// ─── Update notification prefs ────────────────────────────────────────────────

export async function updateNotificationPrefs(
  accountId: string,
  prefs: { replies: boolean; trending: boolean }
): Promise<void> {
  await db
    .update(accounts)
    .set({ notification_prefs: JSON.stringify(prefs) })
    .where(eq(accounts.id, accountId));
}

// ─── Push token ───────────────────────────────────────────────────────────────

export async function storePushToken(accountId: string, pushToken: string): Promise<void> {
  // Merge push_token into notification_prefs JSON to avoid schema migration
  const account = await db.query.accounts.findFirst({ where: eq(accounts.id, accountId) });
  if (!account) return;
  const prefs = JSON.parse(account.notification_prefs ?? '{"replies":true,"trending":false}');
  prefs.push_token = pushToken;
  await db
    .update(accounts)
    .set({ notification_prefs: JSON.stringify(prefs) })
    .where(eq(accounts.id, accountId));
}

// ─── Mobile auth helper ───────────────────────────────────────────────────────
// Supports both httpOnly cookie (web) and Authorization: Bearer <token> (mobile)

// Minimal interface matching both NextRequest and standard Request
interface RequestLike {
  cookies: { get(name: string): { value: string } | undefined };
  headers: { get(name: string): string | null };
}

export async function getAccountFromRequest(req: RequestLike): Promise<Account | null> {
  // 1. Try cookie (web)
  const cookieToken = req.cookies.get("jw_account")?.value;
  if (cookieToken) return getAccountFromToken(cookieToken);

  // 2. Try Authorization: Bearer <token> (mobile)
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice(7).trim();
    if (bearerToken) return getAccountFromToken(bearerToken);
  }
  return null;
}
