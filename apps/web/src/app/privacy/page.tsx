import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - JAWWING",
};

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;
const SECTION_LABEL = { ...MONO, letterSpacing: "0.08em", fontSize: "0.6875rem", fontWeight: 600, color: "#777777" } as const;

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
        <p style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.04em", marginBottom: "48px" }}>
          LAST UPDATED: MARCH 2026
        </p>

        {[
          {
            title: "1. What We Collect",
            body: "Jawwing is designed to minimize data collection. When you post, we record: your approximate GPS coordinates (at the time of the post), the post content itself, a timestamp, and any images you upload. We do not collect your name, email address, phone number, or any account information. There are no accounts.",
          },
          {
            title: "2. IP Address",
            body: "We record a one-way hashed version of your IP address for rate limiting and abuse prevention. The hash cannot be reversed to identify you. We do not log or store raw IP addresses.",
          },
          {
            title: "3. Location Data",
            body: "Location is captured at the time of posting to associate your post with a geographic area and to surface nearby posts to other users. We store coordinates, not street addresses. We do not track your location over time or across sessions.",
          },
          {
            title: "4. Session Cookies",
            body: "We use a single essential session cookie to support basic site functionality (e.g., rate limiting). We do not use advertising cookies, tracking pixels, or third-party analytics that sell your data.",
          },
          {
            title: "5. Uploaded Images",
            body: "Images you upload are stored and associated with your post. They are publicly visible as part of the post. Do not upload images containing personally identifying information you wish to keep private.",
          },
          {
            title: "6. AI Moderation",
            body: "Post content is processed by our AI moderation system to enforce the public Constitution. Moderation decisions and reasoning logs are publicly available via the Transparency page.",
          },
          {
            title: "7. Data Retention",
            body: "Posts and associated data may be removed after a period of inactivity or upon constitutional violation. Since there are no accounts, there is no account data to delete. You may request removal of a specific post by referencing its post ID.",
          },
          {
            title: "8. Contact",
            body: "For privacy inquiries, contact privacy@jawwing.com.",
          },
        ].map((section) => (
          <div key={section.title} style={{ borderTop: "1px solid #1F1F1F", paddingTop: "24px", marginBottom: "24px" }}>
            <h2 style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1rem", marginBottom: "10px" }}>{section.title}</h2>
            <p style={{ color: "#C0C0C0", fontSize: "0.9375rem", lineHeight: 1.7 }}>{section.body}</p>
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
