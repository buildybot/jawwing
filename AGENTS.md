# AGENTS.md - Jawwing Project Agent Context

## What is Jawwing?
Anonymous, location-based social app. "Yik Yak for 2026." GPS-locked posting, AI-only moderation, 24-hour expiring posts. No accounts required.

## Repositories

### Web App (main repo)
- **Path:** `/Users/buildy/.openclaw/workspace/jawwing`
- **GitHub:** `https://github.com/buildybot/jawwing.git` (private)
- **Stack:** Next.js 15, React 19, TypeScript
- **Deploy:** Vercel auto-deploy on push to `main`
- **Production:** https://www.jawwing.com
- **Vercel project:** `prj_8DGZQnLdcS1UyPICIoCHYNrxScqT` under `buildys-projects-02e31647`

### Mobile App (separate repo)
- **Path:** `/Users/buildy/.openclaw/workspace/jawwing-mobile`
- **GitHub:** `https://github.com/buildybot/jawwing-mobile.git` (private)
- **Stack:** Expo SDK 55, React Native 0.83, React 19
- **EAS project:** `@benlyddane/jawwing` (ID: `2851ae36-4fab-4197-b1d3-2bfab97e2e6a`)
- **API:** All data via `https://www.jawwing.com/api/v1/*` (no local DB)

## Database
- **Provider:** Turso (libSQL)
- **URL:** `libsql://jawwing-buildybot.aws-us-east-1.turso.io`
- **Auth:** env var `TURSO_AUTH_TOKEN`
- **ORM:** Drizzle (`packages/db/schema.ts`)
- **IMPORTANT:** drizzle-kit push is BROKEN for this project. Use raw SQL via `@libsql/client` for all schema changes.
- **Schema changes pattern:**
  ```javascript
  const { createClient } = require('@libsql/client');
  const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
  await db.execute('ALTER TABLE posts ADD COLUMN new_col TEXT');
  ```

### Key Tables
- `posts` — id, content, lat, lng, h3_index, score, upvotes, downvotes, reply_count, created_at, expires_at, status, ip_hash, image_url, image_width, image_height, video_url, video_thumbnail, account_id
- `votes` — id, post_id, voter_hash, ip_hash, value, created_at
- `replies` — id, post_id, parent_reply_id, content, ip_hash, created_at
- `reports` — id, post_id, reply_id, reporter_hash, ip_hash, reason, created_at
- `territories` — id, name, center_lat, center_lng, h3_indexes
- `accounts` — optional sign-in (email hash + encrypted)
- `banned_ips`, `uploads`, `api_keys`, `constitution_versions`, `constitution_amendments`, `mod_actions`

## Image Storage
- **Provider:** Vercel Blob
- **Store:** jawwing-images (store_EQISgfmkVD2J7Efe, iad1)
- **Token:** env var `BLOB_READ_WRITE_TOKEN` (set on Vercel)
- **Upload route:** POST `/api/v1/upload` (user uploads), POST `/api/v1/admin/upload` (admin, downloads URL to blob)
- **URLs look like:** `https://eqisgfmkvd2j7efe.public.blob.vercel-storage.com/...`

## Environment Variables (Vercel Production)
```
TURSO_DATABASE_URL     — Turso connection string
TURSO_AUTH_TOKEN       — Turso JWT auth token
JWT_SECRET             — For optional account auth
PHONE_HASH_SALT        — Legacy (unused now)
EMAIL_HASH_SALT        — For email hashing
RESEND_API_KEY         — Email verification via Resend
GEMINI_API_KEY         — AI moderation (Gemini 2.5 Flash)
BLOB_READ_WRITE_TOKEN  — Vercel Blob storage
ADMIN_API_KEY          — Admin routes auth (***REDACTED_ADMIN_KEY***)
NEXT_PUBLIC_APP_URL    — https://www.jawwing.com
NEXT_PUBLIC_APP_NAME   — Jawwing
```
Local env: `.env.local` at repo root (gitignored). NEVER commit secrets.

