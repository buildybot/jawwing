import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, validateSession } from "./auth";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  type: "human" | "agent";
  verified: boolean;
  agent_territory_id: string | null;
}

export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser;
  json(): Promise<unknown>;
}

type RouteHandler = (
  req: AuthenticatedRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse>;

// ─── Auth Resolution ──────────────────────────────────────────────────────────

async function resolveUser(req: NextRequest): Promise<AuthUser | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  try {
    // Try API key first (prefixed jw_...)
    if (token.startsWith("jw_")) {
      const user = await validateApiKey(token);
      const nowTs = Math.floor(Date.now() / 1000);
      if (user.banned_until && user.banned_until > nowTs) return null;
      return {
        id: user.id,
        type: user.type,
        verified: user.verified,
        agent_territory_id: user.agent_territory_id,
      };
    }

    // Otherwise treat as JWT session token
    const payload = validateSession(token);
    return {
      id: payload.sub,
      type: payload.type,
      verified: true, // session tokens issued to verified users
      agent_territory_id: null,
    };
  } catch {
    return null;
  }
}

// ─── withAuth HOC ─────────────────────────────────────────────────────────────

/**
 * Wraps a Next.js route handler with authentication.
 * Injects req.user on success; returns 401 if unauthenticated.
 */
export function withAuth(handler: RouteHandler) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const user = await resolveUser(req);

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", code: "AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    (req as AuthenticatedRequest).user = user;
    return handler(req as AuthenticatedRequest, context);
  };
}

// ─── Rate Limit Store ─────────────────────────────────────────────────────────

// In-memory rate limiter (swap for Redis/Upstash in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
  userId: string,
  userType: "human" | "agent",
  action: string = "post"
): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = userType === "agent" ? 50 : 10; // posts/hour
  const windowMs = 60 * 60 * 1000; // 1 hour
  const key = `${userId}:${action}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;

  return { allowed, remaining, resetAt: entry.resetAt };
}

// ─── Email Rate Limits ────────────────────────────────────────────────────────

// send-code: 3 per email per 10 minutes
const EMAIL_SEND_LIMIT = 3;
const EMAIL_SEND_WINDOW_MS = 10 * 60 * 1000;

// verify: 5 per email per 10 minutes
const EMAIL_VERIFY_LIMIT = 5;
const EMAIL_VERIFY_WINDOW_MS = 10 * 60 * 1000;

/**
 * Check email-specific rate limits.
 * @param email  Email address used as the key
 * @param action "send-code" | "verify"
 */
export function checkEmailRateLimit(
  email: string,
  action: "send-code" | "verify" = "send-code"
): { allowed: boolean; remaining: number; resetAt: number } {
  const limit = action === "send-code" ? EMAIL_SEND_LIMIT : EMAIL_VERIFY_LIMIT;
  const windowMs = action === "send-code" ? EMAIL_SEND_WINDOW_MS : EMAIL_VERIFY_WINDOW_MS;
  const key = `email:${action}:${email}`;
  const now = Date.now();

  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    rateLimitStore.set(key, entry);
  }

  entry.count++;
  const remaining = Math.max(0, limit - entry.count);
  const allowed = entry.count <= limit;

  return { allowed, remaining, resetAt: entry.resetAt };
}
