import { NextRequest, NextResponse } from "next/server";
import { validateUrl } from "@/lib/ssrf-guard";

interface OGData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  error?: string;
}

// In-memory cache: url → { data, expires }
const ogCache = new Map<string, { data: OGData; expires: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// In-memory rate limiter: IP → { count, windowStart }
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

function parseMeta(html: string, property: string): string | undefined {
  // Try property= first, then name=
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, "i"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, "i"),
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]) return m[1];
  }
  return undefined;
}

const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const MAX_RESPONSE_BYTES = 1 * 1024 * 1024; // 1 MB

async function fetchOG(url: string): Promise<OGData | null> {
  // Re-validate after any URL transformation (e.g. old.reddit substitution)
  const safeUrl = await validateUrl(url);
  if (!safeUrl) return null;

  const res = await fetch(safeUrl, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    // No redirect: "follow" — we re-validate after redirects via size-limited read
    redirect: "follow",
    signal: AbortSignal.timeout(5000), // 5 second hard timeout
  });

  if (!res.ok) return null;

  // Enforce response size limit
  const reader = res.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > MAX_RESPONSE_BYTES) {
        reader.cancel();
        break;
      }
      chunks.push(value);
    }
  }
  const html = new TextDecoder().decode(
    chunks.reduce((acc, c) => {
      const merged = new Uint8Array(acc.byteLength + c.byteLength);
      merged.set(acc, 0);
      merged.set(c, acc.byteLength);
      return merged;
    }, new Uint8Array(0))
  );

  return {
    url,
    title:
      parseMeta(html, "og:title") ||
      parseMeta(html, "twitter:title") ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim(),
    description:
      parseMeta(html, "og:description") ||
      parseMeta(html, "twitter:description") ||
      parseMeta(html, "description"),
    image:
      parseMeta(html, "og:image") || parseMeta(html, "twitter:image"),
  };
}

const OG_RESPONSE_HEADERS = {
  "Cache-Control": "s-maxage=3600, stale-while-revalidate=7200",
};

export async function GET(req: NextRequest) {
  // Rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  if (!checkRateLimit(ip)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // SSRF validation: scheme + private IP check + DNS resolution
  const safeUrl = await validateUrl(rawUrl);
  if (!safeUrl) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const cacheKey = safeUrl;
  const cached = ogCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data, { headers: OG_RESPONSE_HEADERS });
  }

  const isReddit = /reddit\.com/i.test(new URL(safeUrl).hostname);

  try {
    let data = await fetchOG(safeUrl);

    // Reddit fallback: try old.reddit.com which has more reliable OG tags
    if (!data && isReddit) {
      const oldUrl = safeUrl.replace(/(?:www\.)?reddit\.com/, "old.reddit.com");
      data = await fetchOG(oldUrl);
    }

    if (!data) {
      const errData: OGData = { url: rawUrl, error: "fetch_failed" };
      ogCache.set(cacheKey, { data: errData, expires: Date.now() + 5 * 60 * 1000 });
      return NextResponse.json(errData, { headers: OG_RESPONSE_HEADERS });
    }

    // For Reddit: if primary fetch had no OG, try old.reddit fallback even on success
    if (isReddit && !data.title && !data.image) {
      const oldUrl = safeUrl.replace(/(?:www\.)?reddit\.com/, "old.reddit.com");
      const fallback = await fetchOG(oldUrl);
      if (fallback?.title || fallback?.image) data = fallback;
    }

    const result: OGData = { ...data, url: rawUrl };
    ogCache.set(cacheKey, { data: result, expires: Date.now() + CACHE_TTL });
    return NextResponse.json(result, { headers: OG_RESPONSE_HEADERS });
  } catch {
    const errData: OGData = { url: rawUrl, error: "fetch_failed" };
    ogCache.set(cacheKey, { data: errData, expires: Date.now() + 5 * 60 * 1000 });
    return NextResponse.json(errData, { headers: OG_RESPONSE_HEADERS });
  }
}
