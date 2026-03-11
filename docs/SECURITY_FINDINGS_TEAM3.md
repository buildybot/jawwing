# Security Findings — Team 3: Infrastructure & Secrets

**Audited:** 2026-03-10  
**Repo:** github.com/buildybot/jawwing (PUBLIC)  
**Auditor:** Team 3 — Infrastructure & Secrets

---

## 🔴 CRITICAL

### 1. Git History Contains Live Credentials

**Two secrets are permanently baked into git history:**

#### A. Hardcoded Admin API Key
- **Commit:** `f666049` ("Scout marketing agent + posts log + credentials stored")
- **File:** `agents/scout/MARKETING_AGENT.md`
- **Secret:** `jaw_admin_s3cr3t_k3y_2026` (admin key for `/api/v1/admin/*` routes)
- **Status:** Exposed in a public commit. Anyone with repo access can extract it.

#### B. Reddit Account Password in Plaintext
- **Commit:** `f666049`
- **File:** `agents/scout/MARKETING_AGENT.md`
- **Secret:** `mfb9vab.zfh6xqm5BAK` (Reddit u/jawwing password)
- **Status:** Exposed in public git history.

**Immediate actions required:**
1. Rotate the admin API key NOW — assume it is compromised.
2. Rotate the Reddit password NOW.
3. Run BFG Repo Cleaner to purge these commits from history:
   ```bash
   # Install BFG
   brew install bfg
   
   # Create a secrets file
   echo 'jaw_admin_s3cr3t_k3y_2026' > secrets.txt
   echo 'mfb9vab.zfh6xqm5BAK' >> secrets.txt
   
   # Clean history
   bfg --replace-text secrets.txt jawwing.git
   cd jawwing && git reflog expire --expire=now --all && git gc --prune=now --aggressive
   git push --force
   ```
4. After force-pushing, contact GitHub support to purge cached views.

---

## 🟠 HIGH

### 2. npm Audit — 10 Vulnerabilities (6 High, 4 Moderate)

```
10 vulnerabilities (4 moderate, 6 high)
```

**High severity chain:**
- `serialize-javascript <=7.0.2` — RCE via RegExp.flags (GHSA-5c6j-r48x-rmvq)
- `@rollup/plugin-terser 0.2.0-0.4.4` → depends on vulnerable serialize-javascript
- `nitropack >=2.0.0-rc.0` → depends on vulnerable @rollup/plugin-terser
- `@nuxt/nitro-server >=3.20.0` → depends on vulnerable nitropack + nuxt
- `nuxt 3.20.0-3.21.1 || >=4.2.0` → depends on vulnerable @nuxt/nitro-server + @nuxt/vite-builder

**Fix:**
```bash
npm audit fix
# For breaking changes:
npm audit fix --force
```

### 3. CSP — `'unsafe-inline'` in script-src

```
script-src 'self' 'unsafe-inline'
```

`'unsafe-inline'` allows inline `<script>` tags, substantially weakening XSS protection. If Next.js requires it (nonces), implement nonce-based CSP instead.

**Recommendation:** Replace `'unsafe-inline'` with a nonce-based approach via Next.js `generateBuildId` + middleware nonce injection. At minimum, document why it's required.

### 4. CSP — `img-src https:` is Fully Open

```
img-src 'self' data: blob: https:
```

`https:` allows images from any HTTPS source — effectively unrestricted. This enables CSS injection attacks and data exfiltration via image URLs.

**Recommendation:** Restrict to known image domains (e.g., `https://*.vercel.app https://public.blob.vercel-storage.com`).

---

## 🟡 MEDIUM

### 5. CORS — NEXT_PUBLIC_APP_URL in Allowed Origins

```typescript
process.env.NEXT_PUBLIC_APP_URL,  // included in ALLOWED_ORIGINS
```

`NEXT_PUBLIC_` variables are bundled into client-side JS. While `NEXT_PUBLIC_APP_URL` is not itself sensitive, including it in the server-side CORS origin list creates a coupling between public env vars and server security config. If `NEXT_PUBLIC_APP_URL` is set to a non-production value during a build, it could widen the CORS surface.

**Additionally:** The CORS check falls back to `origin || "*"` for requests with no `Origin` header. This means server-to-server requests (curl, mobile, agents) get wildcard CORS — acceptable for a public API but worth documenting.

### 6. CORS — Hardcoded LAN IP in Allowed Origins

