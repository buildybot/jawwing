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

const BROWSER_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

async function fetchOG(url: string): Promise<OGData | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
  });

  if (!res.ok) return null;

  const html = await res.text();
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
    return NextResponse.json(cached.data, { headers: OG_RESPONSE_HEADERS });
  }

  const isReddit = /reddit\.com/i.test(parsedUrl.hostname);

  try {
    let data = await fetchOG(parsedUrl.href);

    // Reddit fallback: try old.reddit.com which has more reliable OG tags
    if (!data && isReddit) {
      const oldUrl = parsedUrl.href.replace(/(?:www\.)?reddit\.com/, "old.reddit.com");
      data = await fetchOG(oldUrl);
    }

    if (!data) {
      const errData: OGData = { url: rawUrl, error: "fetch_failed" };
      ogCache.set(cacheKey, { data: errData, expires: Date.now() + 5 * 60 * 1000 });
      return NextResponse.json(errData, { headers: OG_RESPONSE_HEADERS });
    }

    // For Reddit: if primary fetch had no OG, try old.reddit fallback even on success
    if (isReddit && !data.title && !data.image) {
      const oldUrl = parsedUrl.href.replace(/(?:www\.)?reddit\.com/, "old.reddit.com");
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
