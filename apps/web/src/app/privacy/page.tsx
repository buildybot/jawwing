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
    body: `We collect as little as possible. Your IP address is one-way hashed — we never store it in plaintext and can't reverse it. Location is captured at post time only and is not linked to any persistent identity. Posts and images expire after ~24 hours. We never sell your data. AI moderates all content.`,
  },
  {
    title: "2. Who This Applies To",
    body: `This Privacy Policy applies to all users of jawwing.com and any associated apps or APIs. By using the Service, you agree to this policy. Jawwing and its operators are the data controller for data collected through the Service.`,
  },
  {
    title: "3. What We Collect — No-Account Users",
    body: `Most users never create an account. In no-account mode, we collect:

IP address — stored as a one-way hash only, never plaintext. Used for rate limiting, deduplication, and abuse prevention.

GPS coordinates — stored with the post record at the moment you post. Not linked to your IP hash or any persistent profile. Not tracked over time.

Post content (text) — stored with the post record. Publicly visible. Deleted after ~24 hours.

Uploaded images — stored on Vercel Blob CDN. Publicly visible as part of your post. Deleted with the post (~24 hours).

Timestamp — stored with the post. Supports expiration and ordering.

Vote actions — anonymous, not linked to user identity.

That is everything. We do not collect your name, device fingerprint, browsing history, contacts, or any other personally identifying information.`,
  },
  {
    title: "4. What We Collect — Optional Account Users",
    body: `If you create an account:

Email address — stored as a one-way cryptographic hash only. Never stored in plaintext. We cannot reverse it. Used only for account verification (one-time code) and deduplication.

Account handle — randomly generated, stored in plaintext. Identifies your session and posts.

IP address — one-way hash only, same as no-account users.

Session token — stored as a secure, httpOnly cookie. Keeps you logged in.`,
  },
  {
    title: "5. IP Address Hashing",
    body: `When your device connects to Jawwing, your IP address is received by our server. It is immediately passed through a one-way cryptographic hash function (e.g., HMAC-SHA256 with a secret server key). The hash is stored — never the original IP address. The hash cannot be reversed to recover your IP, even by us.

The hash is used only for rate limiting and duplicate account detection.

Important caveat: The hash is still data. If compelled by valid legal process, we may be required to produce it. We cannot guarantee that a hash is meaningless in all legal contexts.`,
  },
  {
    title: "6. Location Data",
    body: `Location is the core of Jawwing. When you post, your device provides GPS coordinates (latitude and longitude). These are stored with the post record — not linked to your IP hash, account, or any persistent user profile.

We do not build a location history for you. Each post is an isolated record. We are not tracking where you go.

We store the precision your device provides. If you're concerned about precision, reduce it in your device's location settings before posting.

Location data is inherently sensitive. If you post from your home or workplace, that coordinate will be associated with that post for 24 hours and visible to other users. Think before you post from a sensitive location.`,
  },
  {
    title: "7. Uploaded Images",
    body: `Images are uploaded to Vercel Blob, a third-party CDN storage service. Images are publicly accessible via CDN URL as part of your post. They are automatically deleted when the post expires (~24 hours). All images are scanned by AI moderation for prohibited content.

Exif data: We do not automatically strip Exif metadata from images. If your image has embedded GPS coordinates, device model, or other metadata, that data may be accessible to anyone who downloads the image. Strip Exif data before uploading if this concerns you.

Do not upload images containing personal information you don't want publicly exposed.`,
  },
  {
    title: "8. Cookies",
    body: `We use only essential cookies: a session token (for account users) and rate limit state (to prevent rapid repeat requests). We do not use advertising cookies, tracking pixels, Google Analytics, Meta Pixel, or any third-party analytics that sell your data.`,
  },
  {
    title: "9. AI Moderation",
    body: `All posts (text and images) are processed by our AI moderation system (currently Google Gemini API) to check for violations of our public Constitution.

This means your content is sent to Google's API for analysis. Google's use of this data is governed by their API Terms. We use the API in a way consistent with not using your data to train Google's models, to the extent that option is available.

Moderation decisions, including content of removed posts, may be retained in our public Transparency Log at jawwing.com/transparency. If your post is removed for a violation, a summary may appear in this public log.`,
  },
  {
    title: "10. AI-Generated Content",
    body: `Jawwing uses AI agents to seed content on the platform, particularly in lower-traffic areas. These AI posts are processed, stored, and moderated the same way as user-generated content.`,
  },
  {
    title: "11. Data Retention",
    body: `Post content (text): ~24 hours from posting, then permanently deleted.
Post images: ~24 hours from posting, then deleted from Vercel Blob.
GPS coordinates (with post): Deleted with post (~24 hours).
IP hash: Retained for rate limiting; reviewed periodically for deletion.
Email hash (if account): Retained while account is active; deleted on account deletion.
Moderation logs: Retained indefinitely for transparency and abuse prevention.
Session tokens: Expire per session or on logout.

"Approximately 24 hours" — post expiration is handled by automated jobs. Exact timing may vary by minutes to hours.`,
  },
  {
    title: "12. Law Enforcement and Legal Process",
    body: `We will comply with valid legal process, including subpoenas, court orders, and law enforcement requests.

What we could produce if compelled: hashed IP addresses associated with a post or account, post content (if not yet expired), GPS coordinates associated with a post (if not yet expired), timestamps, email hash (if account exists).

What we cannot produce: raw IP addresses (we don't have them), raw email addresses (we don't have them), location history (we don't track it).

If legally permitted, we will attempt to notify you before producing data. We may be prohibited from doing so (e.g., under a gag order), and we are not obligated to notify you.

Jawwing is not designed to protect against lawful government access. Do not rely on Jawwing for anonymity in situations where government surveillance is a concern.`,
  },
  {
    title: "13. Third-Party Services",
    body: `Vercel — hosting, CDN, Blob storage (vercel.com/legal/privacy-policy).
Google Gemini API — AI moderation (policies.google.com/privacy).
Resend — email verification one-time codes (resend.com/privacy).

We do not sell your data to any third party. We do not share data with data brokers, advertisers, or analytics companies.`,
  },
  {
    title: "14. Children's Privacy (COPPA)",
    body: `Jawwing is not directed to children under 13. We do not knowingly collect personal information from anyone under 13. If we become aware we have collected data from someone under 13, we will delete it immediately.

If you are a parent or guardian and believe your child under 13 has used Jawwing, contact legal@jawwing.com.`,
  },
  {
    title: "15. International Users and GDPR",
    body: `The Service is operated from the United States. Your data may be processed in the United States.

EU/EEA/UK users: GDPR or UK GDPR may apply. Our legal basis for processing is legitimate interests — specifically, operating the platform and preventing abuse. You may have rights of access, deletion ("right to be forgotten"), portability, and the right to object to processing. Contact privacy@jawwing.com to exercise these rights.

Practical reality: Because we store hashed identifiers rather than names or raw emails, it may be difficult to fulfill access/deletion requests for no-account users — we may not be able to identify which data is "yours" without additional information from you.

You also have the right to lodge a complaint with your local data protection supervisory authority.`,
  },
  {
    title: "16. Data Security",
    body: `We take reasonable steps to protect your data: hashing identifiers (IP, email) rather than storing plaintext, using HTTPS for all connections, storing images on a third-party CDN with access controls, and using secure httpOnly session cookies.

No system is perfectly secure. We cannot guarantee that unauthorized access, hacking, or data breaches will never occur. If a breach occurs that affects your rights, we will notify as required by law.`,
  },
  {
    title: "17. Changes to This Policy",
    body: `We may update this Privacy Policy at any time. We'll update the "Last Updated" date at the top. Continued use of the Service after changes means you accept the new policy.`,
  },
  {
    title: "18. Contact",
    body: `Privacy inquiries and GDPR requests: privacy@jawwing.com
Child safety / COPPA: legal@jawwing.com
DMCA takedowns: dmca@jawwing.com`,
  },
];

