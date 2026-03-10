# JAWWING — PRODUCTION MASTER PLAN
> What's real, what's fake, what needs to happen before launch.
> Updated: 2026-03-10

## E2E Test Results (Just Run)

### API Endpoints
| Endpoint | Status | Notes |
|---|---|---|
| GET /api/health | ✅ 200 | DB connected |
| GET /api/v1/posts (hot/new/top) | ✅ 200 | All sort modes work |
| POST /api/v1/posts | ✅ 201 | Anonymous posting works |
| POST /api/v1/posts/[id]/vote | ✅ 201 | IP-based dedup |
| POST /api/v1/posts/[id]/replies | ✅ 201 | Threaded comments |
| GET /api/v1/posts/[id]/replies | ✅ 200 | Returns nested |
| POST /api/v1/reports | ✅ 201 | Fixed FK constraint |
| GET /api/v1/territories | ✅ 200 | DC Metro live |
| GET /api/v1/mod/constitution | ✅ 200 | Full rules |
| GET /api/v1/mod/actions | ✅ 200 | Transparency |
| POST /api/v1/upload | ⚠️ Untested | Needs BLOB_READ_WRITE_TOKEN on Vercel |
| GET /api/v1/constitution/versions | ✅ 200 | v1.0 seeded |
| POST /api/v1/constitution/amendments | ⚠️ Untested | Needs auth cleanup |

### Pages
| Page | Status | Notes |
|---|---|---|
| / (feed) | ✅ 200 | Loads instantly, 25+ posts |
| /about | ✅ 200 | Updated for anonymous model |
| /constitution | ✅ 200 | All sections + video sources |
| /transparency | ✅ 200 | Mod actions log |
| /terms | ✅ 200 | Updated |
| /privacy | ✅ 200 | Updated for IP/cookie model |
| /login | ✅ 307 | Redirects to / |
| /post/[id] | ✅ 200 | Detail + comments |
| /404 | ✅ 404 | Custom page |

### Core Features Verified
| Feature | Web | Mobile App |
|---|---|---|
| View feed | ✅ Works | ❌ Not tested |
| Create post | ✅ Works | ❌ Not tested |
| Vote | ✅ Works | ❌ Not tested |
| Comment | ✅ Works | ❌ Not tested |
| Report | ✅ Works | ❌ Not tested |
| Image upload | ⚠️ Needs Vercel Blob token | ❌ Not built |
| Location detection | ⚠️ Falls back to DC Metro | ❌ Not tested |
| Share | ✅ Clipboard copy | ❌ Not tested |

---

## CRITICAL GAPS (Must Fix Before Launch)

### 1. Location — Actually Working?
**Status:** Partially. Browser GPS prompt fires, but if denied or unavailable, falls back to DC Metro. This is fine for DC launch but:
- [ ] Test GPS on real iPhone Safari (not just desktop Chrome)
- [ ] Test GPS on real Android Chrome
- [ ] Verify H3 hex assignment is correct for actual GPS coords
- [ ] Handle "location denied" gracefully (not just silent fallback)
- [ ] Add "You're posting from [NEIGHBORHOOD]" confirmation before post

### 2. Mobile App — Not Production Ready
**Status:** Code exists but untested on device.
- [ ] Update Expo app for anonymous model (remove all auth flows)
- [ ] Configure EAS build (eas.json)
- [ ] Build iOS TestFlight version
- [ ] Build Android internal APK
- [ ] Test core loop on real devices
- [ ] Add "Download the App" section on website
- [ ] QR code on /about page linking to App Store / TestFlight

### 3. App Store Compliance
**Status:** Not submitted. Key risks:
- [ ] Apple Guideline 1.2 — anonymous social apps get extra scrutiny
  - Mitigation: emphasize AI moderation, public constitution, reporting
  - May need device-level identity (IDFV) for ban enforcement
- [ ] Block/mute functionality — REQUIRED by Apple for UGC apps
  - Need: "Hide this user's posts" (by session cookie or device)
- [ ] Age gate — 17+ rating, may need age confirmation on first launch
- [ ] Content reporting must be visible and easy — ✅ (flag on every post)
- [ ] Privacy nutrition labels — must be accurate

### 4. Image Upload on Production
- [ ] Set BLOB_READ_WRITE_TOKEN on Vercel (Vercel Blob storage)
- [ ] Test upload → storage → display → moderation pipeline
- [ ] Verify Gemini multimodal moderation fires on images

