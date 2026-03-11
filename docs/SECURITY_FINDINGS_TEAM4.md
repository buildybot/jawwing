# Security Findings — Team 4: Business Logic & Privacy

**Audited:** 2026-03-10  
**Scope:** Vote manipulation, IP hashing, email encryption, GPS spoofing, blocks, post expiry, moderation bypass, anonymous correlation, report abuse

---

## Summary Table

| # | Finding | Severity | File |
|---|---------|----------|------|
| T4-01 | Vote dedup bypass via account creation | HIGH | vote/route.ts |
| T4-02 | IP hash has no salt — rainbow table reversible | HIGH | anonymous.ts |
| T4-03 | Encryption key derived from JWT_SECRET — key reuse risk | HIGH | accounts.ts |
| T4-04 | GPS spoofing: teleport check is in-memory only | HIGH | posts/route.ts |
| T4-05 | Block filtering is client-side for direct post fetch | HIGH | posts/[id]/route.ts |
| T4-06 | Expired posts accessible via direct GET | MEDIUM | posts/[id]/route.ts |
| T4-07 | No post edit endpoint — moderation bypass N/A | INFO | — |
| T4-08 | Anonymous correlation attack is feasible | MEDIUM | — |
| T4-09 | Report rate limit is in-memory, bypassable via restart/multi-IP | MEDIUM | reports/route.ts |
| T4-10 | Rate limit state for reports/votes is in-memory (no Redis) | MEDIUM | reports/route.ts |

---

## Detailed Findings

---

### T4-01 · HIGH · Vote Dedup Bypass via Account Registration

**File:** `apps/web/src/app/api/v1/posts/[id]/vote/route.ts`

**Issue:**  
Dedup logic checks `account_id` first, then `voter_hash` (IP hash) as fallback. The flaw is in this sequence:

1. Attacker votes once anonymously → vote stored with `voter_hash = ipHash`, `account_id = null`.
2. Attacker creates a new account → same IP, different identity.
3. Attacker votes again as authenticated user → dedup checks `account_id` first (no match), then checks `voter_hash` (matches!) → correctly blocked.

Actually this path is fine — but the reverse creates a gap:

1. Attacker creates account A, votes → vote stored with `account_id = A`.
2. Attacker clears cookies, votes anonymously from same IP → dedup checks `account_id` first (skipped — not logged in), then checks `voter_hash`. **This correctly catches it.**

However:
1. Attacker votes anonymously from IP-A → vote stored with `voter_hash = hash(IP-A)`.
2. Attacker uses a VPN/proxy → new IP, new IP hash → **no dedup match → double vote succeeds**.
3. There's no rate limit on the vote endpoint itself.

Since IP-based dedup is the only protection for anonymous voters, anyone with access to a VPN, Tor, or residential proxy pool can vote arbitrarily many times.

**Impact:** Vote score manipulation on any post. Trending/hot sort is completely gameable.

**Recommendation:**
- Add rate limiting to the vote endpoint (per IP, per session cookie).
- Consider requiring an account to vote.
- Use session cookie (`jw_session`) as additional dedup factor — it's already issued to anonymous users and tracked.

---

### T4-02 · HIGH · IP Hash Has No Salt — SHA-256 Without Salt Is Rainbow-Tableable

**File:** `packages/api/anonymous.ts` — `getIpHash()`

**Issue:**
```ts
return crypto.createHash("sha256").update(ip).digest("hex");
```

No salt is applied. IPv4 space is only ~4.3 billion addresses; with common CGNAT ranges far smaller in practice. A pre-computed rainbow table for all public IPv4 addresses is trivially feasible (~137 GB at 32 bytes per hash).

**Contrast with email hashing in `accounts.ts`:**
```ts
const salt = process.env.EMAIL_HASH_SALT;
return crypto.createHash("sha256").update(salt + email).digest("hex");
```
Email hashing correctly uses a salt. IP hashing does not.

**Impact:** Anyone with read access to the database (e.g., via a SQLi exploit or insider) can reverse all `ip_hash` and `voter_hash` values back to real IP addresses, de-anonymizing every post and vote.

**Recommendation:**
```ts
const salt = process.env.IP_HASH_SALT;
if (!salt) throw new Error("IP_HASH_SALT env var required");
return crypto.createHash("sha256").update(salt + ip).digest("hex");
```
Add `IP_HASH_SALT` to environment variables. Rotate it periodically (invalidates old hashes for bans but improves privacy).

---

### T4-03 · HIGH · Email Encryption Key Derived From JWT_SECRET