## API Routes
### Public
- `GET  /api/v1/posts` — Feed (requires lat, lng; modes: radius, territory, everywhere)
- `POST /api/v1/posts` — Create post (requires lat, lng, content; anonymous, IP-based)
- `POST /api/v1/vote` — Upvote/downvote
- `GET  /api/v1/replies?post_id=` — Get comments
- `POST /api/v1/replies` — Post comment
- `POST /api/v1/report` — Report post/reply
- `POST /api/v1/upload` — Image upload (Vercel Blob)
- `GET  /api/v1/territories` — List territories
- `GET  /api/v1/constitution` — Current constitution

### Admin (x-admin-key header required)
- `POST   /api/v1/admin/posts` — Seed posts (bypasses rate limit, spoofing, moderation)
- `DELETE /api/v1/admin/posts` — Delete posts (single or all)
- `POST   /api/v1/admin/votes` — Set scores directly
- `POST   /api/v1/admin/upload` — Download URL to Vercel Blob

### Auth (optional)
- `POST /api/auth/send-code` — Send email verification
- `POST /api/auth/verify` — Verify code, get JWT

## Moderation
- **Engine:** `packages/mod/engine.ts` — `reviewPost()` function
- **Model:** Gemini 2.5 Flash (fire-and-forget, async after post creation)
- **Constitution:** `docs/MOD_CONSTITUTION.md` (9 articles)
- **Flow:** Post created → returned to user immediately → `reviewPost()` runs async → if rejected, post status set to 'removed'
- **Transparency:** `/transparency` page shows moderation actions

## Feed Algorithm
- **HOT:** Wilson Score + engagement boost + controversy bonus + time decay + distance boost
- **NEW:** Chronological
- **TOP:** Total engagement (upvotes + downvotes)
- **Scopes:** LOCAL (5km) / METRO (territory) / COUNTRY (everywhere)
- **Auto-expand:** If <10 posts, progressively widen: 5km → 10km → 20km → territory → everywhere
- **Distance boost:** `1 / (1 + distKm / scale)^0.5` where scale varies by scope

## Style Guide
- **Location:** `docs/STYLE_GUIDE.md`
- Pure B&W (#000/#FFF), NO colors except #FF3333 for report flags
- Sharp corners (border-radius: 0) everywhere
- Monospace, uppercase, letter-spaced labels
- No shadows, no gradients
- Secondary text: #888888, tertiary: #AAAAAA
- NO em dashes in static UI text (allowed in user-generated content)
- WCAG AA contrast minimum

## Key Architecture Decisions
- **Truly anonymous:** IP-based identity, session cookies, no accounts required
- **GPS-locked posting:** Can browse anywhere, can only POST from current location
- **24h expiry:** Posts expire, seed posts extended to 30 days
- **Territory-based:** H3 hexagons at resolution 7, ring size 5 (~10km)
- **DC Metro default:** Fallback when GPS unavailable (38.9072, -77.0369)
- **Client-side sort:** API returns posts, client applies HOT algorithm with distance boost
- **Fire-and-forget moderation:** Don't block post creation on AI review
- **Monorepo for web only:** Mobile app is separate repo, shares nothing but the API

## Testing
- **iOS Simulator:** Xcode installed on Mac mini, boot with `xcrun simctl boot "iPhone 17 Pro"`
- **Mobile dev server:** `cd jawwing-mobile && npx expo start --go --lan`, press `i` for simulator
- **Web dev:** `cd jawwing/apps/web && npx next dev`
- **Build check:** `cd jawwing/apps/web && npx next build`

## Common Gotchas
- `ignoreBuildErrors: true` in next.config.ts (some pre-existing TS strict errors)
- Drizzle schema must match actual DB columns — if you add a column via raw SQL, also update `packages/db/schema.ts`
- Vercel auto-deploys on git push to main — just push, don't run `npx vercel --prod`
- Rate limiting is per-IP, aggressive — use admin routes for bulk operations
- Teleportation check blocks rapid location jumps — admin routes bypass this
- The mobile app's `lib/api.ts` `request()` function returns raw JSON — API wraps posts in `{ posts: [], meta: {} }`
- PostCard `image_url` must be in BOTH the TypeScript interface AND the data mapping function
