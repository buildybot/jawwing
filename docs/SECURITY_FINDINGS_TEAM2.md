# Security Findings — Team 2: Auth & Access Control

**Audited:** 2026-03-10  
**Auditor:** Team 2 (Auth & Access Control)  
**Scope:** JWT, admin routes, API key auth, cookie security, email verification, account enumeration, session management, cron auth

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | 2 |
| 🟠 High | 4 |
| 🟡 Medium | 4 |
| 🔵 Low / Info | 3 |

---

## 🔴 CRITICAL

### C1 — Timing Attack on Admin API Key Comparison
**File:** `packages/api/admin.ts` (and duplicated in `moderate/route.ts`, `posts/route.ts`, `votes/route.ts`, `upload/route.ts`)

```ts
// VULNERABLE — plain string equality
if (adminKey && process.env.ADMIN_API_KEY && adminKey === process.env.ADMIN_API_KEY.trim()) {
```

JavaScript's `===` on strings is NOT constant-time. An attacker can use timing differences to brute-force the `ADMIN_API_KEY` character by character.

**Fix:** Use `crypto.timingSafeEqual()`:
```ts
import crypto from "crypto";
const a = Buffer.from(adminKey);
const b = Buffer.from(process.env.ADMIN_API_KEY!.trim());
if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) { return unauthorized; }
```
This pattern is duplicated in 4 separate `requireAdminKey()` functions — fix the shared `isAdmin()` in `admin.ts` and eliminate the duplicates.

---

### C2 — JWT Cookie Missing `Secure` Flag
**File:** `packages/api/accounts.ts`

