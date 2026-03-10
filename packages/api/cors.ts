import { NextRequest, NextResponse } from "next/server";

// ─── Allowed Origins ──────────────────────────────────────────────────────────

const ALLOWED_ORIGINS = [
  "https://www.jawwing.com",
  "https://jawwing.com",
  process.env.NEXT_PUBLIC_APP_URL,
  "http://localhost:3000",
  "http://localhost:8081", // Expo
  "exp://192.168.68.86:8081",
].filter(Boolean) as string[];

// ─── CORS Headers ─────────────────────────────────────────────────────────────

export function corsHeaders(origin: string | null): Record<string, string> {
  // Allow requests with no origin (mobile apps, curl, etc.)
  const isAllowed = !origin || ALLOWED_ORIGINS.some(o => origin === o || origin.endsWith('.jawwing.com'));
  const allowedOrigin = isAllowed ? (origin || "*") : ALLOWED_ORIGINS[0] ?? "https://www.jawwing.com";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

// ─── Preflight Handler ────────────────────────────────────────────────────────

export function handleOptions(req: NextRequest): NextResponse {
  const origin = req.headers.get("origin");
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}
