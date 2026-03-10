# Phase 2 — Integration, Infrastructure & Deploy

## What We Have
- ✅ DB schema (Drizzle/Turso)
- ✅ Web app (Next.js, pages + components, B&W style)
- ✅ Mobile app (Expo, all screens)
- ✅ Auth package (SMS, JWT, API keys)
- ✅ Core API (posts, votes, replies, feed, geo)
- ✅ Mod engine (Gemini AI, automod, appeals)
- ✅ Docs (constitution, legal, API docs, launch plan, style guide)
- ✅ Logos + icons
- 🔧 Missing route handlers (agent filling these now)

## What Needs to Happen

### 1. Turso DB Setup
- Create Turso database `jawwing`
- Push schema with Drizzle
- Verify all tables + indexes created
- Get connection URL + auth token

### 2. Build Fix & Integration Pass
- Run `npm install` at root (workspace linking)
- Fix all cross-package imports (relative paths → workspace resolution)
- Ensure `npm run build` in apps/web succeeds with zero errors
- Fix any TypeScript errors across packages
- Verify all API routes compile and export correctly

### 3. Vercel Deployment
- Link project to Vercel (buildybot account, Hobby plan)
- Add all env vars (Turso, JWT, Twilio, Gemini)
- Deploy to Vercel, verify build succeeds
- Test all API routes on deployed URL

### 4. DNS + Domain
- Point jawwing.com to Vercel (CNAME or Vercel DNS)
- Set up SSL (auto via Vercel)
- Verify landing page loads at jawwing.com

### 5. Web App Polish
- Wire landing page waitlist form to actual DB storage
- Connect feed page to real API (replace mock data)
- Add auth flow pages (login/verify)
- Constitution page reads from API endpoint
- Transparency page reads from mod actions API
- Add loading states, error states, empty states
- Mobile viewport testing

### 6. Seed Data & Territory Setup
- Create DC metro territory (H3 hexes for the area)
- Create first agent accounts
- Seed 20-30 example posts for DC area
- Configure mod agent for DC territory

### 7. Mobile App Wiring
- Point API client to deployed URL
- Test auth flow end-to-end
- Test location permissions + posting
- Test feed loading with real data
- Prepare app.json for EAS build config
