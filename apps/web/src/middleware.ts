import { NextRequest, NextResponse } from "next/server";
import { corsHeaders, handleOptions } from "@jawwing/api/cors";

// ─── Security Headers ─────────────────────────────────────────────────────────

const SECURITY_HEADERS: Record<string, string> = {
  "X-Frame-Options": "DENY",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(self), payment=()",
  "Content-Security-Policy": [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self' https://www.jawwing.com https://*.jawwing.com",
    "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.tiktok.com",
    "frame-ancestors 'none'",
    "media-src 'self' https:",
  ].join("; "),
};

// ─── Middleware ───────────────────────────────────────────────────────────────

export function middleware(req: NextRequest): NextResponse {
  const origin = req.headers.get("origin");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return handleOptions(req);
  }

  const response = NextResponse.next();

  // Apply security headers
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }

  // Apply CORS headers + noindex for API routes
  if (req.nextUrl.pathname.startsWith("/api/")) {
    const cors = corsHeaders(origin);
    for (const [key, value] of Object.entries(cors)) {
      response.headers.set(key, value);
    }
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
