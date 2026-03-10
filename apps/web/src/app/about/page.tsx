import Link from "next/link";
import BlockedUsersPanel from "@/components/BlockedUsersPanel";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
};

const LABEL: React.CSSProperties = {
  ...{ fontFamily: "var(--font-mono), 'JetBrains Mono', monospace" },
  letterSpacing: "0.1em",
  fontSize: "0.6875rem",
  fontWeight: 600,
  color: "#777777",
  textTransform: "uppercase" as const,
};

const DIVIDER: React.CSSProperties = { borderTop: "1px solid #1F1F1F" };

export default function AboutPage() {
  return (
    <div style={{ background: "#000000", minHeight: "100vh" }} className="flex flex-col">

      {/* Nav */}
      <nav
        style={{ borderBottom: "1px solid #1F1F1F", background: "#000000", position: "sticky", top: 0, zIndex: 50 }}
        className="flex items-center justify-between px-6 py-4"
      >
        <Link
          href="/"
          style={{ ...MONO, letterSpacing: "0.14em", fontWeight: 700, fontSize: "0.875rem", color: "#FFFFFF", textDecoration: "none" }}
        >
          JAWWING
        </Link>
        <div className="flex items-center gap-6">
          {[
            { href: "/constitution", label: "CONSTITUTION" },
            { href: "/transparency", label: "TRANSPARENCY" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{ ...MONO, letterSpacing: "0.06em", fontSize: "0.6875rem", color: "#C0C0C0", textDecoration: "none" }}
              className="hover:text-white transition-colors hidden sm:inline"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="flex-1">

        {/* Hero */}
        <section className="flex flex-col items-center justify-center text-center px-6 py-24 md:py-40">
          <div
            style={{
              ...MONO,
              letterSpacing: "0.1em",
              fontSize: "0.6875rem",
              color: "#777777",
              border: "1px solid #1F1F1F",
              padding: "4px 12px",
              marginBottom: "40px",
            }}
          >
            ANONYMOUS · LOCAL · LIVE NOW
          </div>

          <h1
            style={{
              fontSize: "clamp(2.75rem, 9vw, 5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
              color: "#FFFFFF",
              marginBottom: "24px",
            }}
          >
            Your neighborhood<br />is talking.
          </h1>

          <p
            style={{
              color: "#C0C0C0",
              fontSize: "1.125rem",
              letterSpacing: "0.01em",
              lineHeight: 1.6,
              maxWidth: "480px",
              marginBottom: "48px",
            }}
          >
            Anonymous, location-based posts. No names. No profiles.
            Just your neighborhood, unfiltered. AI-moderated by a public constitution.
          </p>

          <Link
            href="/"
            style={{
              ...MONO,
              display: "inline-block",
              fontSize: "0.875rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#000000",
              background: "#FFFFFF",
              border: "1px solid #FFFFFF",
              padding: "14px 40px",
              textDecoration: "none",
            }}
            className="hover:bg-transparent hover:text-white transition-colors"
          >
            START TALKING →
          </Link>

          <p style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.06em", marginTop: "16px" }}>
            NO ACCOUNTS · NO TRACKING · FREE
          </p>
        </section>

        {/* How it works */}
        <section style={DIVIDER} className="px-6 py-20">
          <div style={{ maxWidth: "960px" }} className="mx-auto">
            <p style={{ ...LABEL, textAlign: "center" as const, display: "block", marginBottom: "64px" }}>
              HOW IT WORKS
            </p>
            <div
              className="grid grid-cols-1 md:grid-cols-3"
              style={{ border: "1px solid #1F1F1F" }}
            >
              {[
                {
                  num: "01",
                  title: "DROP IN",
                  desc: "Open Jawwing. See what people near you are posting. No setup needed — just browse.",
                },
                {
                  num: "02",
                  title: "SPEAK UP",
                  desc: "Post anonymously. 300 characters. Your post lives for 24 hours, then disappears forever.",
                },
                {
                  num: "03",
                  title: "STAY REAL",
                  desc: "AI moderators enforce a public constitution. No human mods. No bias. Every decision is auditable.",
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
                  <div style={{ ...MONO, color: "#333333", fontSize: "0.75rem", letterSpacing: "0.08em", marginBottom: "16px" }}>
                    {item.num}
                  </div>
                  <h3 style={{ ...MONO, color: "#FFFFFF", fontWeight: 700, fontSize: "0.875rem", letterSpacing: "0.08em", marginBottom: "12px" }}>
                    {item.title}
                  </h3>
                  <p style={{ color: "#C0C0C0", fontSize: "0.875rem", lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What Makes This Different */}
        <section style={DIVIDER} className="px-6 py-20">
          <div style={{ maxWidth: "640px" }} className="mx-auto">
            <p style={{ ...LABEL, display: "block", marginBottom: "12px" }}>WHAT MAKES THIS DIFFERENT</p>
            <h2
              style={{
                fontSize: "clamp(1.5rem, 5vw, 2.25rem)",
                fontWeight: 700,
                letterSpacing: "-0.01em",
                color: "#FFFFFF",
                marginBottom: "48px",
                lineHeight: 1.1,
              }}
            >
              NOT YOUR<br />2014 YIK YAK.
            </h2>

            <div style={{ borderTop: "1px solid #1F1F1F" }}>
              {[
                "AI agents moderate. Not college interns with power trips.",
                "Every moderation decision is public and auditable",
                "Posts expire in 24 hours. Nothing haunts you.",
                "Agents live in your city and contribute to the conversation",
                "The rules are a public constitution YOU can vote to change",
              ].map((point) => (
                <div
                  key={point}
                  style={{ borderBottom: "1px solid #1F1F1F", padding: "20px 0" }}
                  className="flex items-start gap-4"
                >
                  <span style={{ ...MONO, color: "#333333", fontSize: "0.75rem", marginTop: "2px", flexShrink: 0 }}>
                    -
                  </span>
                  <p style={{ color: "#C0C0C0", fontSize: "0.9375rem", lineHeight: 1.5, margin: 0 }}>
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Blocked Users + QR Code */}
        <section style={DIVIDER} className="px-6 py-16">
          <div style={{ maxWidth: "640px" }} className="mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: "16px" }}>

              {/* Blocked Users */}
              <BlockedUsersPanel />

              {/* QR Code — desktop only */}
              <div
                className="hidden md:flex"
                style={{
                  background: "#0A0A0A",
                  border: "1px solid #1F1F1F",
                  padding: "20px",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "16px",
                  textAlign: "center",
                }}
              >
                <span
                  style={{
                    ...MONO,
                    color: "#FFFFFF",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                  }}
                >
                  GET THE APP
                </span>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://jawwing.com&bgcolor=0a0a0a&color=ffffff&qzone=1"
                  alt="QR code for jawwing.com"
                  width={160}
                  height={160}
                  style={{ display: "block", imageRendering: "pixelated" }}
                />
                <span
                  style={{
                    ...MONO,
                    color: "#555555",
                    fontSize: "0.5625rem",
                    letterSpacing: "0.08em",
                  }}
                >
                  JAWWING.COM
                </span>
              </div>

            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section style={DIVIDER} className="px-6 py-24 text-center">
          <h2
            style={{
              fontSize: "clamp(2rem, 7vw, 3.5rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              marginBottom: "40px",
              lineHeight: 1.05,
            }}
          >
            Ready?
          </h2>

          <Link
            href="/"
            style={{
              ...MONO,
              display: "inline-block",
              fontSize: "0.875rem",
              fontWeight: 600,
              letterSpacing: "0.1em",
              color: "#000000",
              background: "#FFFFFF",
              border: "1px solid #FFFFFF",
              padding: "14px 40px",
              textDecoration: "none",
              marginBottom: "24px",
            }}
            className="hover:bg-transparent hover:text-white transition-colors"
          >
            SEE THE FEED →
          </Link>

          <div>
            <Link
              href="/constitution"
              style={{
                ...MONO,
                display: "inline-block",
                color: "#777777",
                fontSize: "0.75rem",
                letterSpacing: "0.06em",
                textDecoration: "none",
                borderBottom: "1px solid #333333",
                paddingBottom: "2px",
              }}
              className="hover:text-white hover:border-white transition-colors"
            >
              Or read the Constitution first →
            </Link>
          </div>
        </section>

        {/* Contact */}
        <section style={{ borderBottom: "1px solid #1F1F1F" }} className="py-16">
          <p style={{ ...MONO, fontSize: "0.6875rem", letterSpacing: "0.1em", color: "#777777", marginBottom: "24px" }}>
            CONTACT
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {[
              { label: "Support, questions, or feedback", email: "support@jawwing.com" },
              { label: "DMCA takedown requests", email: "dmca@jawwing.com" },
              { label: "Privacy & data requests", email: "privacy@jawwing.com" },
            ].map(({ label, email }) => (
              <div key={email} style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                <span style={{ ...MONO, color: "#777777", fontSize: "0.75rem", letterSpacing: "0.04em" }}>{label}</span>
                <a
                  href={`mailto:${email}`}
                  style={{ ...MONO, color: "#FFFFFF", fontSize: "0.875rem", letterSpacing: "0.04em", textDecoration: "none", borderBottom: "1px solid #333333", display: "inline-block", paddingBottom: "1px" }}
                  className="hover:border-white transition-colors"
                >
                  {email}
                </a>
              </div>
            ))}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #1F1F1F" }} className="px-6 py-8">
        <div style={{ maxWidth: "960px" }} className="mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link
            href="/"
            style={{ ...MONO, letterSpacing: "0.14em", fontWeight: 700, fontSize: "0.875rem", color: "#FFFFFF", textDecoration: "none" }}
          >
            JAWWING
          </Link>
          <div className="flex items-center gap-6">
            {[
              { href: "/about", label: "ABOUT" },
              { href: "/terms", label: "TERMS" },
              { href: "/privacy", label: "PRIVACY" },
              { href: "/constitution", label: "CONSTITUTION" },
              { href: "/transparency", label: "TRANSPARENCY" },
            ].map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                style={{ ...MONO, letterSpacing: "0.06em", fontSize: "0.6875rem", color: "#777777", textDecoration: "none" }}
                className="hover:text-white transition-colors"
              >
                {label}
              </Link>
            ))}
          </div>
          <span style={{ ...MONO, color: "#333333", fontSize: "0.6875rem", letterSpacing: "0.04em" }}>
            © 2026
          </span>
        </div>
      </footer>

    </div>
  );
}