```typescript
"exp://192.168.68.86:8081",  // Expo dev server
```

A developer's local LAN IP is hardcoded in production CORS config. This is benign in production (that IP won't be routable externally), but it's sloppy and should move to a `NODE_ENV === 'development'` guard.

### 7. Missing HSTS Header

The middleware applies X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and Permissions-Policy — but **no HSTS** (`Strict-Transport-Security`).

**Recommendation:** Add:
```typescript
"Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
```

Note: This is best set at the CDN/Vercel level but should be in middleware as a fallback.

### 8. CSP — media-src `https:` is Fully Open

```
media-src 'self' https:
```

Same issue as img-src — unrestricted HTTPS sources for audio/video. Restrict to known CDN domains.

---

## 🟢 PASS / LOW

### 9. NEXT_PUBLIC_ Variables — No Sensitive Values Exposed ✅

Only two `NEXT_PUBLIC_` variables are in use:
- `NEXT_PUBLIC_APP_URL` — public URL, non-sensitive ✅
- `NEXT_PUBLIC_APP_NAME` — app name string, non-sensitive ✅

No API keys, tokens, or secrets are prefixed with `NEXT_PUBLIC_`. **Pass.**

### 10. .env.example — Clean ✅

All values are placeholder strings (`your_*` format). No real credentials. **Pass.**

### 11. robots.txt — Properly Configured ✅

```
Disallow: /api/
Disallow: /my-posts
Disallow: /profile
Disallow: /signin
```

Admin and API routes are disallowed. Sitemap is present. **Pass.**

### 12. Security Headers — Mostly Good ✅

Present and correctly configured:
- `X-Frame-Options: DENY` ✅
- `X-Content-Type-Options: nosniff` ✅
- `Referrer-Policy: strict-origin-when-cross-origin` ✅
- `Permissions-Policy: camera=(), microphone=(), geolocation=(self), payment=()` ✅
- `frame-ancestors 'none'` in CSP ✅

Missing: HSTS (see issue #7 above).

### 13. Error Leakage — No Stack Traces in Responses ✅

API routes return structured errors (`{ error: "...", code: "..." }`) with generic 500 messages. Stack traces are logged to console only (server-side). No database details or internal paths leak to clients. **Pass.**

### 14. API Routes — X-Robots-Tag ✅

```typescript
response.headers.set("X-Robots-Tag", "noindex, nofollow");
```

Applied to all `/api/` routes in middleware. **Pass.**

---

## Summary Table

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| 1a | Admin key in git history (`jaw_admin_s3cr3t_k3y_2026`) | 🔴 CRITICAL | ROTATE + BFG |
| 1b | Reddit password in git history | 🔴 CRITICAL | ROTATE + BFG |
| 2 | npm audit: 6 high, 4 moderate vulnerabilities | 🟠 HIGH | `npm audit fix` |
| 3 | CSP `unsafe-inline` in script-src | 🟠 HIGH | Nonce-based CSP |
| 4 | CSP `img-src https:` too permissive | 🟠 HIGH | Restrict to known domains |
| 5 | CORS coupled to NEXT_PUBLIC_APP_URL | 🟡 MEDIUM | Decouple |
| 6 | Hardcoded LAN IP in CORS origins | 🟡 MEDIUM | Dev-only guard |
| 7 | Missing HSTS header | 🟡 MEDIUM | Add to middleware/Vercel |
| 8 | CSP `media-src https:` too permissive | 🟡 MEDIUM | Restrict to known domains |
| 9 | NEXT_PUBLIC_ vars — no sensitive values | 🟢 PASS | — |
| 10 | .env.example — clean | 🟢 PASS | — |
| 11 | robots.txt — properly configured | 🟢 PASS | — |
| 12 | Security headers — mostly complete | 🟢 PASS | Add HSTS |
| 13 | Error responses — no leakage | 🟢 PASS | — |
| 14 | API routes noindex tagged | 🟢 PASS | — |

---

## Priority Order

1. **RIGHT NOW:** Rotate `ADMIN_API_KEY` and Reddit password. Deploy the rotation.
2. **TODAY:** Run BFG to expunge secrets from git history, force-push.
3. **THIS WEEK:** `npm audit fix` to address high-severity vuln chain.
4. **NEXT SPRINT:** CSP hardening (nonce-based scripts, restrict img/media sources), add HSTS.
5. **BACKLOG:** Clean up hardcoded LAN IP, decouple CORS from NEXT_PUBLIC_ vars.
