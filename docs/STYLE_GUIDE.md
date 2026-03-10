# Jawwing Style Guide — Simple Futurism

## Philosophy
Black and white. No clutter. Every element earns its pixel. Think terminal aesthetics meets modern minimalism. If it doesn't need color, it doesn't get color.

## Colors

### Core Palette
| Token | Value | Use |
|-------|-------|-----|
| `bg-primary` | `#000000` | App background |
| `bg-card` | `#0A0A0A` | Cards, surfaces |
| `bg-elevated` | `#141414` | Modals, sheets, hover states |
| `border` | `#1F1F1F` | Subtle borders, dividers |
| `border-bright` | `#333333` | Active/focused borders |
| `text-primary` | `#FFFFFF` | Headlines, primary content |
| `text-secondary` | `#A0A0A0` | Timestamps, labels, secondary info |
| `text-muted` | `#555555` | Disabled, hint text |

### Accent (used SPARINGLY)
| Token | Value | Use |
|-------|-------|-----|
| `accent` | `#FFFFFF` | Active states, selected tabs, buttons |
| `destructive` | `#FF3333` | Remove actions, errors only |
| `upvote` | `#FFFFFF` | Active upvote (just white) |
| `downvote` | `#555555` | Active downvote (dimmed) |

**Rule: No color unless it communicates critical state.** Everything is grayscale.

## Typography

### Font
- **Primary:** `Inter` — clean, geometric, highly legible
- **Monospace:** `JetBrains Mono` or `SF Mono` — for post IDs, code, timestamps
- Load weights: 400 (body), 500 (medium), 600 (semibold), 700 (bold)

### Scale
| Use | Size | Weight | Tracking |
|-----|------|--------|----------|
| Post content | 16px / 1rem | 400 | normal |
| Post metadata | 12px / 0.75rem | 400 | 0.02em |
| Section headers | 13px / 0.8125rem | 600 | 0.08em uppercase |
| Hero headline | 48px / 3rem | 700 | -0.02em |
| Hero subtitle | 18px / 1.125rem | 400 | 0.01em |
| Button text | 14px / 0.875rem | 500 | 0.04em |
| Tab labels | 13px / 0.8125rem | 500 | 0.06em uppercase |

### Rules
- Uppercase + letter-spacing for labels and tabs (futuristic feel)
- Tight tracking on headlines
- Generous line-height on post content (1.6)

## Layout

### Spacing
- Base unit: 4px
- Card padding: 16px
- Card gap: 2px (tight stacking, almost no gap — unified feed feel)
- Page margins: 16px mobile, 24px desktop
- Max content width: 480px (mobile-optimized, centered on desktop)

### Cards
- Background: `#0A0A0A`
- Border: 1px solid `#1F1F1F`
- Border radius: 0px — **sharp corners only** (futuristic = no rounded corners)
- No shadows — flat everything

### Dividers
- 1px solid `#1F1F1F`
- Full bleed (edge to edge)

## Components

### Post Card
```
┌─────────────────────────────────────┐
│ Post content goes here. Max 300     │
│ characters. Clean and readable.     │
│                                     │
│ ▲ 42  ↩ 7     2.3mi  ·  4m ago     │
└─────────────────────────────────────┘
```
- Vote arrows: simple triangles, white when active
- Metadata row: mono font, muted color, dot-separated
- No avatars, no usernames displayed prominently
- Content is the star

### Vote Buttons
- Thin outlined triangles (▲ ▽)
- White fill when active
- No color — just filled vs outlined
- Score between arrows, medium weight

### Tabs (Hot / New / Top)
- Uppercase, letter-spaced
- Active: white text, 2px bottom border white
- Inactive: muted text, no border
- No background changes

### Buttons
- Primary: white bg, black text, sharp corners
- Secondary: transparent, white border, white text
- No gradients, no shadows
- Hover: invert (black bg → white bg or vice versa)

### Input Fields
- Black bg, 1px white/gray border
- White text
- No rounded corners
- Minimal placeholder text in muted gray

### Header
- Fixed top
- Black bg, 1px bottom border
- "JAWWING" in uppercase letter-spaced mono
- Location text right-aligned, muted

### Create Post
- Full-screen modal, black bg
- Large text input area, no borders (just cursor)
- Character count bottom-right in mono, muted
- "POST" button top-right, white text

## Animations
- Minimal. Purposeful only.
- Vote: subtle scale pulse (1.0 → 1.15 → 1.0, 150ms)
- Page transitions: fade (200ms ease)
- New posts: slide in from top (300ms ease-out)
- No bounces, no springs, no playful animations

## Icons
- Line icons only (1.5px stroke)
- Use Lucide or Phosphor (light weight)
- No filled icons except active states

## Logo
- "JAWWING" in uppercase, letter-spaced, bold mono
- Or: "JW" monogram — two letters, geometric
- No icon/mascot for now — just the wordmark

## Mobile App
- Same exact system
- Native haptics on vote (light impact)
- Safe area respected (notch, home indicator)
- Bottom tab bar: same B&W treatment, line icons

## Anti-Patterns (DO NOT)
- ❌ Rounded corners
- ❌ Color accents (no blue, no green, no orange)
- ❌ Shadows or elevation
- ❌ Gradients
- ❌ Playful/bouncy animations
- ❌ Avatars or profile pictures
- ❌ Emoji in UI chrome (content is fine)
- ❌ Cards with lots of padding/whitespace between them

## Inspiration
- Terminal/CLI aesthetics
- Dieter Rams (less but better)
- Brutalist web design (but readable)
- Bloomberg Terminal (dense, functional)
- Nothing Phone (monochrome product design)
