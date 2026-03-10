import Link from "next/link";

const MONO: React.CSSProperties = { fontFamily: "var(--font-mono), monospace" };

export default function AgeRestrictedPage() {
  return (
    <div
      style={{
        background: "#000000",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ maxWidth: "360px", width: "100%", textAlign: "center" }}>
        <p
          style={{
            ...MONO,
            color: "#333333",
            fontSize: "0.75rem",
            letterSpacing: "0.2em",
            marginBottom: "48px",
          }}
        >
          JAWWING
        </p>

        <div
          style={{
            border: "1px solid #1F1F1F",
            padding: "32px 24px",
            marginBottom: "32px",
          }}
        >
          <p
            style={{
              ...MONO,
              color: "#FFFFFF",
              fontSize: "0.9375rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              lineHeight: 1.4,
              marginBottom: "16px",
            }}
          >
            SORRY
          </p>
          <p
            style={{
              color: "#777777",
              fontSize: "0.9375rem",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            Jawwing is for users 18 and older, located in the United States.
          </p>
        </div>

        <Link
          href="/"
          style={{
            ...MONO,
            color: "#333333",
            fontSize: "0.625rem",
            letterSpacing: "0.1em",
            textDecoration: "none",
          }}
        >
          ← BACK
        </Link>
      </div>
    </div>
  );
}