### 5. AI Moderation — Actually Firing?
**Status:** Code exists but not verified on production.
- [ ] Verify GEMINI_API_KEY works on Vercel
- [ ] Post something borderline, check if mod engine runs
- [ ] Post something that should be flagged, verify it gets caught
- [ ] Check /transparency for mod action logs
- [ ] Test the appeal flow

### 6. Push Notifications
**Status:** Not built.
- [ ] Web push via Service Worker (notify of replies to your posts)
- [ ] Expo push notifications for mobile
- [ ] This is a P2 for soft launch — not blocking

---

## PRODUCTION READINESS WORK PLAN

### Phase 1: Web Launch Ready (This Week)
Priority: Get jawwing.com fully working with zero fake fallbacks.

**Day 1 (Today):**
- [x] E2E test all API endpoints ✅
- [x] E2E test all pages ✅
- [x] Fix reports FK constraint ✅
- [x] Refresh seed content ✅
- [ ] Set BLOB_READ_WRITE_TOKEN on Vercel
- [ ] Test image upload on production
- [ ] Verify AI moderation fires (post + check /transparency)
- [ ] Test location on real mobile browser (Ben's phone)

**Day 2:**
- [ ] Add block/mute feature (hide posts by session, stored in localStorage)
- [ ] Add age confirmation modal on first visit (17+)
- [ ] Fix any issues found from Day 1 testing
- [ ] Test on iPhone Safari, Android Chrome, desktop Firefox

**Day 3:**
- [ ] Add QR code to /about page (links to jawwing.com)
- [ ] Add "OPEN ON YOUR PHONE" banner when on desktop
- [ ] Stress test: 50 rapid posts, verify rate limiting works
- [ ] Verify 24h post expiry cron runs correctly
- [ ] Final visual polish pass

### Phase 2: Mobile App (Next Week)
- [ ] Update Expo codebase for anonymous model
- [ ] Configure EAS build
- [ ] TestFlight build
- [ ] Test on real iPhone
- [ ] Test on real Android
- [ ] Prepare App Store metadata
- [ ] Submit to App Store review

### Phase 3: Soft Launch DC (Week After)
- [ ] 50+ seed posts live
- [ ] AI agents posting 10/day
- [ ] Campus seeding (GWU, Georgetown, UMD)
- [ ] TikTok content production begins
- [ ] Monitor metrics daily

---

## APP STORE STRATEGY

### Anonymity Level
Yik Yak required phone number verification. We currently require nothing.

**Recommendation:** Add optional "device registration" using IDFV (iOS) / Android ID:
- NOT for user identity — for ban enforcement
- If a device is banned, it stays banned (can't just clear cookies)
- This satisfies Apple's requirement for user management
- Still anonymous — device ID is never shown to anyone

### Required Features for Apple Approval
1. ✅ Content moderation (AI + public constitution)
2. ✅ Report button on every post
3. ❌ Block/mute functionality (MUST ADD)
4. ❌ Age gate (MUST ADD)
5. ✅ Privacy policy (jawwing.com/privacy)
6. ✅ Terms of service (jawwing.com/terms)

### App Store Review Notes (Draft)
```
Jawwing is an anonymous, location-based community platform.

MODERATION: All content is reviewed by AI agents governed by a publicly 
available Mod Constitution (jawwing.com/constitution). Every moderation 
decision is logged and viewable at jawwing.com/transparency.

REPORTING: Every post and comment has a visible report flag (⚑). Reports 
are reviewed by AI within seconds. Posts with 3+ reports trigger mandatory 
re-review.

SAFETY: Zero-tolerance for CSAM, credible threats, and doxxing. Users can 
block/mute other users' content. Location is used only while the app is 
active to determine the local feed.

AGE RATING: 17+ (user-generated content)
```

---

## HONEST GAPS ASSESSMENT

| Area | Status | Risk Level |
|---|---|---|
| Web core loop | ✅ Working | Low |
| Web polish | ✅ Good | Low |
| DB + API | ✅ Solid | Low |
| AI moderation | ⚠️ Unverified on prod | Medium |
| Image upload | ⚠️ Missing Vercel token | Medium |
| Location accuracy | ⚠️ Untested on mobile | Medium |
| Mobile app | ❌ Not tested | High |
| App Store compliance | ❌ Missing block/mute + age gate | High |
| Push notifications | ❌ Not built | Low (P2) |
| Error monitoring | ❌ No Sentry/logging | Medium |
