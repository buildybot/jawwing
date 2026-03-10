import { NextRequest, NextResponse } from "next/server";

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

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url param" }, { status: 400 });
  }

  // Validate URL
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const cacheKey = parsedUrl.href;
  const cached = ogCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return NextResponse.json(cached.data);
  }

  try {
    const res = await fetch(parsedUrl.href, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Jawwing/1.0; +https://jawwing.com)",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const data: OGData = { url: rawUrl, error: "fetch_failed" };
      ogCache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL });
      return NextResponse.json(data);
    }

    const html = await res.text();

    const data: OGData = {
      url: rawUrl,
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

    ogCache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL });
    return NextResponse.json(data);
  } catch {
    const data: OGData = { url: rawUrl, error: "fetch_failed" };
    ogCache.set(cacheKey, { data, expires: Date.now() + 5 * 60 * 1000 }); // short cache on error
    return NextResponse.json(data);
  }
}
