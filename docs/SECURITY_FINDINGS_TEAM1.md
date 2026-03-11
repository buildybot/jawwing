# Security Audit Findings — Team 1: API & Input Validation

**Auditor:** Team 1 (subagent: security-audit-api)
**Date:** 2026-03-10
**Scope:** All API routes in `apps/web/src/app/api/`, plus `packages/api/validation.ts` and `packages/api/anonymous.ts`

---

## Summary Table

| ID | Severity | Category | File | Issue |
|----|----------|----------|------|-------|
| T1-01 | 🔴 CRITICAL | SSRF | `/api/v1/og/route.ts` | Unauthenticated proxy fetches arbitrary user-supplied URLs |
| T1-02 | 🔴 CRITICAL | SSRF | `/api/v1/admin/upload/route.ts` | Admin upload fetches arbitrary URLs with no scheme/host restriction |
| T1-03 | 🟠 HIGH | Rate Limiting | ALL rate-limited endpoints | In-memory rate limiters reset on serverless cold starts; not shared across instances |
| T1-04 | 🟠 HIGH | Rate Limiting | `/api/v1/posts/[id]/vote/route.ts` | Voting has NO rate limit — unlimited votes possible |
| T1-05 | 🟠 HIGH | Input Validation | `/api/v1/admin/upload/route.ts` | No URL scheme validation; content-type trusted from remote server |
| T1-06 | 🟡 MEDIUM | Input Validation | `/api/v1/admin/votes/route.ts` | `score` field has no bounds validation; can be set to arbitrarily large/negative |
| T1-07 | 🟡 MEDIUM | Input Validation | `/api/v1/admin/posts/route.ts` (POST) | `lat`/`lng` not range-validated in admin seed endpoint |
| T1-08 | 🟡 MEDIUM | File Upload | `/api/v1/upload/route.ts` | MIME type trusted from client-supplied `file.type`; no magic-bytes inspection |
| T1-09 | 🟡 MEDIUM | Rate Limiting | `/api/v1/og/route.ts` | OG proxy has no rate limit; can be used to hammer arbitrary external hosts |
| T1-10 | 🟡 MEDIUM | XSS | `sanitizeContent()` in `/api/v1/posts/route.ts` | Regex HTML strip is not a safe parser; malformed tags can bypass it |
| T1-11 | 🟡 MEDIUM | Input Validation | `/api/v1/my/push-token/route.ts` | Push token accepted without length/format validation |
| T1-12 | 🟡 MEDIUM | Request Body Size | ALL POST endpoints | No explicit `Content-Length` / body size limit in route handlers |
| T1-13 | 🟡 MEDIUM | Auth Bypass | `/api/v1/posts/route.ts` (POST), `/api/cron/mod-queue/route.ts` | `x-admin-key` header skips rate limiting and is also accepted by cron endpoint |
| T1-14 | 🟢 LOW | SQL (LIKE wildcard) | `/api/v1/admin/posts/route.ts` (GET) | `search` param passed as `%search%` — no wildcard escaping; performance DoS |
| T1-15 | 🟢 LOW | IDOR | `/api/v1/posts/[id]/route.ts` (DELETE) | Post ownership checked via `user_id` (session cookie), not account_id |
| T1-16 | 🟢 LOW | Information Leakage | `/api/v1/og/route.ts` | Error details include internal fetch error text |

---

## Detailed Findings

---

### T1-01 — 🔴 CRITICAL — SSRF: Unauthenticated OG Proxy

**File:** `apps/web/src/app/api/v1/og/route.ts`
**Line:** ~90 (`fetchOG(parsedUrl.href)`)

**Description:**
`GET /api/v1/og?url=<anything>` accepts any URL from any unauthenticated user and fetches it server-side. There is no allowlist of hosts, no scheme restriction, and no authentication required. An attacker can:
- Probe internal services: `?url=http://localhost:3000/api/v1/admin/dashboard`
- Hit cloud metadata endpoints: `?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/`
- Port-scan internal network via timing responses
- Force the Vercel edge to hit arbitrary third-party hosts (SSRF amplification)

