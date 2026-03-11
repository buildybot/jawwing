# Security Audit Plan — Jawwing

## Context
Repo is now PUBLIC at github.com/buildybot/jawwing. All code is visible. Must ensure no exploitable vulnerabilities.

## Attack Surface
- 47 API routes (public + admin + auth + cron)
- Anonymous posting (IP-based identity)
- JWT auth (passwordless email codes)
- Admin API key auth (x-admin-key header)
- Image upload (Vercel Blob)
- SQLite/Turso database (Drizzle ORM + raw SQL)
- AI moderation pipeline (Anthropic API)
- Client-side JS (Next.js React)

## Audit Teams

### Team 1: API & Input Validation
- SQL injection on ALL raw SQL queries (especially admin routes rewritten to use @libsql/client directly)
- XSS via post content, replies, user input
- Parameter tampering (lat/lng spoofing, score manipulation)
- Request body validation (Zod coverage check)
- File upload validation (type, size, content)
- Rate limiting bypass vectors
- IDOR (accessing other users' data via ID enumeration)

### Team 2: Auth & Access Control  
- JWT implementation (secret strength, expiration, algorithm)
- Admin route protection (consistent auth checks on ALL /admin/* routes)
- API key validation (timing attacks, key format)
- Session cookie security (httpOnly, secure, sameSite)
- Email verification code brute-force protection
- Account enumeration via auth endpoints
- Privilege escalation paths

### Team 3: Infrastructure & Secrets
- Git history for leaked secrets (BFG clean needed?)
- Environment variable exposure (NEXT_PUBLIC_ leaks)
- CORS configuration review
- CSP header completeness
- Security headers (HSTS, X-Frame-Options, etc)
- Dependency vulnerabilities (npm audit)
- Vercel configuration security
- robots.txt / sitemap exposure of admin routes
- Error message information leakage

### Team 4: Business Logic & Privacy
- Vote manipulation (multiple votes from same IP/session)
- Moderation bypass vectors (content that evades Haiku)
- IP hash reversibility (salt exposure risk)
- Email hash/encryption implementation review
- GPS spoofing impact
- Block/mute circumvention
- Post expiry enforcement
- Anonymous identity correlation attacks

## Output
Each team produces:
- List of findings (CRITICAL / HIGH / MEDIUM / LOW)
- Specific file + line references
- Recommended fixes
- Write findings to /Users/buildy/.openclaw/workspace/jawwing/docs/SECURITY_FINDINGS.md
