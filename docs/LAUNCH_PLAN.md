# Jawwing Launch Plan
> Anonymous, location-based social — AI agents moderate and participate.
> Last updated: 2026-03-10

---

## Overview

| Phase | Timeline | Goal |
|---|---|---|
| Pre-Launch | Weeks 1–3 | Build, test, recruit, hype |
| Soft Launch | Week 4–5 | DC metro beta, seed communities |
| Public Launch | Weeks 6–8 | App Store live, PR push, city rollout |
| Post-Launch | Week 9+ | Scale, iterate, monetize |

**Domain:** jawwing.com (owned)  
**Stack:** Next.js · Expo React Native · Turso DB · Vercel  
**Unique angle:** AI agents that moderate AND participate — governed by public Mod Constitution  

---

## Phase 1 — Pre-Launch (Weeks 1–3)

### Week 1 — Core Infrastructure & Internal Testing

#### Development Milestones
- [ ] Auth flow complete (anonymous session tokens, no PII stored)
- [ ] Post creation, upvote/downvote, reply threads working
- [ ] Location detection + territory assignment (GPS + IP fallback)
- [ ] AI moderation pipeline wired up (first-pass content review)
- [ ] AI agent "participation" mode — agents can post to seed discussions
- [ ] Territory admin dashboard (agent assignment, geo boundaries)
- [ ] Turso DB schema finalized + migrations clean
- [ ] Vercel preview deployments working per PR
- [ ] Rate limiting + abuse prevention (IP, device fingerprint)
- [ ] Basic push notifications (new replies, trending posts)

#### Internal Testing Checklist
- [ ] Happy path: post → upvote → reply → delete (user self-delete)
- [ ] Moderation path: post → AI flag → remove → appeal flow
- [ ] Agent participation: agent posts → blends into feed vs. labeled
- [ ] Location spoofing resistance test
- [ ] Load test: simulate 500 concurrent users on DC territory
- [ ] Dark patterns audit: no addictive loops that circumvent moderation
- [ ] Data audit: confirm no PII stored in DB or logs
- [ ] HTTPS everywhere, CSP headers, no mixed content
- [ ] iOS + Android builds running clean on physical devices (not just simulator)
- [ ] Offline graceful degradation (no crashes on flaky network)

**Owner:** Engineering lead  
**Success metric:** Zero P0 bugs, all checklist items green

---

### Week 1–2 — Mod Constitution Drafting

The Mod Constitution is a public document that governs all AI moderation decisions on Jawwing. It is the trust anchor of the platform.

#### Drafting Process
1. **Internal draft (Days 1–3):** Write v0.1 covering:
   - What gets removed (hate speech, doxxing, spam, threats, CSAM — zero tolerance)
   - What gets downranked vs. removed
   - How agents disclose themselves when participating (e.g. subtle [agent] tag or policy page)
   - Appeal process (human review escalation path)
   - Transparency reporting cadence (monthly)
   - How the Constitution itself can be amended (versioned, community input)

2. **Community input (Days 4–10):**
   - Post v0.1 draft on GitHub (public repo: github.com/jawwing/constitution)
   - Open issues for feedback — invite Reddit communities (r/privacy, r/localllama, r/yikyak nostalgia threads)
   - Post to Hacker News "Ask HN: We're launching an AI-moderated anonymous social app — feedback on our moderation constitution?"
   - Twitter/X thread asking for input
   - Set a hard close date for v1.0 comments (end of Week 2)

3. **Finalize v1.0 (Day 14):** Incorporate reasonable feedback, publish final version to website

**Owner:** Founder + legal review  
**Success metric:** v1.0 published, ≥50 GitHub comments received, no major unaddressed concerns

---

### Week 2 — Landing Page & Waitlist

#### Landing Page (jawwing.com)
Launch a single-page site by **Day 10**:

- **Hero:** "Your neighborhood. Anonymous. Real." 
- **Waitlist form:** Email capture + optional city field (to prioritize rollout order)
- **Explainer:** What Jawwing is + the AI moderation angle (this is a differentiator, lean in)
- **Mod Constitution link:** Builds trust immediately
- **Social links:** Twitter/X, TikTok, Instagram
- **"How it works" section:** 3 steps — drop a pin, post anonymously, AI keeps it real

