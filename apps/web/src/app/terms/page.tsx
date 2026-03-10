import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - JAWWING",
};

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;
const SECTION_LABEL = { ...MONO, letterSpacing: "0.08em", fontSize: "0.6875rem", fontWeight: 600, color: "#777777" } as const;

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.04em", marginBottom: "48px" }}>
          LAST UPDATED: MARCH 2026
        </p>

        {[
          {
            title: "1. Acceptance of Terms",
            body: "By accessing or using Jawwing, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.",
          },
          {
            title: "2. Anonymous Use",
            body: "Jawwing does not require account creation. Posts are tied to approximate geographic location. We do not collect personally identifiable information beyond what is technically necessary for the service to function.",
          },
          {
            title: "3. Content Rules",
            body: "All content is subject to our public Constitution. Posts violating the Constitution may be removed by our AI moderation system. The removal log is public and auditable.",
          },
          {
            title: "4. Prohibited Content",
            body: "You may not post content that: threatens violence, sexualizes minors, constitutes targeted harassment, is designed to deceive other users, or violates applicable law.",
          },
          {
            title: "5. No Warranty",
            body: "Jawwing is provided \"as is\" without warranty of any kind. We do not guarantee uptime, accuracy, or fitness for any particular purpose.",
          },
          {
            title: "6. Limitation of Liability",
            body: "To the fullest extent permitted by law, Jawwing and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the service.",
          },
          {
            title: "7. Governing Law",
            body: "These terms are governed by the laws of the United States. Disputes shall be resolved in applicable federal or state courts.",
          },
          {
            title: "8. Changes",
            body: "We may update these terms at any time. Continued use of the service after changes constitutes acceptance.",
          },
        ].map((section) => (
          <div key={section.title} style={{ borderTop: "1px solid #1F1F1F", paddingTop: "24px", marginBottom: "24px" }}>
            <h2 style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1rem", marginBottom: "10px" }}>{section.title}</h2>
            <p style={{ color: "#C0C0C0", fontSize: "0.9375rem", lineHeight: 1.7 }}>{section.body}</p>
          </div>
        ))}

        <div style={{ borderTop: "1px solid #1F1F1F", paddingTop: "32px", display: "flex", gap: "24px" }}>
          <Link href="/privacy" style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.06em", textDecoration: "none" }}
            className="hover:text-white transition-colors">
            PRIVACY POLICY →
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
