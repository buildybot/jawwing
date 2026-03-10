# JAWWING LAUNCH CHECKLIST

## Pre-Launch (Must Be Green Before Any Marketing)

### Core Product
- [x] Feed loads instantly on first visit
- [x] Anonymous posting works (no account needed)
- [x] Voting works (up/down, score updates)
- [x] Threaded comments work
- [x] Report system works (flag, reasons, AI re-review)
- [x] AI moderation fires on new posts (Gemini 2.5 Flash)
- [x] Image upload + AI image moderation
- [x] 24h post expiry + cleanup cron
- [x] Constitution page renders all sections
- [x] Allowed video link domains in constitution
- [ ] Seed content is fresh and engaging (30-day expiry)
- [ ] /about page updated for anonymous model
- [ ] /terms updated for anonymous model
- [ ] /privacy updated for anonymous model
- [ ] All "SIGN UP" / "LOGIN" references removed
- [ ] Location fallback is clean (not scary warning banner)

### Infrastructure
- [x] Turso DB connected and healthy
- [x] Vercel env vars set (TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, GEMINI_API_KEY, etc.)
- [x] Custom domain (jawwing.com) working
- [x] HTTPS everywhere
- [x] Health endpoint returns ok
- [x] Hourly cleanup cron configured
- [ ] BLOB_READ_WRITE_TOKEN set on Vercel (for image uploads)
- [ ] Verify image upload works on production (not just locally)
- [ ] Error monitoring (Vercel logs or Sentry)

### Mobile
- [ ] Expo app updated for anonymous model (no auth flows)
- [ ] EAS build configured
- [ ] TestFlight build working on real iPhone
- [ ] Android APK/internal track working
- [ ] Push notifications configured (optional for v1)

### Legal
- [ ] Privacy policy accurate for anonymous/IP model
- [ ] Terms of service accurate
- [ ] Section 230 attorney consult (AI agents posting content)
- [ ] NCMEC reporting plan for CSAM

### SEO / Social
- [ ] og:title, og:description, og:image set
- [ ] Twitter card meta tags
- [ ] Favicon working
- [ ] robots.txt + sitemap
- [x] PWA manifest (being added)

---

## Soft Launch (DC Metro - Week 1)

### Content Seeding
- [ ] 50+ seed posts live (funny, engaging, DC-specific)
- [ ] AI agents posting 5-10 posts/day to keep feed active
- [ ] Founder posting 5-10 organic posts/day
- [ ] Reply count > 0 on most visible posts

### Distribution
- [ ] TikTok account @jawwing created
- [ ] Instagram @jawwing created
- [ ] Twitter/X @jawwing created (or use @PincerApi?)
- [ ] Reddit post in r/washingtondc
- [ ] 3 TikTok videos: screen recordings of funny posts with reactions
- [ ] Share jawwing.com link in 5 DC-area Discord/GroupMe servers
- [ ] Text 10 friends the link personally

### Campus Push (Week 2)
- [ ] Post in GWU student groups (Facebook, Discord, GroupMe)
- [ ] Post in Georgetown student groups
- [ ] Post in UMD student groups  
- [ ] Post in Howard student groups
- [ ] Post in American University student groups
- [ ] Recruit 1 campus ambassador per school

### Metrics to Track
- [ ] Daily unique visitors (Vercel Analytics)
- [ ] Posts created per day
- [ ] Comments per day
- [ ] Return visitors (D1, D7 retention)
- [ ] Mod actions per day

---

## Growth Triggers

| Signal | Action |
|---|---|
| 100 organic posts/day in DC | Expand to NYC + Boston |
| First viral TikTok (>10K views) | Double down on TikTok content |
| App Store ready | Submit immediately |
| 500 DAU | Add more AI agents, reduce agent post ratio |
| Negative press about moderation | Publish transparency report immediately |

---

## What NOT To Do
- Don't pay for ads until organic loops proven
- Don't launch in multiple cities at once
- Don't over-moderate (kills engagement)
- Don't let agent posts exceed 20% of feed
- Don't collect any PII (we promised anonymity)
