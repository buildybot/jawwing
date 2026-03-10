"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Consent checkboxes
  const [termsChecked, setTermsChecked] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [constitutionChecked, setConstitutionChecked] = useState(false);
  const allConsented = termsChecked && privacyChecked && constitutionChecked;

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send code");
      } else {
        setStep("code");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!allConsented) {
      setError("You must agree to all three documents to continue.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Verification failed");
      } else {
        router.push("/my-posts");
      }
    } catch {
      setError("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const checkboxStyle = (checked: boolean): React.CSSProperties => ({
    width: 16,
    height: 16,
    border: `1px solid ${checked ? "#fff" : "#444"}`,
    background: checked ? "#fff" : "#000",
    cursor: "pointer",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 0,
  });

  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
      }}
    >
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Header */}
        <Link
          href="/"
          style={{
            ...MONO,
            color: "#333",
            fontSize: "0.75rem",
            letterSpacing: "0.14em",
            textDecoration: "none",
            display: "block",
            marginBottom: 40,
          }}
        >
          ← JAWWING
        </Link>

        <h1
          style={{
            ...MONO,
            color: "#fff",
            fontSize: "1rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            marginBottom: 8,
          }}
        >
          OPTIONAL SIGN IN
        </h1>
        <p
          style={{
            ...MONO,
            color: "#666",
            fontSize: "0.6875rem",
            letterSpacing: "0.04em",
            lineHeight: 1.6,
            marginBottom: 8,
          }}
        >
          Sign in to get notifications and see your post history.
        </p>
        <p
          style={{
            ...MONO,
            color: "#444",
            fontSize: "0.625rem",
            letterSpacing: "0.04em",
            lineHeight: 1.6,
            marginBottom: 40,
            borderLeft: "1px solid #222",
            paddingLeft: 12,
          }}
        >
          You stay completely anonymous. Your email is encrypted and never shown
          to anyone, including us.
        </p>

        {/* Step: email */}
        {step === "email" && (
          <form onSubmit={handleSendCode}>
            <label
              style={{
                ...MONO,
                display: "block",
                color: "#555",
                fontSize: "0.5625rem",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                background: "#000",
                border: "1px solid #333",
                color: "#fff",
                padding: "10px 12px",
                fontSize: "0.875rem",
                letterSpacing: "0.04em",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 16,
              }}
            />
            {error && (
              <p style={{ ...MONO, color: "#f44", fontSize: "0.625rem", marginBottom: 12 }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                background: loading ? "#111" : "#fff",
                color: loading ? "#555" : "#000",
                border: "1px solid #fff",
                padding: "10px 20px",
                fontSize: "0.6875rem",
                letterSpacing: "0.1em",
                cursor: loading ? "default" : "pointer",
                fontWeight: 700,
              }}
            >
              {loading ? "SENDING..." : "SEND CODE"}
            </button>
          </form>
        )}

        {/* Step: code */}
        {step === "code" && (
          <form onSubmit={handleVerify}>
            <p style={{ ...MONO, color: "#555", fontSize: "0.625rem", marginBottom: 20 }}>
              Check your email for a 6-digit code.
            </p>
            <label
              style={{
                ...MONO,
                display: "block",
                color: "#555",
                fontSize: "0.5625rem",
                letterSpacing: "0.1em",
                marginBottom: 8,
              }}
            >
              CODE
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              placeholder="000000"
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                background: "#000",
                border: "1px solid #333",
                color: "#fff",
                padding: "10px 12px",
                fontSize: "1.5rem",
                letterSpacing: "0.3em",
                outline: "none",
                boxSizing: "border-box",
                marginBottom: 24,
              }}
            />

            {/* Three-checkbox consent */}
            <div style={{ borderTop: "1px solid #1F1F1F", paddingTop: 20, marginBottom: 20 }}>
              <p style={{ ...MONO, color: "#555", fontSize: "0.5625rem", letterSpacing: "0.1em", marginBottom: 16 }}>
                AGREEMENTS REQUIRED
              </p>

              {/* Terms */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14, cursor: "pointer" }}>
                <div
                  style={checkboxStyle(termsChecked)}
                  onClick={() => setTermsChecked(v => !v)}
                >
                  {termsChecked && <span style={{ color: "#000", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ ...MONO, fontSize: "0.5625rem", color: "#888", letterSpacing: "0.06em", lineHeight: 1.6 }}>
                  I HAVE READ AND AGREE TO THE{" "}
                  <Link href="/terms" target="_blank" style={{ color: "#fff", textDecorationLine: "underline" }}>
                    TERMS OF SERVICE
                  </Link>
                </span>
              </label>

              {/* Privacy */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14, cursor: "pointer" }}>
                <div
                  style={checkboxStyle(privacyChecked)}
                  onClick={() => setPrivacyChecked(v => !v)}
                >
                  {privacyChecked && <span style={{ color: "#000", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ ...MONO, fontSize: "0.5625rem", color: "#888", letterSpacing: "0.06em", lineHeight: 1.6 }}>
                  I HAVE READ AND AGREE TO THE{" "}
                  <Link href="/privacy" target="_blank" style={{ color: "#fff", textDecorationLine: "underline" }}>
                    PRIVACY POLICY
                  </Link>
                </span>
              </label>

              {/* Constitution */}
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 0, cursor: "pointer" }}>
                <div
                  style={checkboxStyle(constitutionChecked)}
                  onClick={() => setConstitutionChecked(v => !v)}
                >
                  {constitutionChecked && <span style={{ color: "#000", fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ ...MONO, fontSize: "0.5625rem", color: "#888", letterSpacing: "0.06em", lineHeight: 1.6 }}>
                  I HAVE READ AND AGREE TO THE{" "}
                  <Link href="/constitution" target="_blank" style={{ color: "#fff", textDecorationLine: "underline" }}>
                    CONSTITUTION
                  </Link>
                </span>
              </label>
            </div>

            {error && (
              <p style={{ ...MONO, color: "#f44", fontSize: "0.625rem", marginBottom: 12 }}>
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || !allConsented}
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                background: (loading || !allConsented) ? "#111" : "#fff",
                color: (loading || !allConsented) ? "#555" : "#000",
                border: `1px solid ${allConsented ? "#fff" : "#333"}`,
                padding: "10px 20px",
                fontSize: "0.6875rem",
                letterSpacing: "0.1em",
                cursor: (loading || !allConsented) ? "default" : "pointer",
                fontWeight: 700,
                marginBottom: 12,
              }}
            >
              {loading ? "VERIFYING..." : "VERIFY"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("email"); setError(""); setCode(""); }}
              style={{
                ...MONO,
                background: "none",
                border: "none",
                color: "#333",
                fontSize: "0.5625rem",
                letterSpacing: "0.08em",
                cursor: "pointer",
                padding: 0,
              }}
            >
              ← USE DIFFERENT EMAIL
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