**File:** `packages/api/accounts.ts` — `getEncryptionKey()`

**Issue:**
```ts
function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  return crypto.createHash("sha256").update(secret).digest();
}
```

The AES-256-GCM encryption key for stored emails is derived from `JWT_SECRET`. This means:
- Both JWT signing and email encryption share the same root secret.
- If `JWT_SECRET` must be rotated (e.g., after a token compromise), **all stored email ciphertexts become undecryptable** without re-encrypting them first.
- A JWT secret rotation incident would require a coordinated migration; in practice, rotations often get skipped, meaning a compromised JWT_SECRET stays in use.

**IV handling (positive):** IVs are generated randomly via `crypto.randomBytes(12)` per encryption — no IV reuse. AES-256-GCM with random IV is correctly implemented.

**Impact:** Key conflation makes operational rotation difficult. A JWT forgery attack doesn't directly compromise emails, but a database leak + `JWT_SECRET` exposure reveals all emails.

**Recommendation:**
- Use a separate `EMAIL_ENCRYPTION_KEY` environment variable (32 random bytes, base64-encoded).
- Never derive encryption keys from signing secrets.

---

### T4-04 · HIGH · GPS Spoofing — Teleport Check Is In-Memory and Bypassable

**File:** `apps/web/src/app/api/v1/posts/route.ts`

**Issue:**  
The teleportation check (`lastPositionMap`) is stored in-memory per server instance:
```ts
const lastPositionMap = new Map<string, LastPosition>();
```

On Vercel, each request may hit a different serverless function instance with empty state. The check is completely ineffective in a serverless deployment.

Even if it worked, the check is only `100km in 300 seconds` — meaning an attacker who waits 5 minutes between requests can "walk" across the country.

**Additional impact of GPS spoofing:**
- Attacker can post content as if they're in any city (DC, NYC, etc.) without being there.
- This undermines the core product premise (hyper-local posts from real locals).
- No verification that coordinates match the user's actual network location (IP geolocation cross-check).
- H3 index is computed from user-supplied coordinates — entirely attacker-controlled.

**Recommendation:**
- Move `lastPositionMap` to a Redis/KV store shared across instances.
- Cross-check submitted coordinates against IP geolocation (e.g., MaxMind) — flag posts where coordinates are >500km from IP geolocation.
- Require mobile clients to use device GPS and sign the coordinate payload.

---

### T4-05 · HIGH · Block Filtering Not Applied on Direct Post Fetch

**File:** `apps/web/src/app/api/v1/posts/[id]/route.ts`

**Issue:**  
`GET /api/v1/posts` (feed endpoint) correctly fetches the requester's blocked user IDs and filters them server-side. However, `GET /api/v1/posts/[id]` (single post fetch) does **not** check blocks at all:

```ts
// posts/[id]/route.ts — no block check
const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
// returns post regardless of whether author is blocked
```

Similarly, `GET /api/v1/posts/[id]/replies` should also be checked.

**Impact:**
- Blocked users can still be seen via direct URL.
- Client-side filtering (via `useBlockedUsers` hook) is the only protection — easily bypassed via direct API call or by disabling JS.
- The `author_id` field (first 12 chars of ip_hash/user_id) is exposed in responses, enabling targeted fetching.

**Recommendation:**
- Add block check to `GET /api/v1/posts/[id]` — return 404 (not 403, to avoid confirming existence) if the post author is blocked by the requester.
- Apply same check to replies endpoint.

---

### T4-06 · MEDIUM · Expired Posts Accessible via Direct GET

**File:** `apps/web/src/app/api/v1/posts/[id]/route.ts`

**Issue:**  
Post expiry is enforced server-side in feeds (via `gt(posts.expires_at, nowTs)` filter), but `GET /api/v1/posts/[id]` returns posts regardless of expiry status:

```ts
const [post] = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
// no expires_at check
```

The cleanup cron sets `status = "expired"` hourly. Between expiry time and the next cron run (up to 60 minutes), posts remain `status = "active"` and are excluded from feeds but still directly accessible. After the cron runs, status changes to `"expired"` — but the single-post endpoint still returns them (it only checks for `NOT_FOUND`, not for status).

**Impact:**
- Expired posts can be fetched directly forever via `/api/v1/posts/[id]`.
- Content expected to disappear after 5 days remains accessible indefinitely to anyone who saved the URL.
- User expectation of ephemeral posts is violated.

**Recommendation:**
```ts
if (!post || post.status === 'expired' || post.status === 'removed') {
  return NextResponse.json({ error: "Post not found" }, { status: 404 });
}
```

