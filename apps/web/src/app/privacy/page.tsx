import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - JAWWING",
};

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;
const SECTION_LABEL = { ...MONO, letterSpacing: "0.08em", fontSize: "0.6875rem", fontWeight: 600, color: "#777777" } as const;

const sections = [
  {
    title: "1. The Short Version",
    body: `We collect as little as possible. Your IP address is one-way hashed. We never store it in plaintext and cannot reverse it. Location is captured at post time only and is not linked to any persistent identity. Posts expire from public feeds after 30 days but may be retained so you can view your post history. We never sell your data. AI moderates all content.`,
  },
  {
    title: "2. Who This Applies To",
    body: `This Privacy Policy applies to all users of jawwing.com and any associated apps or APIs. By using the Service, you agree to this policy.

Jawwing is available to users in the United States only. You must be 18 years of age or older to use the Service.`,
  },
  {
    title: "3. What We Collect: No-Account Users",
    body: `Most users never create an account. In no-account mode, we collect:

IP address: Stored as a one-way cryptographic hash only, never plaintext. Used for rate limiting, deduplication, and abuse prevention.

GPS coordinates: Stored with the post record at the moment you post. Not linked to your IP hash or any persistent profile. Not tracked over time. Slightly fuzzed for privacy (rounded to approximately 1km precision).

Post content (text): Stored with the post record. Publicly visible in feeds for up to 30 days.

Uploaded images: Stored on Vercel Blob CDN. Publicly visible as part of your post.

Timestamp: Stored with the post. Used for expiration and ordering.

Vote actions: Anonymous, not linked to user identity.

That is everything. We do not collect your name, device fingerprint, browsing history, contacts, or any other personally identifying information.`,
  },
  {
    title: "4. What We Collect: Account Users",
    body: `Creating an account is optional. If you sign in with email:

Email address: Stored as a one-way cryptographic hash (for account lookup) and separately encrypted using AES-256-GCM (for sending notifications). We never store your email in plaintext at rest.

Session identifiers: Your anonymous session IDs are linked to your account so we can associate your posts with your account for features like post history.

Notification preferences: Your chosen notification settings (reply alerts, trending alerts).

Everything else (IP hash, GPS, content) is the same as no-account users.`,
  },
  {
    title: "5. IP Address Hashing",
    body: `When your device connects to Jawwing, your IP address is received by our server and immediately passed through a one-way cryptographic hash function (HMAC-SHA256 with a secret server key). The hash is stored, never the original IP. The hash cannot be reversed to recover your IP, even by us.

The hash is used only for rate limiting, block/mute features, and abuse prevention.

Important caveat: The hash is still data. If compelled by valid legal process, we may be required to produce it.`,
  },
  {
    title: "6. Location Data",
    body: `Location is the core of Jawwing. When you post, your device provides GPS coordinates. These are fuzzed (rounded and randomized by approximately 1km) before storage to protect your precise location.

We do not build a location history for you. Each post is an isolated record. We do not track where you go.

Location data is inherently sensitive. If you post from your home or workplace, the approximate coordinate will be associated with that post. Think before you post from a sensitive location.`,
  },
  {
    title: "7. Uploaded Images",
    body: `Images are uploaded to Vercel Blob, a third-party CDN storage service. Images are publicly accessible via CDN URL as part of your post. All images are scanned by AI moderation for prohibited content before being shown publicly.

Exif data: We do not automatically strip Exif metadata from images. If your image has embedded GPS coordinates, device model, or other metadata, that data may be accessible to anyone who downloads the image. Strip Exif data before uploading if this concerns you.

Do not upload images containing personal information you do not want publicly exposed.`,
  },
  {
    title: "8. Cookies",
    body: `We use only essential cookies:

Session cookie (jw_session): Identifies your anonymous session for voting and posting. No personal data.

Account cookie (jw_account): If signed in, a secure httpOnly JWT token that keeps you logged in for up to 3630 days.

Account flag (jw_account_ok): A non-sensitive flag so the page knows to show signed-in UI.

We do not use advertising cookies, tracking pixels, Google Analytics, Meta Pixel, or any third-party analytics that sell your data.`,
  },
  {
    title: "9. AI Moderation",
    body: `All posts (text and images) are processed by our AI moderation system before appearing in feeds. We currently use Anthropic's Claude API as our primary moderation provider, with fallback providers for reliability.

This means your content is sent to a third-party AI API for analysis. These providers' use of API data is governed by their respective terms, which generally prohibit using API inputs to train models.

Our moderation rules are published in our Constitution at jawwing.com/constitution. Moderation decisions are logged in our Transparency page at jawwing.com/transparency.`,
  },
  {
    title: "10. AI-Generated Content",
    body: `Jawwing may use AI agents to seed content on the platform, particularly in lower-traffic areas during early launch. These posts are processed, stored, and moderated the same way as user-generated content.`,
  },
  {
    title: "11. Post Expiry and Data Retention",
    body: `Posts expire from public feeds after 30 days. After expiry, posts are no longer visible in the feed or discoverable by other users.

However, posts are not necessarily permanently deleted from our database at expiry. Jawwing retains post data so that account holders can view their post history, including past performance (scores, replies). This allows you to see your best-performing posts and your posting history over time.

Jawwing reserves the right to decide when and whether to permanently delete expired post data from its systems. Expired posts are never re-surfaced in public feeds.

Full retention summary:

Post content (text): Visible in feeds for up to 30 days. Retained in database for account holder history. Permanent deletion at Jawwing's discretion.

Post images: Publicly visible while post is in feeds. May be deleted from CDN after post expires from feeds. Permanent deletion timing at Jawwing's discretion.

GPS coordinates (with post): Retained with the post record.

IP hash: Retained for rate limiting and abuse prevention. Reviewed periodically.

Email hash and encrypted email (if account): Retained while account is active. Deleted on account deletion request.

Moderation logs: Retained indefinitely for transparency and abuse prevention.

Session tokens: Expire on logout or after cookie expiry.`,
  },
  {
    title: "12. Law Enforcement and Legal Process",
    body: `We will comply with valid United States legal process, including subpoenas, court orders, and law enforcement requests.

What we could produce if compelled: Hashed IP addresses associated with a post or account, post content, approximate GPS coordinates associated with a post, timestamps, email hash and encrypted email (if account exists), moderation logs.

What we cannot produce: Raw IP addresses (we do not have them), location history (we do not track it), identity of anonymous users (we do not know it).

If legally permitted, we will attempt to notify affected users before producing data. We may be prohibited from doing so under a gag order or similar legal restriction.

Jawwing is not designed to protect against lawful government access. Do not rely on Jawwing for anonymity in situations where government surveillance is a concern.`,
  },
  {
    title: "13. Third-Party Services",
    body: `Vercel: Hosting, CDN, and Blob storage (vercel.com/legal/privacy-policy).

Anthropic Claude API: AI moderation (anthropic.com/privacy).

Turso: Database hosting (turso.tech/privacy-policy).

Resend: Email verification codes (resend.com/legal/privacy-policy).

We do not sell your data to any third party. We do not share data with data brokers, advertisers, or analytics companies.`,
  },
  {
    title: "14. Age Restriction",
    body: `Jawwing is restricted to users 18 years of age or older in the United States. We do not knowingly collect personal information from anyone under 18. If we become aware we have collected data from someone under 18, we will delete it.

If you are a parent or guardian and believe a minor has used Jawwing, contact support@jawwing.com.`,
  },
  {
    title: "15. Data Security",
    body: `We take reasonable steps to protect your data: hashing identifiers (IP, email) rather than storing plaintext, encrypting email addresses using AES-256-GCM, using HTTPS for all connections, storing images on a third-party CDN, and using secure httpOnly session cookies.

No system is perfectly secure. We cannot guarantee that unauthorized access, hacking, or data breaches will never occur. If a breach occurs that affects your rights, we will notify as required by applicable law.`,
  },
  {
    title: "16. Your Rights",
    body: `Account holders may request:

Access: View what data we hold about your account by visiting Settings.

Deletion: Request account deletion by contacting support@jawwing.com. We will delete your account record and encrypted email. Posts previously made may be retained in anonymized form.

For no-account users: Because we store only hashed identifiers, we may be unable to identify which data is "yours" without additional information. This is by design for your privacy.`,
  },
  {
    title: "17. Changes to This Policy",
    body: `We may update this Privacy Policy at any time. We will update the "Last Updated" date at the top. Continued use of the Service after changes means you accept the updated policy.`,
  },
  {
    title: "18. Contact",
    body: `Privacy inquiries: support@jawwing.com
General support: support@jawwing.com`,
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "48px 24px 96px" }}>
        <p style={SECTION_LABEL} className="mb-4">LEGAL</p>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF", marginBottom: "8px" }}>
          Privacy Policy
        </h1>
        <p style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.04em", marginBottom: "16px" }}>
          EFFECTIVE: MARCH 10, 2026 · LAST UPDATED: MARCH 10, 2026
        </p>
        <p style={{ color: "#C0C0C0", fontSize: "0.9375rem", lineHeight: 1.7, marginBottom: "48px" }}>
          Your privacy matters. This policy explains exactly what data Jawwing collects, how it&apos;s stored, how long we keep it, and your rights. We collect as little as possible, we hash what we must store, posts expire from feeds after 30 days, and we never sell your data.
        </p>

        {sections.map((section) => (
          <div key={section.title} style={{ borderTop: "1px solid #1F1F1F", paddingTop: "24px", marginBottom: "24px" }}>
            <h2 style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1rem", marginBottom: "10px" }}>{section.title}</h2>
            {section.body.split("\n\n").map((para, i) => (
              <p key={i} style={{ color: "#C0C0C0", fontSize: "0.9375rem", lineHeight: 1.7, marginBottom: i < section.body.split("\n\n").length - 1 ? "12px" : 0 }}>
                {para}
              </p>
            ))}
          </div>
        ))}

        <div style={{ borderTop: "1px solid #1F1F1F", paddingTop: "32px", display: "flex", flexWrap: "wrap", gap: "24px" }}>
          {[
            { href: "/terms", label: "TERMS" },
            { href: "/constitution", label: "CONSTITUTION" },
            { href: "/transparency", label: "TRANSPARENCY" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.06em", textDecoration: "none" }}
              className="hover:text-white transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #1F1F1F", padding: "24px" }}>
        <p style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.06em", textAlign: "center" }}>
          © {new Date().getFullYear()} JAWWING
        </p>
      </footer>
    </div>
  );
}
