"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import BlockedUsersPanel from "@/components/BlockedUsersPanel";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
};

const SECTION_LABEL: React.CSSProperties = {
  fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
  letterSpacing: "0.1em",
  fontSize: "0.5625rem",
  fontWeight: 700,
  color: "#888888",
  textTransform: "uppercase" as const,
  marginBottom: "2px",
};

const ROW: React.CSSProperties = {
  borderBottom: "1px solid #1A1A1A",
  padding: "14px 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const LINK_STYLE: React.CSSProperties = {
  fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
  color: "#FFFFFF",
  fontSize: "0.8125rem",
  letterSpacing: "0.06em",
  textDecoration: "none",
};

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const masked = user.length <= 2 ? user : user[0] + "•".repeat(user.length - 2) + user[user.length - 1];
  return `${masked}@${domain}`;
}

export default function SettingsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const loggedIn = document.cookie.includes("jw_account_ok=1");
    setIsLoggedIn(loggedIn);
    if (loggedIn) {
      fetch("/api/auth/me")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.email) setEmail(data.email);
        })
        .catch(() => {});
    }
  }, []);

  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      {/* Header */}
      <div
        style={{
          borderBottom: "1px solid #1F1F1F",
          padding: "16px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <Link
          href="/"
          style={{ ...MONO, color: "#888888", fontSize: "0.75rem", letterSpacing: "0.06em", textDecoration: "none" }}
          className="hover:text-white transition-colors"
        >
          ← BACK
        </Link>
      </div>

      <main
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          padding: "32px 16px 80px",
        }}
      >
        <h1
          style={{
            ...MONO,
            color: "#FFFFFF",
            fontSize: "1rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            marginBottom: "40px",
          }}
        >
          SETTINGS
        </h1>

        {/* LEGAL & INFO */}
        <section style={{ marginBottom: "40px" }}>
          <p style={SECTION_LABEL}>LEGAL &amp; INFO</p>
          <div style={{ borderTop: "1px solid #1A1A1A" }}>
            {[
              { href: "/constitution", label: "CONSTITUTION" },
              { href: "/transparency", label: "TRANSPARENCY" },
              { href: "/terms", label: "TERMS OF SERVICE" },
              { href: "/privacy", label: "PRIVACY POLICY" },
            ].map(({ href, label }) => (
              <div key={href} style={ROW}>
                <Link href={href} style={LINK_STYLE} className="hover:text-[#AAAAAA] transition-colors">
                  {label}
                </Link>
                <span style={{ color: "#333333", fontSize: "0.75rem" }}>→</span>
              </div>
            ))}
          </div>
        </section>

        {/* ACCOUNT */}
        <section style={{ marginBottom: "40px" }}>
          <p style={SECTION_LABEL}>ACCOUNT</p>
          <div style={{ borderTop: "1px solid #1A1A1A" }}>
            {isLoggedIn ? (
              <>
                {email && (
                  <div style={ROW}>
                    <span style={{ ...MONO, color: "#888888", fontSize: "0.8125rem", letterSpacing: "0.04em" }}>
                      {maskEmail(email)}
                    </span>
                  </div>
                )}
                <div style={ROW}>
                  <Link href="/my-posts" style={LINK_STYLE} className="hover:text-[#AAAAAA] transition-colors">
                    MY POSTS
                  </Link>
                  <span style={{ color: "#333333", fontSize: "0.75rem" }}>→</span>
                </div>
              </>
            ) : (
              <div style={ROW}>
                <Link href="/signin" style={LINK_STYLE} className="hover:text-[#AAAAAA] transition-colors">
                  SIGN IN
                </Link>
                <span style={{ color: "#333333", fontSize: "0.75rem" }}>→</span>
              </div>
            )}
          </div>
        </section>

        {/* BLOCKED USERS */}
        <section style={{ marginBottom: "40px" }}>
          <p style={SECTION_LABEL}>BLOCKED USERS</p>
          <div style={{ borderTop: "1px solid #1A1A1A", paddingTop: "16px" }}>
            <BlockedUsersPanel />
          </div>
        </section>

        {/* SUPPORT */}
        <section style={{ marginBottom: "40px" }}>
          <p style={SECTION_LABEL}>SUPPORT</p>
          <div style={{ borderTop: "1px solid #1A1A1A" }}>
            <div style={ROW}>
              <a
                href="mailto:support@jawwing.com"
                style={LINK_STYLE}
                className="hover:text-[#AAAAAA] transition-colors"
              >
                support@jawwing.com
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <p
          style={{
            ...MONO,
            color: "#333333",
            fontSize: "0.5625rem",
            letterSpacing: "0.08em",
            marginTop: "48px",
          }}
        >
          JAWWING · 2026
        </p>
      </main>
    </div>
  );
}
