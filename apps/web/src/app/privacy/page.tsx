import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — JAWWING",
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
            body: "Jawwing collects minimal data. When you post, we record: approximate GPS coordinates, post content, and a timestamp. We do not collect your name, email, phone number, or any identifying information unless you voluntarily join our waitlist.",
          },
          {
            title: "2. Location Data",
            body: "Location data is used only to associate posts with a geographic area and to surface nearby posts to other users. We store coordinates, not addresses. We do not track your movement over time.",
          },
          {
            title: "3. Waitlist",
            body: "If you submit your email for waitlist access, we store your email address solely to notify you when access opens. We will not sell, rent, or share your email with third parties.",
          },
          {
            title: "4. Cookies & Tracking",
            body: "We use minimal, essential session data to authenticate users. We do not use third-party advertising trackers or analytics platforms that sell your data.",
          },
          {
            title: "5. AI Moderation",
            body: "Post content is processed by our AI moderation system to enforce the public Constitution. Moderation decisions and logs are publicly available via the Transparency page.",
          },
          {
            title: "6. Data Retention",
            body: "Posts may be removed after a period of inactivity or upon constitutional violation. Waitlist emails are deleted after you receive access or upon request.",
          },
          {
            title: "7. Your Rights",
            body: "You may request deletion of any data we hold about you. Since most usage is anonymous, data deletion requests should reference the specific post ID or email address submitted.",
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

        <div style={{ borderTop: "1px solid #1F1F1F", paddingTop: "32px", display: "flex", gap: "24px" }}>
          <Link href="/terms" style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.06em", textDecoration: "none" }}
            className="hover:text-white transition-colors">
            TERMS OF SERVICE →
          </Link>
          <Link href="/constitution" style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.06em", textDecoration: "none" }}
            className="hover:text-white transition-colors">
            CONSTITUTION →
          </Link>
        </div>
      </main>
    </div>
  );
}
