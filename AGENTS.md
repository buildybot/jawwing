# AGENTS.md — Jawwing Project Knowledge Base

> This file is the single source of truth for any AI agent working on Jawwing.
> Read this FIRST before making any changes.

## What is Jawwing?

Anonymous, location-based social app. Think Yik Yak for 2026. Users post short text (300 char max) tied to their GPS location. No accounts required. Posts expire in 24 hours. AI-only moderation via a public Constitution. 18+ USA only.

## Repositories

| Repo | Path | GitHub | Purpose |
|------|------|--------|---------|
| **Web** | `/Users/buildy/.openclaw/workspace/jawwing` | `github.com/buildybot/jawwing` (private) | Next.js 16 web app + ALL API routes |
| **Mobile** | `/Users/buildy/.openclaw/workspace/jawwing-mobile` | `github.com/buildybot/jawwing-mobile` (private) | Expo React Native app |

**CRITICAL:** Both repos are PRIVATE. Never expose API keys in code.

## Architecture

```
┌─────────────┐     ┌─────────────┐
│  Web App    │     │ Mobile App  │
│ (Next.js)   │     │ (Expo RN)   │
└──────┬──────┘     └──────┬──────┘
       │                    │
       │    ALL API calls   │
       └────────┬───────────┘
                │
        ┌───────▼────────┐
        │  API Routes    │
        │ /api/v1/*      │
        │ (Next.js)      │
        └───────┬────────┘
                │
    ┌───────────┼───────────┐
    │           │           │
┌───▼──┐  ┌────▼───┐  ┌───▼────┐
│Turso │  │ Vercel │  │Anthropic│
│(DB)  │  │ Blob   │  │(Haiku) │
└──────┘  │(images)│  │(mod)   │
          └────────┘  └────────┘
```

**The API is the shared layer.** Both web and mobile hit the same REST endpoints. Mobile calls `https://www.jawwing.com/api/v1/*`. Web calls `/api/v1/*` (relative).

## Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Web framework | Next.js 16 | App Router, TypeScript |
| Mobile | Expo SDK 55, React Native 0.83.2, React 19.2 | Standalone repo |
| Database | Turso (libsql) | SQLite-compatible, edge-replicated |
| ORM | Drizzle ORM | **drizzle-kit push is BROKEN** — use raw SQL for migrations |
| Image storage | Vercel Blob | Store: `jawwing-images` (store_EQISgfmkVD2J7Efe) |
| Moderation AI | Claude Haiku 4.5 (Anthropic) | Primary. Fallback: Groq Llama → Gemini Flash |
| Email | Resend | Verification codes from `noreply@jawwing.com` |
| Hosting | Vercel | Auto-deploys on `git push` to main |
| Auth | Passwordless email | 6-digit code → JWT (365 days) |

## Deployment

**Just `git push` to main.** Vercel auto-deploys. Do NOT run `npx vercel --prod`.

- **Production URL:** https://www.jawwing.com
- **Vercel project:** `prj_8DGZQnLdcS1UyPICIoCHYNrxScqT` under scope `buildys-projects-02e31647`
- **Branch:** `main` only

## Environment Variables (Vercel)

All secrets live in Vercel project settings. NEVER hardcode.

| Variable | Purpose |
|----------|---------|
| `TURSO_DATABASE_URL` | `libsql://jawwing-buildybot.aws-us-east-1.turso.io` |
| `TURSO_AUTH_TOKEN` | Turso auth |
| `ANTHROPIC_API_KEY` | Claude Haiku moderation (PRIMARY) |
| `GEMINI_API_KEY` | Gemini Flash moderation (fallback for images) |
| `JWT_SECRET` | Signs account JWTs + encrypts emails |
| `EMAIL_HASH_SALT` | SHA-256 salt for email dedup |
| `PHONE_HASH_SALT` | Legacy (unused) |
| `RESEND_API_KEY` | Email delivery |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob image storage |
| `ADMIN_API_KEY` | `$ADMIN_API_KEY (env var)` — admin API access |
| `NEXT_PUBLIC_APP_URL` | `https://www.jawwing.com` |
| `NEXT_PUBLIC_APP_NAME` | `Jawwing` |

**Local dev:** Copy needed vars to `.env.local` (gitignored).

## Database Schema

Schema at `packages/db/schema.ts`. Key tables:

