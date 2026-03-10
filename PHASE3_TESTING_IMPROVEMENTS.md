# Phase 3 — Testing, Fixes & Improvements

## Critical Fixes (Must-Have Before Launch)

### 1. Security Hardening
- [ ] Add Cloudflare Turnstile (invisible captcha) to phone verification
- [ ] Add CORS config to all API routes (restrict to jawwing.com + localhost)
- [ ] Add request body validation/sanitization on all POST endpoints (zod)
- [ ] Add CSP headers (Content-Security-Policy)
- [ ] Rate limit on send-code endpoint specifically (prevent SMS bombing)
- [ ] Input sanitization — XSS prevention on post content rendering
- [ ] Add CSRF protection for auth routes

### 2. Error Handling & Edge Cases
- [ ] All API routes need consistent error response format
- [ ] Handle expired JWT tokens gracefully (auto-redirect to login)
- [ ] Handle network errors in frontend (offline state, retry logic)
- [ ] Handle location permission denied gracefully (show territory picker instead)
- [ ] Validate post content isn't just whitespace
- [ ] Handle duplicate vote attempts properly
- [ ] 404 pages for missing posts, bad routes

### 3. Territory System UX
- [ ] Territory selector dropdown in header (browse other cities)
- [ ] GPS-locked posting (can only post where you are)
- [ ] Territory browsing (can read any territory)
- [ ] Show territory name on each post card
- [ ] "Near Me" vs "Territory" view toggle
- [ ] Territory stats (post count, active users)

### 4. Auth Flow Improvements  
- [ ] "Remember me" — persist JWT in httpOnly cookie (not just localStorage)
- [ ] Session refresh (auto-renew before expiry)
- [ ] Logout route that clears session
- [ ] Protected route wrapper component
- [ ] Redirect to original page after login

### 5. Feed & Post Improvements
- [ ] Post expiration enforcement (filter expired server-side + cron cleanup)
- [ ] Real-time-ish feed (poll every 30s for new posts)
- [ ] "New posts available" banner (like Twitter)
- [ ] Reply threading UI (nested replies)
- [ ] Post sharing (copy link)
- [ ] Character count on reply input too
- [ ] Scroll to top on tab change

### 6. Mobile App Fixes
- [ ] Wire API client to deployed URL
- [ ] Test auth flow end-to-end
- [ ] Handle location permission flows per platform (iOS vs Android)
- [ ] Deep linking (jawwing://post/123)
- [ ] Push notification setup (Expo Push)
- [ ] App icon using our generated icon.png
- [ ] Splash screen with JAWWING wordmark

### 7. Landing Page & SEO
- [ ] OG image generation for social sharing
- [ ] Waitlist form stores to DB (not just console.log)
- [ ] Waitlist confirmation response
- [ ] Analytics (Plausible or Vercel Analytics — privacy-friendly)
- [ ] Robots.txt + sitemap.xml

### 8. Mod System Testing
- [ ] Test AI review pipeline end-to-end with real Gemini calls
- [ ] Verify constitution rules JSON endpoint is correct
- [ ] Test appeal flow
- [ ] Verify transparency page shows real data
- [ ] Test report → automod → review pipeline

### 9. Performance
- [ ] Add proper DB indexes verification
- [ ] Implement connection pooling for Turso
- [ ] Cache constitution endpoint (it rarely changes)
- [ ] Optimize feed query (avoid N+1 on vote status)
- [ ] Add loading skeletons everywhere

### 10. DevOps
- [ ] GitHub Actions CI (lint + typecheck + build)
- [ ] Environment variable validation on startup
- [ ] Health check endpoint (/api/health)
- [ ] Error monitoring (Sentry or similar)
- [ ] DB backup strategy