**Evidence:**
```ts
// og/route.ts ~line 90
let parsedUrl: URL;
try { parsedUrl = new URL(rawUrl); } catch { /* returns 400 */ }
// ... no scheme or host restriction
const res = await fetch(url, { ... });
```

**Fix:**
1. Restrict to `https:` scheme only.
2. Block private/reserved IP ranges (10.x, 172.16-31.x, 192.168.x, 127.x, 169.254.x) before fetching.
3. Optionally require authentication (only logged-in users can request OG previews).
4. Add a rate limit (see T1-09).

```ts
if (!['https:'].includes(parsedUrl.protocol)) {
  return NextResponse.json({ error: 'Only HTTPS URLs allowed' }, { status: 400 });
}
// Then validate resolved IP is not private (requires DNS lookup + IP check)
```

---

### T1-02 — 🔴 CRITICAL — SSRF: Admin Upload Fetches Arbitrary URLs

**File:** `apps/web/src/app/api/v1/admin/upload/route.ts`
**Line:** ~50 (`fetchRes = await fetch(url)`)

**Description:**
The admin upload endpoint receives a `{ url: string }` JSON body and immediately fetches that URL server-side to download an image. Although this endpoint requires `x-admin-key`, that key is also accepted in other places (cron endpoint) and may be weaker than expected. If the admin key is ever leaked, an attacker has unrestricted server-side fetch capability from within the Vercel network.

Additionally, the `contentType` is trusted directly from the remote server's response headers and passed through to Vercel Blob — a malicious server could supply `text/html` or `application/javascript`.

**Evidence:**
```ts
// admin/upload/route.ts ~line 50
fetchRes = await fetch(url);  // no scheme or host restriction
const contentType = fetchRes.headers.get("content-type") ?? "image/jpeg";
// contentType is trusted and passed to put()
```

**Fix:**
1. Validate URL scheme is `https:`.
2. Block private/internal IPs.
3. Validate content-type from remote is in an allowlist (image/jpeg, image/png, etc.).
4. Cap the download size (read only first N bytes; currently reads entire `arrayBuffer()`).

---

### T1-03 — 🟠 HIGH — In-Memory Rate Limiters Not Shared Across Instances

**File:** `packages/api/middleware.ts` (all `checkRateLimit` callers), `apps/web/src/app/api/v1/reports/route.ts`, `apps/web/src/app/api/v1/upload/route.ts`
**Lines:** middleware.ts ~line 65 (`const rateLimitStore = new Map()`), upload/route.ts ~line 13

**Description:**
All rate limiters use in-process `Map` objects. On Vercel's serverless infrastructure, each cold start gets a fresh map. With any load, multiple function instances run in parallel with independent stores. An attacker can bypass rate limits by:
- Waiting for natural cold starts (~15 minutes of inactivity)
- Sending enough traffic to trigger new instances
- Distributing requests across regions

Affected endpoints: POST /posts (10/hr), vote (see T1-04), reports (10/hr), uploads (5/hr), auth send-code (3/10min), auth verify (5/10min).

**Fix:**
Replace all in-memory stores with a shared store. Recommended: Upstash Redis with `@upstash/ratelimit`:
```ts
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
const ratelimit = new Ratelimit({ redis: Redis.fromEnv(), limiter: Ratelimit.slidingWindow(10, "1 h") });
```

---

### T1-04 — 🟠 HIGH — No Rate Limit on Vote Endpoint

**File:** `apps/web/src/app/api/v1/posts/[id]/vote/route.ts`
**Lines:** entire POST handler

**Description:**
`POST /api/v1/posts/[id]/vote` has a ban check and a dedup check (1 vote per IP per post) but **no rate limit on the number of vote attempts**. An attacker can:
- Spam votes on many posts rapidly (each new post_id counts as a new dedup key)
- Use vote spam to inflate scores across many posts in a coordinated way
- Cause DB load (every vote attempt hits the DB twice)

**Fix:**
Apply `checkRateLimit(ipHash, "human", "vote")` before the DB calls. Suggested limit: 60 votes/hour per IP.

