# Viral Machine — Jawwing Content Engine

## What This Is
Automated pipeline that generates edgy, curiosity-driven short-form video content from Jawwing posts and posts them to TikTok, Instagram Reels, and YouTube Shorts. Tracks performance and evolves content strategy based on what performs.

## Architecture

```
[Jawwing DB] → [Content Selector] → [Video Generator] → [Platform Poster] → [Performance Tracker] → [Strategy Optimizer]
     ↑                                                                                                        |
     └────────────────────────────────────── feedback loop ────────────────────────────────────────────────────┘
```

## Pipeline Steps

### 1. Content Selector (`scripts/select-content.mjs`)
- Pulls top-performing + most controversial posts from Jawwing DB
- Clusters posts into "themes" (confessions, hot takes, local drama, relatable moments)
- Scores posts for viral potential: controversy + relatability + shock value + brevity
- Outputs a content brief: which posts to feature, what angle, what hook

### 2. Video Generator (`scripts/generate-video.mjs`)
- Uses ffmpeg to compose videos programmatically
- Formats:
  - **"Anonymous Confessions"** — dark screen, white monospace text typing out letter by letter, ambient music
  - **"Hot Takes"** — fast cuts between multiple posts, each slamming onto screen, bass drop transitions
  - **"What [City] Really Thinks"** — scrolling feed mockup, posts appearing like a real feed
  - **"Rate This Take"** — single controversial post, agree/disagree prompt, engagement bait
  - **"Would You Post This?"** — edgy post reveal with dramatic pause
- All videos: 9:16 aspect ratio, 15-60 seconds, captions baked in
- Background: Pure black or subtle texture matching Jawwing aesthetic
- Font: Monospace white text (brand consistent)
- Music: Royalty-free ambient/dark beats (stored in assets/)

### 3. Platform Poster (`scripts/post-video.mjs`)
- Posts to TikTok via browser automation (openclaw browser tool)
- Adds optimized captions, hashtags, sounds
- Schedules posts at peak engagement times (7-9am, 12-1pm, 5-7pm, 9-11pm ET)
- 3-4 videos/day across platforms

### 4. Performance Tracker (`scripts/track-performance.mjs`)
- Scrapes video stats via browser (views, likes, comments, shares, saves)
- Stores in `data/performance.jsonl`
- Tracks: video_id, platform, format_type, theme, hook_style, post_ids_used, views, likes, comments, shares, saves, timestamp

### 5. Strategy Optimizer (`scripts/optimize.mjs`)
- Analyzes performance data to identify patterns:
  - Which format types get most views?
  - Which themes drive engagement?
  - Which hook styles have highest retention?
  - What posting times work best?
  - Which cities generate most interest?
- Updates `data/strategy.json` with learned weights
- Content selector reads strategy.json to inform next batch

## Content Rules
- **Edgy but not bannable** — push boundaries without violating TOS
- **Curiosity gaps** — hooks that make you NEED to see the rest
- **Local specificity** — mention real places, events, landmarks
- **Engagement bait** — polls, "rate this", "would you...", "am I wrong?"
- **Never fake** — all posts are real anonymous posts from Jawwing
- **CTA is subtle** — "from jawwing.com" watermark, not "DOWNLOAD NOW"
- **Audio matters** — trending sounds when possible, dramatic music always

## Video Formats (Detailed)

### Format A: "Anonymous Confession" (15-30s)
- Hook: "Someone near you just posted this anonymously..."
- Black screen, text types out character by character
- Dramatic pause before the punchline
- End card: "jawwing.com — anonymous. local. unfiltered."

### Format B: "Hot Takes Rapid Fire" (30-45s)  
- Hook: "The most unhinged takes from [city] today"
- 5-7 posts, each on screen for 3-5s
- Hard cut transitions, bass hits
- Comment bait: "which one are you?"

### Format C: "Rate This Take" (15s)
- Single controversial post
- "Do you agree? 👍 or 👎"
- Simple, fast, maximum engagement

### Format D: "Feed Scroll" (30-60s)
- Fake phone screen recording of scrolling through Jawwing
- Shows the actual UI (black bg, monospace, voting)
- Organic feel, like someone screen recording their phone
- "This app is wild..." caption

### Format E: "City vs City" (30s)
- Side by side posts from two cities on same topic
- "DC vs NYC: who's more unhinged?"
- Drives comments from both cities

## Tracking Schema (`data/performance.jsonl`)
```json
{
  "id": "vm_abc123",
  "platform": "tiktok",
  "format": "confession",
  "theme": "hot_take",
  "hook": "someone_near_you",
  "city": "dc",
  "post_ids": ["abc", "def"],
  "posted_at": "2026-03-11T10:00:00Z",
  "stats": {
    "views": 0,
    "likes": 0,
    "comments": 0,
    "shares": 0,
    "saves": 0,
    "checked_at": "2026-03-11T22:00:00Z"
  }
}
```

## Strategy Schema (`data/strategy.json`)
```json
{
  "format_weights": { "confession": 1.0, "hot_takes": 1.0, "rate_this": 1.0, "feed_scroll": 1.0, "city_vs_city": 1.0 },
  "theme_weights": { "hot_take": 1.0, "confession": 1.0, "local_drama": 1.0, "relatable": 1.0, "controversy": 1.0 },
  "hook_weights": { "someone_near_you": 1.0, "most_unhinged": 1.0, "would_you_post": 1.0, "rate_this": 1.0 },
  "best_times": ["10:00", "13:00", "19:00", "22:00"],
  "top_cities": ["dc", "nyc", "la"],
  "updated_at": null
}
```

## Required Setup
- TikTok account: needs manual login via browser first
- Music assets: royalty-free dark ambient tracks in `assets/`
- ffmpeg: installed (/opt/homebrew/bin/ffmpeg)

## Cron
- Content generation: 4x/day (8am, 12pm, 5pm, 9pm ET)
- Performance tracking: 2x/day (10am, 10pm ET)
- Strategy optimization: 1x/day (6am ET)
