"use client";

import { useEffect } from "react";
import Link from "next/link";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
            color: "#FF3333",
            marginBottom: "16px",
          }}
        >
          ERROR
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
          SOMETHING BROKE
        </h1>
        <p style={{ color: "#777777", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "40px" }}>
          An unexpected error occurred. It&apos;s not you. It&apos;s us.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => reset()}
            style={{
              ...MONO,
              background: "#FFFFFF",
              color: "#000000",
              border: "1px solid #FFFFFF",
              padding: "10px 24px",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              cursor: "pointer",
              display: "inline-block",
              transition: "background 150ms, color 150ms",
            }}
          >
            TRY AGAIN
          </button>
          <Link
            href="/"
            style={{
              ...MONO,
              background: "transparent",
              color: "#FFFFFF",
              border: "1px solid #333333",
              padding: "10px 24px",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              display: "inline-block",
              textDecoration: "none",
              transition: "border-color 150ms",
            }}
          >
            ← BACK TO FEED
          </Link>
        </div>
      </div>
    </div>
  );
}