| Table | Purpose |
|-------|---------|
| `posts` | All posts. Status: pending → active/moderated/removed |
| `accounts` | Optional email accounts (email_hash + email_encrypted) |
| `votes` | Deduplicated by voter_hash (IP) or account_id |
| `replies` | Threaded comments, max 4 levels |
| `mod_actions` | Every AI moderation decision with reasoning |
| `reports` | User reports with 6 reason categories |
| `blocks` | Server-side user blocks (by hash or account) |
| `banned_ips` | IP bans |
| `uploads` | Image upload metadata |
| `saved_posts` | Bookmarks (account-linked) |
| `notifications` | In-app notifications |
| `territories` | H3 hex territories (721 hexes for DC Metro) |

**Schema changes:** drizzle-kit push is broken. Use raw SQL via `@libsql/client`:
```typescript
import { createClient } from "@libsql/client";
const client = createClient({ url: process.env.TURSO_DATABASE_URL!, authToken: process.env.TURSO_AUTH_TOKEN });
await client.execute("ALTER TABLE posts ADD COLUMN new_col TEXT");
```

## Monorepo Packages

| Package | Path | Exports |
|---------|------|---------|
| `@jawwing/db` | `packages/db/` | Schema, Drizzle client, nanoid, now() |
| `@jawwing/api` | `packages/api/` | Auth, accounts, anonymous ID, rate limiting, geo, validation |
| `@jawwing/mod` | `packages/mod/` | Moderation engine, automod, reviewer, constitution rules |

## API Routes

All under `apps/web/src/app/api/`. Key routes:

### Public
- `GET /api/v1/posts` — Feed (modes: radius/territory/everywhere, sorts: hot/new/top)
- `GET /api/v1/posts/[id]` — Single post detail
- `POST /api/v1/posts` — Create post (requires lat/lng, goes through moderation staging)
- `POST /api/v1/posts/[id]/vote` — Vote (+1/-1)
- `GET /api/v1/posts/[id]/replies` — Comments
- `POST /api/v1/posts/[id]/replies` — Add comment
- `GET /api/v1/posts/[id]/mod` — Public moderation decision (transparency)
- `POST /api/v1/reports` — Report a post/reply
- `GET /api/v1/og?url=` — OG metadata for link previews
- `POST /api/v1/upload` — Image upload to Vercel Blob

### Auth
- `POST /api/auth/send-code` — Send 6-digit code via Resend
- `POST /api/auth/verify` — Verify code, issue JWT
- `GET /api/auth/me` — Current account info
- `POST /api/auth/logout` — Clear JWT cookie

### Admin (requires `x-admin-key` header OR admin JWT)
- `GET /api/v1/admin/dashboard` — Stats overview
- `GET/POST/DELETE /api/v1/admin/posts` — CRUD posts
- `POST /api/v1/admin/posts/[id]/remove` — Remove post
- `POST /api/v1/admin/posts/[id]/restore` — Restore post
- `GET /api/v1/admin/users` — User list
- `POST/DELETE /api/v1/admin/users/[id]/ban` — Ban/unban
- `POST /api/v1/admin/votes` — Set score directly
- `POST /api/v1/admin/moderate` — Trigger moderation on existing posts
- `POST /api/v1/admin/upload` — Upload with admin key

## Moderation Pipeline

```
User posts → status="pending" (NOT in feed)
    → Claude Haiku 4.5 reviews against Constitution
    → APPROVED → status="active" (visible in feed), confidence stored
    → FLAGGED → status="moderated" (hidden, admin can review)
    → REMOVED → status="removed" (hidden)
    → AI FAILS → auto-approve with confidence=0 (fallback)
```

**Provider priority:** Anthropic Haiku → Groq Llama 3.3 70B → Gemini 2.5 Flash → auto-approve
**Engine:** `packages/mod/engine.ts` — system prompt includes full Constitution rules
**Constitution:** `apps/web/src/app/constitution/page.tsx` — 8 articles

### Constitution Articles
1. Core Principles (free expression default, transparency, no human mods)
2. Prohibited Content (hate speech, violence threats, doxxing, CSAM, spam, illegal, NSFW/II.6)
3. Permitted Content (criticism, dark humor, unpopular opinions)
4. Moderation Process (AI review, appeals, image moderation, spam detection)
5. Feed Algorithm (HOT formula, Wilson Score, distance weighting, scopes)
6. Location and Privacy (coordinate fuzzing, IP hashing, anti-spoofing)
7. AI Technology (Claude Haiku 4.5, model requirements, change policy)
8. Amendments (community voting process)

## Design System

**READ:** `docs/STYLE_GUIDE.md` before touching any UI.