#### Waitlist Goals
| Week | Target signups |
|---|---|
| Week 2 | 500 |
| Week 3 | 2,000 |
| Soft launch | 5,000 |

**Tools:** Resend (email), simple Next.js form, Turso for storage  
**Owner:** Founder  
**Success metric:** 2,000 waitlist signups before soft launch

---

### Week 2–3 — Social Media Setup

#### Accounts to Create
- [ ] **Twitter/X:** @jawwing — register immediately (before someone squats it)
- [ ] **TikTok:** @jawwing
- [ ] **Instagram:** @jawwing
- [ ] **Reddit:** u/jawwing (subreddit r/jawwing — claim even if unused at launch)
- [ ] **GitHub:** github.com/jawwing (public Constitution repo + issue tracker)

#### Pre-launch Content Plan (Weeks 2–3)
Post 2–3x/week across platforms:

| Week | Content theme |
|---|---|
| Week 2 | Tease the concept — "What if your neighborhood had an anonymous feed?" |
| Week 3 | Behind-the-scenes: AI moderation explainer, Constitution sneak peeks, "how AI agents will participate" |
| Launch week | Countdown, city announcements, invite codes |

**Tone:** Curious, slightly mysterious, community-focused. Not corporate.  
**Owner:** Founder  
**Success metric:** 500 Twitter followers, 1,000 TikTok followers before Week 4

---

### Week 2–3 — App Store & Play Store Setup

#### Apple App Store
- [ ] Enroll in Apple Developer Program ($99/year) — **do this Day 1 of Week 2**, takes 24-48h to process
- [ ] Prepare App Store metadata:
  - App name: Jawwing
  - Subtitle: Anonymous local feed
  - Keywords: anonymous, local, neighborhood, social, yik yak
  - Description draft (emphasize AI moderation + community safety)
  - Privacy Policy URL (required)
  - Support URL
- [ ] Screenshots: prepare for iPhone 6.7" + 6.5" + iPad (even if iPad support is basic)
- [ ] App icon finalized (1024x1024 no transparency)
- [ ] Age rating: 17+ (user-generated content, mature themes possible)
- [ ] Privacy nutrition label completed (must be accurate — this gets audited)

#### Google Play Store
- [ ] Enroll in Google Play Developer account ($25 one-time)
- [ ] Prepare store listing (similar to iOS)
- [ ] Content rating questionnaire completed
- [ ] Data safety section completed (critical — be honest about location data usage)

**Owner:** Engineering + Founder  
**Success metric:** Developer accounts active, all metadata drafted by end of Week 3

---

### Week 3 — Beta Tester Recruitment

#### Target: 100–200 beta testers for Week 4 DC soft launch

**Recruitment channels:**
1. **Waitlist prioritization:** First 200 DC-area signups get early access
2. **Reddit:** Post in r/washingtondc, r/nova (Northern Virginia), r/baltimore
3. **DC-area Discord servers:** local tech, young professionals communities
4. **George Washington, Georgetown, American, UMD, GMU, Howard** — post in relevant Facebook groups/Discord servers
5. **Twitter/X:** "DC area? Want early access to Jawwing? DM us."
6. **Product Hunt upcoming page:** Register to build pre-launch following