```ts
export function buildAccountCookieHeader(token: string): string {
  return `${ACCOUNT_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
  // ^^^ NO "Secure" flag
}
```

The account JWT cookie (`jw_account`) will be sent over plain HTTP connections. An attacker on the same network can intercept the token via HTTP downgrade or mixed-content requests.

**Fix:** Add `; Secure` to the cookie string. Same issue on the `jw_account_ok` cookie set in `verify/route.ts` and `logout/route.ts`.

---

## 🟠 HIGH

### H1 — In-Memory Rate Limiting Is Ineffective in Serverless
**Files:** `apps/web/src/app/api/auth/send-code/route.ts`, `verify/route.ts`

Both routes call `checkEmailRateLimit(email, ...)` which (based on middleware usage patterns in serverless) stores state in-memory. In Vercel's serverless environment, each function instance has its own memory — requests are load-balanced across hundreds of cold instances. The rate limit is **effectively bypassed**: an attacker simply needs to hit different instances to reset their counter.

**Impact:** Unlimited OTP brute-force attempts against any email. The 6-digit code (1-in-900,000 chance) is trivially crackable at scale.

**Fix:** Move rate limit counters to Turso/Redis (persistent store). The code DB already uses Turso — add a `rate_limits` table there.

---

### H2 — JWT Secret Dual-Use (Signing + Encryption Key Derivation)
**File:** `packages/api/accounts.ts`

```ts
function getEncryptionKey(): Buffer {
  const secret = process.env.JWT_SECRET;
  // Derives AES-256-GCM key from JWT_SECRET
  return crypto.createHash("sha256").update(secret).digest();
}
```

`JWT_SECRET` is used for BOTH JWT signing AND deriving the AES-256-GCM key for email encryption. Key reuse across different cryptographic primitives is dangerous:
- Compromise of `JWT_SECRET` immediately decrypts ALL stored emails.
- Should be two independent secrets.

**Fix:** Add a separate `EMAIL_ENCRYPTION_KEY` env var (32 random bytes, base64). Use it exclusively for email encryption.

---

### H3 — No Server-Side Session Invalidation on Logout
**File:** `apps/web/src/app/api/auth/logout/route.ts`

```ts
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.append("Set-Cookie", buildAccountCookieClearHeader());
  // Just clears cookie — token remains valid server-side
  return response;
}
```

JWTs are valid for **365 days** with no revocation mechanism. After logout, the token is still cryptographically valid. If a token is stolen (via XSS, log leakage, etc.) the attacker has up to 365 days of persistent access with no way to revoke it.

**Fix:** Implement a token revocation table in Turso. Store `session_ids` (already exists on the `accounts` table) and validate them on each request. Remove the session ID on logout.

---

### H4 — Inconsistent Admin Auth Method Across Routes
**Files:** Multiple admin routes

Some routes use `isAdmin()` (supports JWT admin accounts AND x-admin-key), but 4 routes use their own `requireAdminKey()` which **only** accepts x-admin-key:

| Route | Auth Method |
|-------|-------------|
| `/api/v1/admin/dashboard` | `isAdmin()` ✅ |
| `/api/v1/admin/posts` GET | `isAdmin()` ✅ |
| `/api/v1/admin/reports` | `isAdmin()` ✅ |
| `/api/v1/admin/top-posts` | `isAdmin()` ✅ |
| `/api/v1/admin/users` | `isAdmin()` ✅ |
| `/api/v1/admin/users/[id]` | `isAdmin()` ✅ |
| `/api/v1/admin/users/[id]/ban` | `isAdmin()` ✅ |
| `/api/v1/admin/posts/[id]/remove` | `isAdmin()` ✅ |
| `/api/v1/admin/posts/[id]/restore` | `isAdmin()` ✅ |
| `/api/v1/admin/stats/activity` | `isAdmin()` ✅ |
| `/api/v1/admin/moderate` | `requireAdminKey()` ⚠️ x-admin-key ONLY |
| `/api/v1/admin/posts` POST/DELETE | `requireAdminKey()` ⚠️ x-admin-key ONLY |
| `/api/v1/admin/votes` | `requireAdminKey()` ⚠️ x-admin-key ONLY |
| `/api/v1/admin/upload` | `requireAdminKey()` ⚠️ x-admin-key ONLY |

This inconsistency means JWT admin accounts can't use moderation/seeding routes. It also means there are 4 separate inline copies of the key comparison logic (each with the timing attack in C1).

**Fix:** Consolidate to `isAdmin()` everywhere. Remove the 4 inline `requireAdminKey()` functions. Fix the timing attack in the shared function.

---

## 🟡 MEDIUM

### M1 — Verification Error Messages Leak Code State
**File:** `packages/api/auth.ts` → `checkAndConsumeCode()`

```ts
if (result.rows.length === 0) throw new Error("No pending verification code for this email");
if (Date.now() > expiresAt)  throw new Error("Verification code has expired");
if (storedCode !== code.trim()) throw new Error("Invalid verification code");
```

These three distinct error messages are returned to the client in `verify/route.ts`. An attacker can distinguish:
1. "No code exists" — email not in verification flow
2. "Code expired" — email was in flow but window passed
3. "Wrong code" — actively attempting brute force

**Fix:** Return a single generic error: `"Verification failed"` regardless of the specific reason. (send-code already does this correctly.)

---

### M2 — JWT Algorithm Not Explicitly Pinned
**File:** `packages/api/auth.ts`, `packages/api/accounts.ts`

`jwt.verify()` is called without specifying `algorithms: ["HS256"]`. While the current secret is symmetric (HS256), omitting the algorithm allowlist means:
- If `JWT_SECRET` were ever replaced with an asymmetric key, the `none` algorithm or RS256 could potentially be accepted depending on library version.
- Defense-in-depth best practice is to always pin the algorithm.

**Fix:**
```ts
jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as SessionPayload;
```

---

### M3 — Long-Lived JWT Expiry (365 Days)
**File:** `packages/api/accounts.ts`

```ts
jwt.sign(payload, getJwtSecret(), { expiresIn: "365d" });
```

Account tokens (email-authenticated sessions) are valid for 365 days. Combined with no server-side revocation (H3), a stolen token is valid for up to a year.

**Recommendation:** Reduce to 30 days with silent refresh on activity. This limits the blast radius of token compromise.

---

### M4 — `jw_account_ok` Non-httpOnly Cookie Not Flagged Secure
**File:** `apps/web/src/app/api/auth/verify/route.ts`

```ts
response.headers.append("Set-Cookie", `jw_account_ok=1; Path=/; SameSite=Lax; Max-Age=...`);
```

While this is intentionally non-httpOnly (so JS can detect login state), it also lacks the `Secure` flag. Though this is a low-value cookie, it should still be marked Secure.

---

## 🔵 LOW / INFORMATIONAL

### L1 — Cron Auth: mod-queue Accepts Admin Key as Alternative
**File:** `apps/web/src/app/api/cron/mod-queue/route.ts`

```ts
// Allow cron secret OR admin key
if ((!cronSecret || authHeader !== `Bearer ${cronSecret}`) && (!adminKey || adminKey.trim() !== process.env.ADMIN_API_KEY?.trim())) {
```

The mod-queue cron accepts the admin API key as an alternative to the cron secret. This widens the attack surface: compromise of `ADMIN_API_KEY` also allows triggering moderation jobs. The cleanup cron correctly uses only `CRON_SECRET`. Consider aligning them.

**Note:** The admin key comparison here also has the timing attack issue (C1).

---

### L2 — Code Deletion Happens Before Expiry Check
**File:** `packages/api/auth.ts`

```ts
// Always delete after lookup (one-time use)
await codeClient.execute({ sql: "DELETE FROM verification_codes WHERE email_hash = ?", args: [emailHash] });

if (Date.now() > expiresAt) throw new Error("Verification code has expired");
if (storedCode !== code.trim()) throw new Error("Invalid verification code");
```

The code is deleted before checking if it's valid/expired. If the DELETE succeeds but the check fails (expired or wrong code), the user must request a new code. This is actually the **correct** behavior (prevents replay), but worth documenting — the "No pending code" error after a failed attempt may confuse users if they retry. Acceptable pattern, no change needed.

---

### L3 — Email Verification Uses SHA-256 (Not HMAC) for Hashing
**File:** `packages/api/auth.ts`

```ts
return crypto.createHash("sha256").update(salt + normalizeEmail(email)).digest("hex");
```

The salt is prepended to the email before hashing (hash extension pattern) rather than using HMAC. `crypto.createHmac("sha256", salt).update(email).digest("hex")` is the cryptographically correct construction and is more resistant to length-extension attacks.

Low risk in practice (SHA-256 preimage resistance is strong), but HMAC is the standard for keyed hashing.

---

## Positive Findings

- ✅ Email never stored in plaintext — AES-256-GCM encryption with auth tag
- ✅ API keys are hashed (SHA-256) before storage — raw key shown once  
- ✅ send-code always returns `{ ok: true }` regardless of email existence (good enumeration protection)
- ✅ Verification codes are single-use (deleted on first lookup attempt)
- ✅ Code TTL is 5 minutes (short and appropriate)
- ✅ Cron cleanup route uses Bearer token auth (CRON_SECRET)
- ✅ All admin routes verified to have SOME form of auth check — no unprotected admin endpoints found

---

## Recommended Fix Priority

1. **C1** — Fix timing attack on admin key (1 hour, high impact)
2. **C2** — Add `Secure` flag to JWT cookies (15 minutes, critical path)
3. **H1** — Move rate limiting to Turso (1 day, requires schema change)
4. **H2** — Separate encryption key from JWT secret (2 hours)
5. **H3** — Add session revocation on logout (1 day)
6. **H4** — Consolidate admin auth to `isAdmin()` everywhere (2 hours)
7. **M1** — Genericize verification error messages (30 minutes)
8. **M2** — Pin JWT algorithm (15 minutes)