---

### T1-05 — 🟠 HIGH — Admin Upload: No URL Scheme/Host Validation

**File:** `apps/web/src/app/api/v1/admin/upload/route.ts`
**Line:** ~48

*(See T1-02 for full detail — this sub-finding focuses specifically on the missing validation)*

**Description:**
No `http:` vs `https:` check. `file://`, `ftp://`, and gopher URIs will be silently attempted (Node's `fetch` will reject some but not all). Internal HTTP endpoints (`http://localhost/`) are fully reachable.

**Fix:** Validate `new URL(url).protocol === 'https:'` before fetching.

---

### T1-06 — 🟡 MEDIUM — Admin Votes: No Score Bounds Validation

**File:** `apps/web/src/app/api/v1/admin/votes/route.ts`
**Line:** ~29-33

**Description:**
`POST /api/v1/admin/votes` accepts `{ post_id, score }` and directly sets `posts.score = score` with no bounds check. Any numeric value (including `Infinity`, `NaN`, or `-999999999`) will be written to the DB. This could corrupt rankings.

**Evidence:**
```ts
const { post_id, score } = body;
if (!post_id || typeof score !== "number") { /* only type check */ }
await db.update(posts).set({ score }).where(eq(posts.id, post_id));
```

**Fix:**
```ts
if (typeof score !== "number" || !Number.isFinite(score) || score < -10000 || score > 10000) {
  return NextResponse.json({ error: "score must be a finite number between -10000 and 10000" }, { status: 400 });
}
```

---

### T1-07 — 🟡 MEDIUM — Admin Post Seed: Lat/Lng Not Range-Validated

**File:** `apps/web/src/app/api/v1/admin/posts/route.ts`
**Line:** ~70

**Description:**
The admin POST handler checks `lat == null || isNaN(lat)` but does NOT validate the geographic range (`-90 <= lat <= 90`, `-180 <= lng <= 180`). Invalid coordinates will be stored and break H3 index computation silently.

**Evidence:**
```ts
if (lat == null || lng == null || isNaN(lat) || isNaN(lng)) {
  return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
}
// No range check follows
const h3_index = latLngToH3(lat, lng); // may throw or return garbage
```

**Fix:**
```ts
if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
  return NextResponse.json({ error: "Invalid coordinate range" }, { status: 400 });
}
```

---

### T1-08 — 🟡 MEDIUM — File Upload: MIME Type Trusted from Client

**File:** `apps/web/src/app/api/v1/upload/route.ts`
**Line:** ~61 (`const fileType = file.type`)

**Description:**
The upload handler validates `file.type` against `ALLOWED_TYPES` but `file.type` is the MIME type declared by the browser — it is not derived from actual file content. An attacker can upload a PHP shell or HTML file with `Content-Type: image/jpeg` set in the form submission and bypass this check.

**Evidence:**
```ts
const fileType = file.type;  // browser-supplied
if (!ALLOWED_TYPES.includes(fileType)) { return 400; }
// No magic-byte inspection
```

**Fix:**
Read the first few bytes of the file buffer and check magic bytes:
- JPEG: `FF D8 FF`
- PNG: `89 50 4E 47`
- GIF: `47 49 46 38`
- WebP: `52 49 46 46 ... 57 45 42 50`

Or use a library like `file-type`:
```ts
import { fileTypeFromBuffer } from "file-type";
const buffer = await file.arrayBuffer();
const detected = await fileTypeFromBuffer(new Uint8Array(buffer));
if (!detected || !ALLOWED_TYPES.includes(detected.mime)) { return 400; }
```

---

### T1-09 — 🟡 MEDIUM — OG Proxy Has No Rate Limit

**File:** `apps/web/src/app/api/v1/og/route.ts`
**Lines:** entire GET handler

**Description:**
`GET /api/v1/og?url=<anything>` has no rate limiting whatsoever. The only protection is an in-memory cache (also per-instance — see T1-03). An attacker can:
- Send thousands of unique URLs to force outbound fetches
- Use the endpoint to DDoS third-party services on behalf of the server
- Enumerate internal services (combined with T1-01)

**Fix:**
Add IP-based rate limiting (suggest 30 requests/hour), and add it **after** fixing T1-01 (scheme + host restrictions).

---

### T1-10 — 🟡 MEDIUM — Fragile HTML Sanitization via Regex

**File:** `apps/web/src/app/api/v1/posts/route.ts`
**Line:** ~237 (`function sanitizeContent`)

**Description:**
`sanitizeContent` uses a regex to strip HTML tags: `raw.replace(/<[^>]*>/g, "")`. This is not a safe HTML sanitizer. Known bypasses include:
- Tags split across lines: `<scr\nipt>`
- Malformed/unclosed tags that some parsers still execute
- Unicode lookalikes

While Jawwing content appears to be rendered as plain text (not innerHTML), if any frontend component ever renders content with `dangerouslySetInnerHTML` or sets `.innerHTML`, this sanitization is insufficient.

**Fix:**
Use a proper sanitizer library:
```ts
import DOMPurify from "isomorphic-dompurify";
const sanitized = DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
```
Or at minimum, use `he` to HTML-encode the content before storage.

Also: audit all frontend components for `dangerouslySetInnerHTML` usage with post content.

---

### T1-11 — 🟡 MEDIUM — Push Token: No Length or Format Validation

**File:** `apps/web/src/app/api/v1/my/push-token/route.ts`
**Line:** ~24

**Description:**
The push token endpoint only checks `typeof body.token !== "string"`. There is no:
- Maximum length limit (could store a 1MB string in the DB push_tokens column)
- Format validation (should match Expo/APNs/FCM token patterns)
- Rate limiting (spammable to flood the push_tokens table)

**Fix:**
```ts
if (!body.token || typeof body.token !== "string" || body.token.length > 512 || body.token.length < 10) {
  return NextResponse.json({ error: "invalid token" }, { status: 400 });
}
```

---

### T1-12 — 🟡 MEDIUM — No Explicit Request Body Size Limits

**File:** All POST/PUT route handlers

**Description:**
None of the route handlers inspect `Content-Length` or limit request body size before calling `req.json()` or `req.formData()`. Next.js has a default 4MB body limit for JSON, but this is not explicitly enforced in route logic. Large payloads could:
- Cause memory pressure in serverless functions
- Slow down the request pipeline

The upload route does check `file.size` but only after the entire multipart body has been parsed.

**Fix:**
Add a body size check early in POST handlers for sensitive routes:
```ts
const contentLength = parseInt(req.headers.get("content-length") ?? "0");
if (contentLength > 10_000) { // 10KB limit for JSON posts
  return NextResponse.json({ error: "Request too large" }, { status: 413 });
}
```
Or configure `next.config.js`:
```js
api: { bodyParser: { sizeLimit: '10kb' } }
```

---

### T1-13 — 🟡 MEDIUM — Admin Key Bypasses Rate Limiting; Also Accepted on Cron Endpoint

**File:** `apps/web/src/app/api/v1/posts/route.ts` (~line 198), `apps/web/src/app/api/cron/mod-queue/route.ts` (~line 15)
**Lines:** posts/route.ts ~198, cron/mod-queue/route.ts ~15

**Description:**
Two issues:

1. **Rate limit bypass:** `POST /api/v1/posts` skips rate limiting entirely when `x-admin-key` header matches `ADMIN_API_KEY`. This is documented as intentional for seeding, but the bypass is total — an attacker who obtains the admin key can post unlimited content bypassing all rate limits AND moderation cooldowns.

2. **Cron endpoint accepts admin key:** `GET /api/cron/mod-queue` accepts either a `CRON_SECRET` Bearer token OR an `x-admin-key` header. If the cron secret is separately secured (Vercel manages it), the fallback to admin key weakens the cron auth model.

**Fix:**
1. For the rate limit bypass: limit the admin key bypass to a separate seed-only endpoint, not the public post endpoint.
2. Remove the admin key fallback from the cron endpoint; use only `CRON_SECRET`.

---

### T1-14 — 🟢 LOW — LIKE Wildcard Injection (Performance DoS)

**File:** `apps/web/src/app/api/v1/admin/posts/route.ts`
**Line:** ~51

**Description:**
The `search` parameter is wrapped as `%${search}%` and passed to a parameterized LIKE query. While this is NOT a SQL injection risk (it's parameterized), an attacker who obtains admin access can supply a search term like `%a%b%c%d%e%f%` which creates an O(n^m) regex-equivalent pattern, potentially causing slow table scans and DoS.

**Fix:**
Escape LIKE special characters in the search term:
```ts
const safesearch = search.replace(/[%_\\]/g, '\\$&');
args.push(`%${safesearch}%`);
// And add "ESCAPE '\\'" to the LIKE clause
```

---

### T1-15 — 🟢 LOW — Post Deletion Ownership Check Uses Mutable Cookie-Based user_id

**File:** `apps/web/src/app/api/v1/posts/[id]/route.ts`
**Line:** ~50 (`const isAuthor = post.user_id === user.id`)

**Description:**
`DELETE /api/v1/posts/[id]` verifies ownership by comparing `post.user_id` (stored at post creation from the anonymous session cookie `jw_session`) against `user.id` from the JWT/API-key auth. The anonymous session cookie is `HttpOnly; SameSite=Lax` and is a 32-char nanoid — reasonably secure in practice. However:
- If a user clears cookies, they lose the ability to delete their own posts
- Knowing a user's anonymous `user_id` (which is never directly exposed, but appears in DB and logs) would allow deletion of their posts

This is a design tradeoff, but the risk is low given the cookie security settings.

**Fix (optional):**
Prefer `account_id` ownership check when the user is authenticated with a JWT, falling back to `user_id` for anonymous sessions:
```ts
const isAuthor = accountId 
  ? post.account_id === accountId 
  : post.user_id === user.id;
```

---

### T1-16 — 🟢 LOW — OG Error Response Leaks Fetch Error Details

**File:** `apps/web/src/app/api/v1/og/route.ts`
**Line:** ~48 in `fetchOG` caller, and in admin/upload/route.ts ~50

**Description:**
In `admin/upload/route.ts`:
```ts
return NextResponse.json({ error: `Failed to fetch URL: ${e}`, code: "FETCH_ERROR" }, { status: 400 });
```
This leaks the raw Node.js fetch error, which may include internal DNS resolution details, timeout specifics, or other implementation-level info useful for network recon.

**Fix:**
Return a generic error message:
```ts
return NextResponse.json({ error: "Failed to fetch source URL", code: "FETCH_ERROR" }, { status: 400 });
```

---

## Notes on Areas That Look Secure

The following were reviewed and found to be implemented correctly:

- **SQL Injection:** All raw `@libsql/client` queries in admin routes use parameterized `{ sql, args }` syntax. No string concatenation in SQL was found. Dynamic WHERE clause building in `admin/posts` and `mod/actions` uses `?` placeholders correctly.
- **Validation schemas** (`packages/api/validation.ts`): Zod schemas are well-defined. `PostSchema`, `VoteSchema`, `ReportSchema`, `EmailSchema`, `VerifySchema` all cover the critical fields. The `validate()` helper is used consistently in public POST endpoints.
- **IDOR on user data:** `saved`, `notifications`, `my/posts`, and `notifications/read` all scope queries to `account.id` from auth — no user-supplied ID can access another user's data.
- **Auth on admin routes:** All admin routes check `isAdmin(req)` which requires either a valid JWT admin account or `x-admin-key` matching `ADMIN_API_KEY`. No admin endpoint is publicly accessible.
- **Ban checking:** Post creation and voting correctly check `isBanned(ipHash)` before processing.
- **`packages/api/anonymous.ts`:** Correct SHA-256 IP hashing. Session cookie is properly `HttpOnly; SameSite=Lax`. No issues found.
- **Cron protection:** `cron/cleanup` requires `Bearer ${CRON_SECRET}` — correctly implemented (except the mod-queue dual-auth issue noted in T1-13).
