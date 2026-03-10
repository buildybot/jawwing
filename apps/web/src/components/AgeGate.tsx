"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const STORAGE_KEY = "jawwing_age_confirmed";
const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

export default function AgeGate({ children }: { children: React.ReactNode }) {
  const [confirmed, setConfirmed] = useState<boolean | null>(null); // null = loading
  const router = useRouter();

  useEffect(() => {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      setConfirmed(val === "1");
    } catch {
      setConfirmed(true); // If localStorage fails, don't block
    }
  }, []);

  const handleConfirm = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* noop */ }
    setConfirmed(true);
  };

  const handleUnder17 = () => {
    router.push("/age-restricted");
  };

  // Still loading — show nothing (avoids flash)
  if (confirmed === null) {
    return (
      <div style={{ background: "#000000", minHeight: "100vh" }} />
    );
  }

  // Confirmed — show feed
  if (confirmed) {
    return <>{children}</>;
  }

  // Not confirmed — show age gate
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#000000",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          width: "100%",
          textAlign: "center",
        }}
      >
        {/* Wordmark */}
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

        {/* Warning */}
        <div
          style={{
            border: "1px solid #333333",
            padding: "32px 24px",
            marginBottom: "32px",
          }}
        >
          <p
            style={{
              ...MONO,
              color: "#FFFFFF",
              fontSize: "1rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              lineHeight: 1.4,
              marginBottom: "20px",
            }}
          >
            JAWWING IS FOR<br />USERS 17 AND OLDER
          </p>
          <p
            style={{
              color: "#777777",
              fontSize: "0.875rem",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            By continuing, you confirm you are at least 17 years old.
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <button
            onClick={handleConfirm}
            style={{
              ...MONO,
              background: "#FFFFFF",
              color: "#000000",
              border: "none",
              padding: "16px 24px",
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              cursor: "pointer",
              width: "100%",
              transition: "background 150ms",
            }}
          >
            I AM 17 OR OLDER
          </button>
          <button
            onClick={handleUnder17}
            style={{
              ...MONO,
              background: "transparent",
              color: "#555555",
              border: "1px solid #222222",
              padding: "14px 24px",
              fontSize: "0.75rem",
              fontWeight: 400,
              letterSpacing: "0.1em",
              cursor: "pointer",
              width: "100%",
              transition: "color 150ms, border-color 150ms",
            }}
          >
            I AM UNDER 17
          </button>
        </div>
      </div>
    </div>
  );
}