---

### T4-07 · INFO · No Post Edit Endpoint (Moderation Bypass N/A)

**Finding:** There is no `PATCH` or `PUT` endpoint for posts. Posts cannot be edited after creation. The `DELETE /api/v1/posts/[id]` only sets `status = "removed"`. 

**Verdict:** Post-moderation content injection is not possible in the current implementation. No action needed.

---

### T4-08 · MEDIUM · Anonymous Correlation Attack Feasible

**Issue:**  
Even with no explicit identity, an adversary could correlate posts to a real person using:

1. **Timestamps + location patterns** — A user who posts every morning from coordinates ~38.89, -77.04 (their home) creates a trackable pattern.
2. **`author_id` field** — Responses include `author_id: ip_hash.slice(0, 12)` — a consistent pseudonym across sessions. All posts from one IP share the same 12-char prefix, enabling cross-post correlation without deanonymization.
3. **Fuzz coordinates** — Coordinates are fuzzed to ±0.005° (~500m) at write time, but the fuzz is random per post. An attacker averaging multiple posts from the same user can narrow location to ~100m.
4. **Content fingerprinting** — Writing style, recurring topics, and vocabulary can identify users via stylometric analysis.

**Impact:**
- A determined adversary (stalker, doxxer, law enforcement) can build a profile of a specific anonymous user's home location, daily routine, and identity — solely from post metadata.
- The `author_id` field is particularly dangerous: it's exposed in every post API response, enabling trivial post-history enumeration for any given identity prefix.

**Recommendation:**
- Remove `author_id` from public API responses entirely. Use it only server-side for block filtering.
- Rotate the coordinate fuzz per-user-session rather than per-post.
- Consider not returning exact `created_at` timestamps — round to nearest 5-minute interval.

---

### T4-09 · MEDIUM · Report Rate Limit Is In-Memory and Instance-Scoped

**File:** `apps/web/src/app/api/v1/reports/route.ts`

**Issue:**  
```ts
const reportRateLimit = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_MAX = 10;
```

Same problem as the teleport check — in-memory state on Vercel serverless means each cold-start instance has a fresh rate limit counter. An attacker who triggers new instances (by spacing requests or using concurrent requests) can submit far more than 10 reports/hour.

The 1-report-per-IP-per-post dedup is database-backed (correct), but the overall hourly volume cap is bypassed.

**Impact:**
- Coordinated mass-reporting from distributed IPs (or instance-cycling) can trigger the `REPORT_THRESHOLD_FOR_IMMEDIATE_REVIEW = 3` threshold, causing AI review on any post on demand.
- AI review itself doesn't auto-remove posts (the engine makes decisions), but it adds moderation load and could cause false positives.
- No auto-removal based on report count alone was observed — this partially mitigates the risk.

**Recommendation:**
- Move rate limit tracking to Redis/Upstash KV (shared across instances).
- Consider requiring an account to report (reduces anonymous abuse).

---

### T4-10 · MEDIUM · Vote Notification Throttle Also In-Memory

**File:** `apps/web/src/app/api/v1/posts/[id]/vote/route.ts`

```ts
const voteNotifThrottle = new Map<string, number>();
```

Same pattern. The 1-notification-per-post-per-hour throttle is instance-scoped. On serverless, post authors can receive spam notifications on every vote. Low severity in isolation, but consistent systemic pattern.

---

## Positive Observations

- AES-256-GCM with random IV per email: ✅ correctly implemented
- Email hash uses `EMAIL_HASH_SALT`: ✅ correct
- Coordinates are fuzzed at write time, not just at read time: ✅ good
- Block filtering IS server-side on the feed endpoint: ✅ correct
- No post edit endpoint exists — no moderation bypass vector: ✅
- Dedup on reports is DB-backed (1 per IP per target): ✅
- Posts require moderation before becoming `active`: ✅

---

## Prioritized Fix List

1. **[T4-02] Salt the IP hash** — trivial fix, high privacy impact
2. **[T4-01] Add session cookie to vote dedup** — reduces VPN vote farming
3. **[T4-04] Move teleport state to KV store** — GPS spoofing mitigation
4. **[T4-05] Block check on single-post endpoint** — closes block bypass
5. **[T4-03] Separate EMAIL_ENCRYPTION_KEY from JWT_SECRET** — operational safety
6. **[T4-06] Filter expired/removed posts from direct GET** — enforce ephemerality
7. **[T4-08] Remove `author_id` from public responses** — privacy
8. **[T4-09] Move report rate limits to Redis** — consistency on serverless
