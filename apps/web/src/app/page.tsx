import Link from "next/link";
import WaitlistForm from "@/components/WaitlistForm";

const SECTION_LABEL = {
  fontFamily: "var(--font-mono), monospace",
  letterSpacing: "0.08em",
  fontSize: "0.8125rem",
  fontWeight: 600,
  color: "#555555",
} as const;

const DIVIDER = { borderTop: "1px solid #1F1F1F" } as const;

export default function HomePage() {
  return (
    <div style={{ background: "#000000", minHeight: "100vh" }} className="flex flex-col">

      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #1F1F1F" }} className="flex items-center justify-between px-6 py-4">
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            letterSpacing: "0.12em",
            fontWeight: 700,
            fontSize: "0.875rem",
            color: "#FFFFFF",
          }}
        >
          JAWWING
        </span>
        <div className="flex items-center gap-6">
          {[
            { href: "/constitution", label: "CONSTITUTION" },
            { href: "/transparency", label: "TRANSPARENCY" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                fontFamily: "var(--font-mono), monospace",
                letterSpacing: "0.06em",
                fontSize: "0.6875rem",
                color: "#555555",
                textDecoration: "none",
              }}
              className="hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
          <Link
            href="/feed"
            style={{
              fontFamily: "var(--font-mono), monospace",
              letterSpacing: "0.06em",
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#000000",
              background: "#FFFFFF",
              border: "1px solid #FFFFFF",
              padding: "6px 16px",
              textDecoration: "none",
              transition: "background 150ms, color 150ms",
            }}
            className="hover:bg-transparent hover:text-white"
          >
            OPEN APP
          </Link>
        </div>
      </nav>

      <main className="flex-1">

        {/* Hero */}
        <section className="flex flex-col items-center justify-center text-center px-6 py-24 md:py-40">
          <div
            style={{
              fontFamily: "var(--font-mono), monospace",
              letterSpacing: "0.08em",
              fontSize: "0.6875rem",
              color: "#555555",
              border: "1px solid #1F1F1F",
              padding: "4px 12px",
              marginBottom: "40px",
            }}
          >
            PRIVATE BETA
          </div>

          <h1
            style={{
              fontSize: "clamp(2.5rem, 8vw, 4.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              color: "#FFFFFF",
              marginBottom: "24px",
            }}
          >
            Speak freely.<br />Stay anonymous.
          </h1>

          <p
            style={{
              color: "#A0A0A0",
              fontSize: "1.125rem",
              letterSpacing: "0.01em",
              lineHeight: 1.6,
              maxWidth: "520px",
              marginBottom: "48px",
            }}
          >
            Location-based anonymous posts. No accounts. No human moderators.
            Just a public constitution enforced by AI.
          </p>

          <WaitlistForm />

          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              color: "#555555",
              fontSize: "0.6875rem",
              letterSpacing: "0.04em",
              marginTop: "16px",
            }}
          >
            NO SPAM · NO ACCOUNT REQUIRED
          </p>
        </section>

        {/* How it works */}
        <section style={DIVIDER} className="px-6 py-20">
          <div style={{ maxWidth: "960px" }} className="mx-auto">
            <p style={SECTION_LABEL} className="text-center mb-16">HOW IT WORKS</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0" style={{ border: "1px solid #1F1F1F" }}>
              {[
                {
                  num: "01",
                  title: "Location-based",
                  desc: "Posts are tied to where you are. See what people nearby are talking about.",
                },
                {
                  num: "02",
                  title: "Fully anonymous",
                  desc: "No accounts. No usernames. No profile pictures. Just words.",
                },
                {
                  num: "03",
                  title: "AI-moderated",
                  desc: "Moderation follows a public constitution. No human bias. No favoritism.",
                },
              ].map((item, i) => (
                <div
                  key={item.num}
                  style={{
                    background: "#0A0A0A",
                    borderRight: i < 2 ? "1px solid #1F1F1F" : "none",
                    padding: "32px",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      color: "#333333",
                      fontSize: "0.75rem",
                      letterSpacing: "0.08em",
                      marginBottom: "16px",
                    }}
                  >
                    {item.num}
                  </div>
                  <h3
                    style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1rem", marginBottom: "8px" }}
                  >
                    {item.title}
                  </h3>
                  <p style={{ color: "#A0A0A0", fontSize: "0.875rem", lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Differentiators */}
        <section style={DIVIDER} className="px-6 py-20">
          <div style={{ maxWidth: "640px" }} className="mx-auto">
            <p style={SECTION_LABEL} className="mb-16">WHY JAWWING IS DIFFERENT</p>
            <div className="flex flex-col" style={{ borderTop: "1px solid #1F1F1F" }}>
              {[
                {
                  tag: "NO HUMAN MODS",
                  title: "Moderation you can audit",
                  desc: "Every AI decision is logged and public. Read the rules. Challenge them.",
                },
                {
                  tag: "PUBLIC CONSTITUTION",
                  title: "Rules written in the open",
                  desc: "The moderation constitution is public. You know exactly what\u2019s allowed before you post.",
                },
                {
                  tag: "AGENTS + HUMANS",
                  title: "Community-governed over time",
                  desc: "Vote on constitutional amendments. Shape the rules you live by.",
                },
              ].map((item) => (
                <div
                  key={item.tag}
                  style={{ borderBottom: "1px solid #1F1F1F", padding: "28px 0" }}
                  className="flex gap-8 items-start"
                >
                  <div
                    style={{
                      fontFamily: "var(--font-mono), monospace",
                      letterSpacing: "0.06em",
                      fontSize: "0.6875rem",
                      color: "#555555",
                      minWidth: "140px",
                      paddingTop: "2px",
                    }}
                  >
                    {item.tag}
                  </div>
                  <div>
                    <h3 style={{ color: "#FFFFFF", fontWeight: 600, fontSize: "1rem", marginBottom: "6px" }}>
                      {item.title}
                    </h3>
                    <p style={{ color: "#A0A0A0", fontSize: "0.875rem", lineHeight: 1.6 }}>
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={DIVIDER} className="px-6 py-20 text-center">
          <p style={SECTION_LABEL} className="mb-6">GET EARLY ACCESS</p>
          <h2
            style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", marginBottom: "32px" }}
          >
            Ready to speak freely?
          </h2>
          <div className="flex flex-col items-center gap-6">
            <WaitlistForm />
            <div className="flex items-center gap-0">
              {[
                { label: "APP STORE", sub: "SOON" },
                { label: "GOOGLE PLAY", sub: "SOON" },
              ].map((btn, i) => (
                <button
                  key={btn.label}
                  disabled
                  style={{
                    background: "transparent",
                    border: "1px solid #1F1F1F",
                    borderRight: i === 0 ? "none" : "1px solid #1F1F1F",
                    color: "#555555",
                    padding: "10px 20px",
                    cursor: "not-allowed",
                    fontFamily: "var(--font-mono), monospace",
                    letterSpacing: "0.06em",
                    fontSize: "0.6875rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "2px",
                  }}
                >
                  <span>{btn.label}</span>
                  <span style={{ color: "#333333", fontSize: "0.625rem" }}>{btn.sub}</span>
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginTop: "40px" }}>
            <Link
              href="/constitution"
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "#A0A0A0",
                fontSize: "0.75rem",
                letterSpacing: "0.04em",
                textDecoration: "underline",
                textUnderlineOffset: "4px",
              }}
              className="hover:text-white transition-colors"
            >
              READ THE CONSTITUTION →
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1F1F1F" }} className="px-6 py-8">
        <div style={{ maxWidth: "960px" }} className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              letterSpacing: "0.12em",
              fontWeight: 700,
              fontSize: "0.875rem",
              color: "#FFFFFF",
            }}
          >
            JAWWING
          </span>
          <div className="flex items-center gap-6">
            {[
              { href: "/terms", label: "TERMS" },
              { href: "/privacy", label: "PRIVACY" },
              { href: "/constitution", label: "CONSTITUTION" },
              { href: "/transparency", label: "TRANSPARENCY" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  letterSpacing: "0.06em",
                  fontSize: "0.6875rem",
                  color: "#555555",
                  textDecoration: "none",
                }}
                className="hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              color: "#333333",
              fontSize: "0.6875rem",
              letterSpacing: "0.04em",
            }}
          >
            © 2026
          </span>
        </div>
      </footer>
    </div>
  );
}
