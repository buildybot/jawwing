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

// ─── Rate Limiting ────────────────────────────────────────────────────────────

import { checkRateLimit as _checkRateLimit } from "./rateLimit";

/**
 * Check per-user action rate limit (Turso-backed, survives cold starts).
 * agents: 50 posts/hour; humans: 10 posts/hour.
 */
export async function checkRateLimit(
  userId: string,
  userType: "human" | "agent",
  action: string = "post"
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const limit = userType === "agent" ? 50 : 10;
  const windowSeconds = 60 * 60; // 1 hour
  const key = `rl:${action}:${userId}`;
  const { allowed, remaining } = await _checkRateLimit(key, windowSeconds, limit);
  const resetAt = Date.now() + windowSeconds * 1000;
  return { allowed, remaining, resetAt };
}

// ─── withAgentAuth HOC ───────────────────────────────────────────────────────

/**
 * Like withAuth, but ONLY accepts agent API keys (jw_ prefix).
 * Use for mod endpoints that should never be called by anonymous users.
 */
export function withAgentAuth(handler: RouteHandler) {
  return async (
    req: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    const user = await resolveUser(req);

    if (!user || user.type !== "agent") {
      return NextResponse.json(
        { error: "Unauthorized: agent API key required", code: "AGENT_AUTH_REQUIRED" },
        { status: 401 }
      );
    }

    (req as AuthenticatedRequest).user = user;
    return handler(req as AuthenticatedRequest, context);
  };
}

// ─── Email Rate Limits ────────────────────────────────────────────────────────

// send-code: 3 per email per 10 minutes
// verify:    5 per email per 10 minutes

/**
 * Check email-specific rate limits (Turso-backed, survives cold starts).
 * @param email  Email address used as the key
 * @param action "send-code" | "verify"
 */
export async function checkEmailRateLimit(
  email: string,
  action: "send-code" | "verify" = "send-code"
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const limit = action === "send-code" ? 3 : 5;
  const windowSeconds = 10 * 60; // 10 minutes
  const key = `rl:email:${action}:${email}`;
  const { allowed, remaining } = await _checkRateLimit(key, windowSeconds, limit);
  const resetAt = Date.now() + windowSeconds * 1000;
  return { allowed, remaining, resetAt };
}