export default function PrivacyPage() {
  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      <nav style={{ borderBottom: "1px solid #1F1F1F" }} className="px-6 py-4 flex items-center justify-between">
        <Link href="/" style={{ ...MONO, letterSpacing: "0.12em", fontWeight: 700, fontSize: "0.875rem", color: "#FFFFFF", textDecoration: "none" }}>
          JAWWING
        </Link>
        <Link href="/" style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.06em", textDecoration: "none" }}
          className="hover:text-white transition-colors">
          ← HOME
        </Link>
      </nav>

      <main style={{ maxWidth: "640px", margin: "0 auto", padding: "48px 24px 96px" }}>
        <p style={SECTION_LABEL} className="mb-4">LEGAL</p>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF", marginBottom: "8px" }}>
          Privacy Policy
        </h1>
        <p style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.04em", marginBottom: "16px" }}>
          EFFECTIVE: MARCH 10, 2026 · LAST UPDATED: MARCH 10, 2026
        </p>
        <p style={{ color: "#C0C0C0", fontSize: "0.9375rem", lineHeight: 1.7, marginBottom: "48px" }}>
          Your privacy matters. This policy explains exactly what data Jawwing collects, how it&apos;s stored, how long we keep it, and your rights. We collect as little as possible, we hash what we have to store, posts expire in 24 hours, and we never sell your data.
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
            { href: "/about", label: "ABOUT" },
            { href: "/terms", label: "TERMS" },
            { href: "/privacy", label: "PRIVACY" },
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
          © {new Date().getFullYear()} JAWWING · ANONYMOUS LOCAL POSTS
        </p>
      </footer>
    </div>
  );
}