Quick rules:
- Pure B&W: `#000000` bg, `#FFFFFF` text
- `border-radius: 0` EVERYWHERE (enforced via `* { border-radius: 0 !important }`)
- Monospace font: `var(--font-mono)` (web), `Courier` (iOS), `monospace` (Android)
- No shadows, no gradients, no color (except: #FF3333 for flags, #22C55E/#EAB308/#EF4444 for mod badges)
- Uppercase letter-spaced labels
- Gray text: `#888888` (NOT #555), muted: `#AAAAAA` (NOT #777)
- WCAG AA contrast required
- Sharp corners. Brutalist. Monochrome.

## Auth System

**Passwordless.** No passwords exist.
1. User enters email → `POST /api/auth/send-code`
2. 6-digit code sent via Resend → `POST /api/auth/verify`
3. JWT cookie set (365 days) → user is "signed in"
4. Posts/votes/replies tagged with `account_id` when signed in

**Anonymous by default:** The app works without ANY sign-in. IP-hash identifies anonymous users.

## Admin

- **Only admin:** `benl1291@gmail.com` (`is_admin=1` in accounts table)
- **Admin dashboard:** `/admin` (JWT-gated, checks `is_admin`)
- **Admin API:** `x-admin-key: $ADMIN_API_KEY (env var)` header bypasses rate limits + auth

## Feed Behavior

- **Scopes:** LOCAL (5km), METRO (territory or 30km for remote cities), COUNTRY (everywhere)
- **Sort:** HOT (Wilson Score × distance boost × time decay), NEW (chronological), TOP (engagement)
- **Auto-expand:** If <10 posts, progressively widens radius
- **46 hardcoded metro cities** in `TerritorySelector.tsx` (web) and `CityPicker.tsx` (mobile)
- **GPS required for posting**, optional for browsing/voting
- **Posts expire 24h** (seed posts: 30 days)

## Mobile App Sync Rules

**The mobile app MUST stay in sync with the web app on ALL API contracts.**

- Mobile calls `https://www.jawwing.com/api/v1/*` — same endpoints as web
- When you add/change an API response field, update BOTH:
  - Web: `apps/web/src/lib/api.ts` (Post interface, etc.)
  - Mobile: `jawwing-mobile/lib/api.ts` (Post type, etc.)
- When you add a new feature to web, plan the mobile equivalent
- Mobile auth uses `Authorization: Bearer <token>` (not cookies)
- Mobile identifies itself with `X-Mobile: 1` header

## Seed Data Guidelines

When seeding posts, make them HUMAN. Not "Gen Z slang chaos." Real human variety:

- **Mix of lengths:** Some one-liners, some 2-3 sentences, some just a link
- **Typos and shorthand:** "lol", "tbh", "ngl", "rn", dropped apostrophes, autocorrect errors
- **Bad grammar is OK:** Real people don't proofread 300-char anonymous posts
- **Variety of content:** Hot takes, questions, recommendations, complaints, memes, observations, pics, links
- **Images:** Candid phone-quality, NOT stock photos. Food, scenery, pets, funny signs
- **Links:** Reddit, news articles, YouTube — with OG previews
- **Location-specific:** Reference actual neighborhoods, restaurants, landmarks per city
- **NOT:** Polished marketing copy, all-lowercase aesthetic, forced Gen Z slang, emoji spam

## Key Decisions Log

- **Separate repos** for web and mobile (React version conflicts in monorepo)
- **Drizzle-kit push broken** — raw SQL for all schema changes
- **Client-side HOT sort** — server returns posts, client sorts by hotScore × distanceBoost
- **Coordinate fuzzing** — real coords rounded + noise for privacy, H3 computed from originals
- **Email never stored plaintext** — SHA-256 hash (dedup) + AES-256-GCM (decrypt when needed)
- **Posts start as "pending"** — moderation gates them to "active" before feed visibility
- **Admin posts bypass moderation** — created directly as "active"

## Common Pitfalls

1. **Don't use drizzle-kit push** — it's broken. Raw SQL only.
2. **Don't hardcode secrets** — use env vars. We lost $4.70 from a committed API key.
3. **Don't `npx vercel --prod`** — just `git push`. Vercel auto-deploys.
4. **Don't forget mobile** — API changes affect both platforms.
5. **`setImmediate`/`setTimeout` don't survive Vercel serverless** — use `await` for anything that must complete.
6. **SQLite can't ALTER DROP FK** — recreate tables with CREATE→INSERT→DROP→RENAME pattern.
7. **In-memory rate limiting resets on cold start** — needs Redis for scale.
8. **Build before push:** `cd apps/web && npx next build` — must pass.
