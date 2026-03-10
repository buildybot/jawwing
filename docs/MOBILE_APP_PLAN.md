# JAWWING MOBILE APP - PARITY PLAN
> Get the Expo app to feature parity with the website, running off the same API.
> Updated: 2026-03-10

## Architecture
- Mobile app is React Native (Expo) at `apps/mobile/`
- Talks to the SAME API: `https://www.jawwing.com/api/v1/*`
- No separate backend needed — the website IS the backend
- Anonymous identity via device ID stored in AsyncStorage

## Current State
- [x] Basic feed screen exists
- [x] PostCard component exists
- [x] API client updated for anonymous model
- [x] Device ID generation (lib/deviceId.ts)
- [x] Post detail with comments
- [x] Image picker for posts
- [x] Settings screen (replaced profile)
- [x] TypeScript compiles clean
- [ ] NOT tested on real device
- [ ] NOT built via EAS
- [ ] Missing features vs website (see below)

## Feature Parity Checklist

### P0 - Must Have for Launch
| Feature | Web | Mobile | Notes |
|---|---|---|---|
| Feed with posts | ✅ | ⚠️ Needs testing | Verify API calls work |
| LOCAL/METRO/COUNTRY scope | ✅ | ❌ | Need scope selector |
| Distance-weighted HOT sort | ✅ | ❌ | Client-side sort needed |
| Auto-expand empty feeds | ✅ | ❌ | Same logic as web |
| Create post (text) | ✅ | ⚠️ Exists | Verify GPS works |
| Create post (image) | ✅ | ⚠️ Exists | Verify upload works |
| Upvote/downvote | ✅ | ⚠️ Exists | Verify API calls |
| Comments (threaded) | ✅ | ⚠️ Exists | Verify rendering |
| Report button | ✅ | ⚠️ Exists | Verify API calls |
| Block/mute | ✅ | ❌ | Need AsyncStorage version |
| Age gate (17+) | ✅ | ❌ | Need on first launch |
| Pull-to-refresh | ✅ | ❌ | Need on feed |
| HOT/NEW/TOP tabs | ✅ | ⚠️ Exists | Verify |
| Territory selector | ✅ | ❌ | Need "NEAR ME" picker |
| Share post | ✅ | ❌ | Need native share sheet |
| Post expiry indicator | ✅ | ❌ | Show time remaining |

### P1 - Should Have
| Feature | Status | Notes |
|---|---|---|
| Optional sign-in | ❌ | Email magic code, same as web |
| My Posts history | ❌ | /my-posts equivalent |
| Push notifications | ❌ | Expo Push for reply notifications |
| Constitution page | ❌ | WebView or native |
| Transparency page | ❌ | WebView or native |
| Offline cached feed | ❌ | AsyncStorage cache |
| Deep links | ❌ | jawwing.com/post/[id] opens app |

### P2 - Nice to Have
| Feature | Status | Notes |
|---|---|---|
| TikTok snap scroll | ❌ | Vertical paging on feed |
| Haptic feedback on vote | ❌ | Quick tactile response |
| Animation polish | ❌ | Vote animations, fade-ins |

## Build & Deploy Plan

### Step 1: EAS Configuration
- Create eas.json with build profiles (dev, preview, production)
- Configure app.json/app.config.ts with bundle IDs
- iOS: com.jawwing.app
- Android: com.jawwing.app

### Step 2: Feature Implementation (Sub-agents)
1. Agent 1: Feed parity (scope selector, distance sort, auto-expand, pull-to-refresh)
2. Agent 2: Interactions (block/mute, age gate, share sheet, post expiry)
3. Agent 3: Optional auth + push notifications
4. Agent 4: Navigation polish (deep links, tab bar, constitution WebView)

### Step 3: Build & Test
- EAS build for iOS simulator
- EAS build for Android emulator
- Test on real iPhone (TestFlight)
- Test on real Android (internal track)

### Step 4: App Store Submission
- Screenshots (iPhone 6.7" + 6.5")
- App Store metadata
- Privacy nutrition labels
- Submit for review

## Timeline
- Day 1: Sub-agents implement P0 features
- Day 2: EAS build, test on simulators
- Day 3: TestFlight build, test on real devices
- Day 4: Fix issues, polish
- Day 5: Submit to App Store + Play Store
