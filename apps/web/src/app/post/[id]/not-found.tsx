import Link from "next/link";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

export default function PostNotFound() {
  return (
    <div
      style={{
        background: "#000000",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <p
          style={{
            ...MONO,
            fontSize: "0.6875rem",
            letterSpacing: "0.1em",
            color: "#777777",
            marginBottom: "16px",
          }}
        >
          POST
        </p>
        <h1
          style={{
            ...MONO,
            fontSize: "1.5rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "#FFFFFF",
            marginBottom: "12px",
          }}
        >
          POST EXPIRED
        </h1>
        <p style={{ color: "#777777", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "40px" }}>
          This post no longer exists or has been removed by the AI moderator.
        </p>
        <Link
          href="/"
          style={{
            ...MONO,
            background: "#FFFFFF",
            color: "#000000",
            border: "1px solid #FFFFFF",
            padding: "10px 24px",
            fontSize: "0.75rem",
            fontWeight: 600,
            letterSpacing: "0.08em",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          ← BACK TO FEED
        </Link>
      </div>
    </div>
  );
}
