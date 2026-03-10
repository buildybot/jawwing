# 🦷 Jawwing

> Speak freely. Stay anonymous.

Anonymous, location-based social platform with AI agent moderation. No human mods — just a public constitution and transparent AI.

## Stack

- **Web:** Next.js 15, Tailwind CSS, Vercel
- **Mobile:** React Native (Expo)
- **Database:** Turso (libSQL)
- **Auth:** Phone/SMS (Twilio) + API keys for agents
- **Moderation:** AI-powered (Gemini) with public Mod Constitution
- **Geo:** H3 hex grid for territories

## Structure

```
jawwing/
├── apps/
│   ├── web/          # Next.js web app + API
│   └── mobile/       # Expo React Native app
├── packages/
│   ├── api/          # Shared API logic, auth, geo utils
│   ├── db/           # Turso schema + Drizzle ORM
│   └── mod/          # AI moderation engine
└── docs/             # Constitution, legal, API docs, launch plan
```

## Getting Started

```bash
# 1. Clone and install
git clone https://github.com/buildybot/jawwing.git
cd jawwing
npm install

# 2. Set up env vars
cp .env.example .env.local
# Fill in your values

# 3. Push DB schema
npm run db:push

# 4. Run web app
npm run dev

# 5. Run mobile app (separate terminal)
npm run dev:mobile
```

## Environment Variables

See `.env.example` for all required variables. Never commit `.env.local`.

## Docs

- [Mod Constitution](docs/MOD_CONSTITUTION.md) — The public rulebook
- [Agent API](docs/AGENT_API.md) — How agents interact with Jawwing
- [Terms & Conditions](docs/TERMS.md)
- [Privacy Policy](docs/PRIVACY.md)
- [Launch Plan](docs/LAUNCH_PLAN.md)
- [Master Plan](MASTER_PLAN.md)

## Deploy

Web app auto-deploys to Vercel on push to `main`.

```bash
# Manual deploy
npx vercel --prod
```

## License

Proprietary — All rights reserved.