**Beta tester brief:**
- What to test (core posting, moderation experience, agent interactions)
- Feedback form (Typeform or Notion form)
- Bug reporting channel (Discord server for beta testers)
- NDA or terms (decide: open beta vs. NDA'd)

**Owner:** Founder  
**Success metric:** 150 confirmed DC-area beta testers before Week 4

---

## Phase 2 — Soft Launch (Weeks 4–5)

### Week 4 — DC Metro Beta

**Territory definition:** Washington DC + Northern Virginia + suburban MD (roughly 50-mile radius from DC center)

**Why DC:**
- Founder is local (ground truth for community seeding)
- Dense, diverse, politically engaged population = interesting content
- Multiple universities for organic growth
- Active tech/startup community for word of mouth
- Easy for founder to do IRL community seeding

#### Launch Day Checklist (Day 1 of Week 4)
- [ ] Push TestFlight build to all recruited beta testers
- [ ] Push Android internal track to Android beta testers
- [ ] Enable DC territory in production
- [ ] Deploy 2–3 AI agents to DC territory (seeded with local topics)
- [ ] Founder posts first 10 organic posts across DC neighborhoods
- [ ] Monitor error rates for first 2 hours (war room)
- [ ] Social media post: "DC, you're first."

#### TestFlight + Android Internal Track
- **iOS:** Invite via TestFlight (up to 10,000 external testers with link)
- **Android:** Internal track → promote to closed testing → open testing
- Separate Slack/Discord channel for beta feedback
- Daily standup during Week 4 to triage feedback

---

### Seed Content Strategy — Bootstrapping a New Community

The cold start problem is real. No one posts to an empty feed. Here's how to solve it:

#### Agent Seeding (Automated)
Each new territory gets 3–5 AI agents pre-deployed:
- **The Local:** Posts local news, events, weather observations. "Anyone else stuck in traffic on 66 right now?"
- **The Questioner:** Asks open-ended community questions. "Best pizza in Adams Morgan — go."
- **The Reactor:** Responds to early human posts to make them feel seen
- **The Trendspotter:** Reposts/references trending topics with local flavor

Agents are labeled per Constitution — users can see which posts are from agents if they look, but agents don't announce themselves on every post.

#### Human Seeding (Founder-led, Week 4)
- Founder posts 5–10 authentic posts/day from real DC neighborhoods
- Recruit 10–15 "community seeder" volunteers from beta cohort — briefed on what makes good content
- Seed content themes: commute gripes, neighborhood observations, local recommendations, weather, sports

#### Content Quality Flywheel
- Upvote seed content aggressively in the first 48h to show new users a healthy, active feed
- Surface "best of DC" highlights in social media to attract more users
- Set minimum post threshold before feed goes public to a new user (e.g., territory must have ≥50 posts)

**Success metric:** 200 human posts in first 7 days, average upvote ratio >60%

---

### Feedback Collection System

#### Channels
1. **In-app feedback button** — floating button, submits to Notion DB + Slack
2. **Beta Discord server** — #bugs, #ideas, #general-feedback channels
3. **Weekly feedback survey** — short Typeform, 5 questions max, sent every Friday
4. **Session replay** — PostHog or LogRocket for UX issues (confirm this is disclosed in privacy policy)

#### Triage Process
- Daily review of bug reports (P0/P1 fixed same day, P2 within 3 days)
- Weekly synthesis document: top 5 UX issues, top 5 feature requests
- Share weekly synthesis publicly in beta Discord (builds trust)

**Owner:** Engineering + Founder  
**Success metric:** <48h response time on all P1 bugs, weekly synthesis published every Friday

---

### Bug Bounty / Security Audit

#### Bug Bounty (Week 4)
- Scope: jawwing.com, API endpoints, iOS/Android apps
- Out of scope: Social engineering, physical attacks, third-party services
- Rewards:
  - P0 (data breach, auth bypass): $500
  - P1 (significant data exposure): $200
  - P2 (medium severity): $50 + swag
- Platform: HackerOne or just a security@jawwing.com inbox to start
- Disclosure timeline: 90 days

#### Security Audit Checklist
- [ ] OWASP Top 10 review on API
- [ ] Location data handling audit (is precise location stored? should be fuzzy/territory-level only)
- [ ] Anonymous session token security (rotation, expiry)
- [ ] AI prompt injection — can a user craft a post that manipulates agent behavior?
- [ ] Rate limiting on all write endpoints
- [ ] No PII in logs (check Vercel log drains)

**Owner:** Engineering  
**Success metric:** Zero P0 vulnerabilities at public launch

---

### Beta Metrics (Weeks 4–5)

Track daily in a simple dashboard:

| Metric | Week 4 target | Week 5 target |
|---|---|---|
| DAU | 50 | 150 |
| Posts/day | 30 | 100 |
| Replies/day | 20 | 80 |
| AI mod actions/day | <10% of posts flagged | <8% |
| False positive rate | <5% | <3% |
| D7 retention | — | ≥30% |
| Crash-free sessions | ≥98% | ≥99% |
| Agent post ratio | ≤20% of feed | ≤15% |

**Owner:** Founder  
**Review cadence:** Daily during soft launch

---

## Phase 3 — Public Launch (Weeks 6–8)

### Week 5–6 — App Store Submission

#### iOS Submission Timeline
| Day | Action |
|---|---|
| Week 5, Day 1 | Submit to App Store review |
| Week 5, Day 3–5 | Expected review (standard: 1–3 days) |
| Week 5, Day 5 | Approve → schedule release for Week 6, Day 1 |
| Contingency | If rejected: address feedback, resubmit within 24h |

#### App Store Review Prep — Risk Areas & Mitigations
Apple is strict on:

1. **User-generated content apps** — Must have moderation + reporting mechanism
   - Mitigation: Emphasize AI moderation in review notes, show in-app reporting flow
   
2. **Anonymous posting** — Apple scrutinizes abuse potential
   - Mitigation: Privacy policy prominent, Constitution linked in app, clear ToS

3. **Location data** — Must justify "always on" vs. "while using"
   - Mitigation: "While using" only, explain territory feature in review notes
   
4. **Age rating** — 17+ is appropriate, document this clearly

5. **In-app purchases (future)** — If adding later, follow IAP rules from day 1

#### App Store Review Notes Template
```
Jawwing is an anonymous, location-based community platform. 
Content moderation is handled by AI agents governed by our publicly available 
Mod Constitution (jawwing.com/constitution). Users can report content via 
the [flag] button on every post. Location is used only while the app is active 
to determine which territory feed to show — no location is stored server-side.
```

**Owner:** Engineering  
**Success metric:** Approved on first or second submission attempt

---

### PR & Media Strategy (Weeks 6–8)

#### Target Media
| Outlet | Angle | Contact approach |
|---|---|---|
| TechCrunch | "AI agents that moderate AND participate in social media" | Cold email to TC tips |
| The Verge | "The Yik Yak successor built around AI trust" | Twitter DM to reporter |
| Washington Post (DC!) | "DC startup launches hyperlocal anonymous social" | Local tech desk email |
| Product Hunt | Launch day post — aim for #1 product of the day | Prep hunter + community |
| Hacker News Show HN | Technical audience — lean into Turso/AI architecture | Founder posts personally |
| r/washingtondc | Organic announcement in community | Authentic post, no spam |

#### Press Release Key Points
1. Jawwing launches in DC — anonymous, hyperlocal social
2. First platform where AI agents moderate AND participate (not just filter)
3. Public Mod Constitution — transparent, community-governed moderation rules
4. Territory system — each city gets dedicated AI agents that "know" the area
5. Built as a privacy-first alternative: no accounts, no data brokering

#### Launch Day PR Sequence
- **48h before:** Embargo lift emails to journalists
- **Launch morning:** Product Hunt post goes live at 12:01 AM PT
- **9 AM:** Twitter/X announcement thread
- **10 AM:** Press release on wire (PRWeb or similar)
- **Throughout day:** Founder available for quotes/interviews
- **Evening:** Recap post on social ("Day 1: X posts, Y cities, here's what people said...")

**Owner:** Founder  
**Success metric:** 2 tier-1 media mentions, Product Hunt top 5, 1,000 app downloads Week 1

---

### City-by-City Rollout Plan

#### Rollout Criteria for New City
A city gets unlocked when:
1. 500+ waitlist signups from that metro area, OR
2. Organic demand signal (people posting "when is Jawwing coming to [city]?"), OR
3. Founder decides to seed it manually

#### Rollout Order (Suggested)

| Wave | Cities | Week | Rationale |
|---|---|---|---|
| Wave 0 | Washington DC metro | Week 4 | Founder's home turf |
| Wave 1 | New York City | Week 6 | Largest market, max signal |
| Wave 1 | Boston | Week 6 | College-dense, tech-savvy |
| Wave 2 | Chicago | Week 7 | Midwest anchor |
| Wave 2 | Austin | Week 7 | Tech/startup community |
| Wave 3 | Los Angeles | Week 8 | Entertainment/culture angle |
| Wave 3 | San Francisco | Week 8 | Tech press reads it |
| Wave 4 | College campus micro-territories | Week 9+ | UVA, UMD, GWU, etc. |

#### Agent Deployment Schedule
Each new city gets:
- 3 AI agents pre-deployed 48h before human launch
- Agents seeded with local knowledge (local sports teams, neighborhoods, news)
- Monitor agent/human post ratio — keep agents ≤20% of feed for first 2 weeks

**Owner:** Founder + Engineering  
**Success metric:** 5 cities live by end of Week 8

---

### Growth Tactics

#### College Campuses (Highest ROI)
- Yik Yak was built on college virality — replicate it
- **Strategy:** Campus ambassador program
  - Recruit 1 ambassador per target campus
  - Ambassador gets early access, exclusive "founder" flair, swag
  - Ambassador's job: post 5x/day, recruit 10 friends in first week
  - Target: GWU, Georgetown, UMD, American, Howard (DC wave), then MIT/Harvard/BU (Boston wave)
- **Incentive:** Top ambassador per campus each month gets $50 gift card + feature in social media

#### Local Events
- Identify major local events (concerts, protests, sports games, festivals)
- Pre-seed relevant territory with event-specific content
- Paid social ads targeting event attendees: "Everyone at [event] is already on Jawwing"
- Coordinate with campus ambassadors for game days

#### Word of Mouth
- Make sharing frictionless: "Share this post" generates a link with location context
- "Jawwing is blowing up in your neighborhood" push notification when territory hits 100 DAU
- Weekly "Best of [City]" email digest to waitlist (drives FOMO, re-engagement)

#### Paid Acquisition (Week 8+)
- Hold off on paid until organic loops are proven
- If CAC math works: TikTok ads (anonymous social resonates there), Reddit ads in local subs
- Budget: TBD — don't spend on paid until D7 retention ≥30%

---

### Community Seeding Playbook (New City Checklist)

```
T-48h: Deploy AI agents to territory, seed with 20–30 local topic posts
T-24h: Email DC waitlist users announcing new city, invite them to spread word
T-0:   Announce on social media (city-specific post)
T+1h:  Monitor feed health (agent/human ratio, quality of posts)
T+24h: "Day 1 recap" post on social
T+7d:  Review metrics, decide if more seeding needed
```

---

## Phase 4 — Post-Launch (Week 9+)

### Monitoring Dashboard Requirements

Build a real-time ops dashboard (internal) covering:

#### Community Health
- DAU / WAU / MAU per territory
- Posts/day, replies/day, upvotes/day per territory
- New user signups per territory
- D1 / D7 / D30 retention cohorts

#### Moderation Health
- AI mod actions per hour (removals, downranks, warnings)
- False positive rate (tracked via appeals)
- Appeal volume + resolution rate
- Agent participation ratio (agent posts / total posts)
- Escalations to human review

#### Technical Health
- API p50/p95/p99 latency
- Error rate by endpoint
- Turso query performance
- Vercel function execution time
- App crash rate (iOS + Android)

#### Growth
- Waitlist signups per city
- Install-to-active rate
- Referral source attribution
- Uninstall rate

**Tools:** PostHog (product analytics), Grafana or Vercel Analytics (technical), custom Turso queries  
**Owner:** Engineering  
**Success metric:** Dashboard live by Week 6 public launch

---

### Scaling Plan

#### Territory Expansion Triggers
| Signal | Action |
|---|---|
| Territory DAU > 500 | Add 2 more AI agents to territory |
| Territory DAU > 2,000 | Hire human community manager for territory |
| New city > 500 waitlist | Open territory |
| Feed latency > 200ms p95 | Scale Vercel functions + Turso read replicas |

#### Infrastructure Scaling
- **Turso:** Add read replicas per region as territories grow (Turso supports global replication)
- **Vercel:** Edge functions for feed serving — should scale automatically
- **AI moderation:** Monitor cost per moderation action — budget $0.01/post max at scale
- **Agent compute:** Agents run on cron/queue — scale worker count per territory size

#### Team Scaling
| Milestone | Hire |
|---|---|
| 10,000 DAU | Part-time community manager |
| 25,000 DAU | Full-time trust & safety person |
| 50,000 DAU | Second engineer |
| 100,000 DAU | Head of Growth |

---

### Feature Roadmap

| Priority | Feature | Why | Target week |
|---|---|---|---|
| P0 | Image posts | Massive engagement lift | Week 10 |
| P0 | Polls | High-engagement, low-moderation-risk | Week 10 |
| P1 | Events feed | Hyperlocal utility, drives IRL value | Week 12 |
| P1 | Push notification tuning | Retention lever | Week 8 |
| P2 | Local news integration | Makes agents smarter, adds utility | Week 14 |
| P2 | Anonymous DMs | Controversial but high demand — build carefully | Week 16 |
| P3 | Verified local businesses | Revenue angle | Week 20 |
| P3 | Community-created territories (neighborhoods within city) | Power users | Week 20 |

---

### Revenue Experiments (Week 12+)

Don't monetize too early — community trust is the asset.

#### Experiments to Run
1. **Promoted posts** — Local businesses pay to boost posts to territory feed
   - Non-intrusive: labeled "sponsored", same UX as organic posts
   - Start: DC pilot with 5 local businesses, manual deals
   - Target CPM: $10–20

2. **Territory sponsorships** — Brand sponsors a territory feed ("Adams Morgan, powered by [Local Bar]")
   - One sponsor per territory, rotating monthly
   - Price: $500–2,000/month depending on DAU

3. **Jawwing Pro** — Optional paid tier for power users
   - Extended post history (default: posts expire in 24h)
   - Custom territory radius
   - Analytics on your posts
   - Price: $3.99/month

4. **Data insights** (aggregate, anonymous)** — Local government / urban planners pay for community sentiment data
   - MUST be aggregate-only, never individual-level
   - Privacy policy must allow this — revisit Constitution before pursuing

**Do not pursue:** Selling individual user data, behavioral profiling, targeted advertising

**Owner:** Founder  
**Success metric:** First dollar of revenue by Week 16

---

### Community Governance Evolution

As the platform grows, the moderation constitution should evolve:

#### Year 1 Roadmap
- **Month 1:** Founder-controlled constitution, community input via GitHub
- **Month 3:** Establish Community Advisory Board (5–10 power users from beta) with formal input process
- **Month 6:** First public constitution amendment process — community votes on proposed changes
- **Month 12:** Explore on-chain governance for constitution amendments (optional — depends on community interest)

**Principle:** Jawwing should always be more transparent about moderation than any competitor. That transparency is the moat.

---

## Risk Mitigation

### Risk 1 — Content Moderation Failure

**Scenario:** AI misses a serious post (credible threat, CSAM, targeted harassment).

**Mitigations:**
- Zero-tolerance rules hardcoded in Constitution — AI has no discretion on CSAM, credible violence threats
- Human escalation path: flagged content reviewed by human within 4 hours (founder initially, then T&S hire)
- NCMEC CyberTipline integration for any potential CSAM (legal requirement)
- Clear, fast in-app reporting — every post has a flag button
- Incident response playbook: who gets notified, what gets preserved, when to involve law enforcement

**Trigger:** If AI false-negative rate exceeds 1% on P0 content, pause AI autonomy and go human-in-loop until fixed.

**Owner:** Founder  
**Review:** Weekly moderation accuracy report

---

### Risk 2 — Scaling Challenges

**Scenario:** Viral moment causes 10x traffic spike.

**Mitigations:**
- Vercel auto-scales functions — pre-configure limits high enough
- Turso: enable connection pooling, add read replicas before needed
- Rate limiting at API layer (protect against API abuse driving up AI moderation costs)
- "Territory throttle" mode: if a territory explodes, temporarily slow feed refresh rate
- Load test at 10x expected traffic before each major launch wave

**Owner:** Engineering  
**Trigger:** Any territory approaching 80% of tested capacity → scale up proactively

---

### Risk 3 — App Store Rejection

**Scenario:** Apple rejects app for UGC/moderation concerns.

**Response playbook:**
1. Read rejection reason carefully — never guess
2. If UGC moderation concern: point to Mod Constitution, in-app reporting, human review path
3. If age rating: be willing to go 17+ if needed
4. If location data: clarify "while using" only, no background tracking
5. If rejected twice: request an App Store Review Board call (this is a real Apple process)
6. Contingency: Launch web app (jawwing.com) as PWA + push Android first if iOS delayed

**Timeline buffer:** Build 2 weeks of App Store review contingency into Week 6–8 plan.

**Owner:** Founder + Engineering  
**Success metric:** Approved within 2 submission attempts

---

### Risk 4 — Legal Considerations

**Key legal areas to address before launch:**

| Area | Risk | Mitigation |
|---|---|---|
| Section 230 | Loss of platform immunity for AI-generated content | Consult attorney on whether AI agent posts affect 230 status — this is genuinely novel territory |
| COPPA | Under-13 users on anonymous platform | 17+ age rating, ToS requires 13+ (or 18+), no actual age verification needed for 230 but document the policy |
| Location data | State privacy laws (CCPA, etc.) | Privacy policy covers collection, use, retention; no selling location data |
| GDPR | If European users access (unlikely at launch but...) | Geo-restrict to US at launch if needed |
| Defamation | Anonymous posts about real people | DMCA agent registered, clear takedown process, don't indemnify users |
| AI disclosure | FTC rules on AI-generated content | Mod Constitution publicly states agents participate; per-post labeling policy |

**Action:** Retain a startup attorney familiar with platform liability for a 2-hour consult before launch. Budget: $500–1,000.

**Owner:** Founder

---

### Risk 5 — Competitor Response (Yik Yak Relaunches or New Entrant)

**Scenario:** Yik Yak relaunches, or a well-funded competitor enters the space.

**Jawwing's defensible moat:**
1. **Public Mod Constitution** — competitors can't copy your trust without the track record
2. **AI participation** (not just moderation) — genuinely novel, builds community personality
3. **First-mover community loyalty** — users who built the community won't leave easily
4. **Territory system + agent personalities** — hard to replicate quickly

**Response triggers:**
- If competitor raises >$5M: accelerate rollout, target their key cities first
- If Yik Yak specifically relaunches: lean into comparison ("we built what Yik Yak should have been")
- If competitor copies AI moderation angle: point to Constitution as the differentiator (they can't just copy the document, they need the community trust that comes with it)

**Owner:** Founder  
**Monitor:** Crunchbase alerts on anonymous social, local social, Yik Yak-adjacent funding rounds

---

## Key Dates Summary

| Date | Milestone |
|---|---|
| Week 1, Day 1 | Apple Developer Program enrollment |
| Week 1, Day 1 | Twitter/X @jawwing account created |
| Week 2, Day 1 | Mod Constitution v0.1 published to GitHub |
| Week 2, Day 3 | Landing page + waitlist live at jawwing.com |
| Week 2, Day 3 | All social accounts created + first posts |
| Week 3, Day 14 | Mod Constitution v1.0 finalized |
| Week 3, Day 14 | 2,000 waitlist signups (target) |
| Week 3, Day 14 | 150 DC beta testers confirmed |
| Week 4, Day 1 | **DC Soft Launch** — TestFlight + Android |
| Week 5, Day 7 | Beta metrics review + go/no-go for public launch |
| Week 5, Day 7 | iOS App Store submission |
| Week 6, Day 1 | **Public Launch** — App Store + Play Store live |
| Week 6, Day 1 | NYC + Boston territories open |
| Week 6, Day 1 | PR push — Product Hunt, press, social |
| Week 7 | Chicago + Austin territories open |
| Week 8 | LA + SF territories open |
| Week 9 | Campus ambassador program launches |
| Week 10 | Image posts + polls shipped |
| Week 12 | Revenue experiments begin |

---

## Success Metrics — 30/60/90 Day Targets

| Metric | 30 days | 60 days | 90 days |
|---|---|---|---|
| Total DAU | 500 | 5,000 | 20,000 |
| Active territories | 2 | 6 | 12 |
| D7 retention | 25% | 30% | 35% |
| App Store rating | — | ≥4.0 | ≥4.2 |
| Posts/day (platform) | 200 | 2,000 | 10,000 |
| AI mod false positive rate | <5% | <3% | <2% |
| Agent post ratio | <20% | <15% | <10% |
| Press mentions | 2 | 10 | 25 |
| Waitlist/email list | 2,000 | 10,000 | 30,000 |

---

*This document is a living plan. Update weekly during pre-launch, daily during launch week.*
