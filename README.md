# Jawwing

**Anonymous local social. No accounts. No algorithms. No permanence.**

Jawwing is a hyperlocal anonymous posting platform where everything expires in 48 hours. Posts are GPS-locked to your city, moderated exclusively by AI (no human moderators, no shadow bans), and governed by a [public constitution](https://jawwing.com/constitution).

> 📸 *Screenshot placeholder — add app screenshot here*

---

## Why Jawwing?

Most social networks are designed to maximize engagement at the cost of your privacy, mental health, and local community. Jawwing flips the script:

- **Zero accounts** — no sign-up, no profile, no follower count
- **GPS-locked posting** — you can only post about places you're physically at
- **48-hour expiry** — posts disappear automatically. No permanent record.
- **AI-only moderation** — governed by a [public constitution](https://jawwing.com/constitution), not corporate whims
- **Truly anonymous** — no username, no history, no tracking

---

## Stack

- **[Next.js](https://nextjs.org/)** — App Router, API routes
- **[Turso](https://turso.tech/)** — Edge SQLite database
- **[Vercel](https://vercel.com/)** — Hosting & deployment
- **[Anthropic Claude](https://anthropic.com/)** — AI moderation engine
- **[Resend](https://resend.com/)** — Transactional email

---

## Features

| Feature | Description |
|---|---|
| 🤖 AI-only moderation | Claude enforces the public constitution — no humans in the loop |
| 📜 Public constitution | Moderation rules are public and auditable at [jawwing.com/constitution](https://jawwing.com/constitution) |
| ⏳ 48h expiry | All posts auto-delete. Nothing is permanent. |
| 📍 GPS-locked posting | Posts are tied to your physical location |
| 🕵️ Zero accounts | No sign-up. No profile. No data collection beyond what's necessary. |

---

## Running Locally

### Prerequisites

- Node.js 18+
- A [Turso](https://turso.tech/) database
- An [Anthropic](https://anthropic.com/) API key
- A [Resend](https://resend.com/) API key (for email verification)

### Setup

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env.local

# Run development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Required Environment Variables

Create a `.env.local` file in `apps/web/` with the following:

```env
TURSO_DATABASE_URL=          # Your Turso database URL
TURSO_AUTH_TOKEN=            # Your Turso auth token
ANTHROPIC_API_KEY=           # Anthropic API key for Claude moderation
JWT_SECRET=                  # Secret for signing JWTs
EMAIL_HASH_SALT=             # Salt for hashing emails (privacy)
PHONE_HASH_SALT=             # Salt for hashing phone numbers (privacy)
RESEND_API_KEY=              # Resend API key for email
ADMIN_API_KEY=               # Secret key for admin API endpoints
BLOB_READ_WRITE_TOKEN=       # Vercel Blob storage token
NEXT_PUBLIC_APP_URL=         # Public URL of the app (e.g. https://jawwing.com)
NEXT_PUBLIC_APP_NAME=        # App name (e.g. Jawwing)
```

See `.env.example` for a full template.

---

## Moderation & Constitution

Jawwing is moderated entirely by AI using a public, versioned constitution. No posts are reviewed by humans. The rules are transparent and auditable.

Read the constitution: [jawwing.com/constitution](https://jawwing.com/constitution)

---

## Contributing

Pull requests welcome. Keep it simple:

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a PR

For big changes, open an issue first to discuss.

---

## License

MIT — see [LICENSE](./LICENSE)
