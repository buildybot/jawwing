import Link from "next/link";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

export default function NotFound() {
  return (
    <div
      style={{ background: "#000000", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}
    >
      <div style={{ textAlign: "center", maxWidth: "480px" }}>
        <p
          style={{
            ...MONO,
            fontSize: "clamp(5rem, 20vw, 9rem)",
            fontWeight: 700,
            color: "#1F1F1F",
            lineHeight: 1,
            letterSpacing: "-0.04em",
            marginBottom: "24px",
          }}
        >
          404
        </p>
        <h1
          style={{
            ...MONO,
            fontSize: "0.875rem",
            fontWeight: 600,
            letterSpacing: "0.12em",
            color: "#FFFFFF",
            marginBottom: "12px",
            textTransform: "uppercase",
          }}
        >
          THIS TERRITORY IS UNCHARTED
        </h1>
        <p style={{ color: "#777777", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "40px" }}>
          The page you&apos;re looking for doesn&apos;t exist or has been removed.
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
            transition: "background 150ms, color 150ms",
          }}
        >
          ← BACK TO HOME
        </Link>
      </div>
    </div>
  );
}
