"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { sendCode, verifyCode } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, isLoading, login, logout, user } = useAuth();

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirect") ?? "/";

  // If already logged in, redirect immediately
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendCode(email.trim());
      setStep("code");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code.");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await verifyCode(email.trim(), code.trim());
      login(result.token, {
        id: result.user.id,
        displayName: result.user.display_name ?? result.user.id,
        type: result.user.type ?? "human",
      });
      router.replace(redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setLoading(false);
    }
  }

  // Show "already logged in" state
  if (!isLoading && isAuthenticated && user) {
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
        <div style={{ width: "100%", maxWidth: "360px", textAlign: "center" }}>
          <div style={{ marginBottom: "48px" }}>
            <span style={{ ...MONO, fontSize: "1.25rem", fontWeight: 700, letterSpacing: "0.18em", color: "#FFFFFF" }}>
              JAWWING
            </span>
          </div>
          <p style={{ ...MONO, color: "#777777", fontSize: "0.75rem", letterSpacing: "0.08em", marginBottom: "8px" }}>
            SIGNED IN AS
          </p>
          <p style={{ ...MONO, color: "#FFFFFF", fontSize: "1rem", letterSpacing: "0.06em", marginBottom: "32px" }}>
            {user.displayName.toUpperCase()}
          </p>
          <button
            onClick={() => router.push("/")}
            style={{
              ...MONO,
              display: "block",
              width: "100%",
              background: "#FFFFFF",
              color: "#000000",
              border: "1px solid #FFFFFF",
              borderRadius: 0,
              padding: "12px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              cursor: "pointer",
              marginBottom: "12px",
            }}
          >
            GO TO FEED
          </button>
          <button
            onClick={logout}
            style={{
              ...MONO,
              display: "block",
              width: "100%",
              background: "transparent",
              color: "#777777",
              border: "1px solid #333333",
              borderRadius: 0,
              padding: "12px",
              fontSize: "0.8125rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            SIGN OUT
          </button>
        </div>
      </div>
    );
  }

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
      <div style={{ width: "100%", maxWidth: "360px" }}>
        {/* Wordmark */}
        <div style={{ textAlign: "center", marginBottom: "48px" }}>
          <span
            style={{
              ...MONO,
              fontSize: "1.25rem",
              fontWeight: 700,
              letterSpacing: "0.18em",
              color: "#FFFFFF",
            }}
          >
            JAWWING
          </span>
        </div>

        {step === "email" ? (
          <form onSubmit={handleSendCode}>
            <label
              style={{
                ...MONO,
                display: "block",
                fontSize: "0.625rem",
                letterSpacing: "0.1em",
                color: "#777777",
                marginBottom: "8px",
              }}
            >
              EMAIL ADDRESS
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoFocus
              required
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                background: "#0A0A0A",
                border: "1px solid #1F1F1F",
                borderRadius: 0,
                color: "#FFFFFF",
                fontSize: "1rem",
                padding: "12px 14px",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#333333")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#1F1F1F")}
            />

            {error && (
              <p style={{ ...MONO, color: "#FF3333", fontSize: "0.75rem", marginTop: "8px", letterSpacing: "0.02em" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email.trim()}
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                marginTop: "16px",
                background: email.trim() && !loading ? "#FFFFFF" : "transparent",
                color: email.trim() && !loading ? "#000000" : "#777777",
                border: `1px solid ${email.trim() && !loading ? "#FFFFFF" : "#333333"}`,
                borderRadius: 0,
                padding: "12px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                cursor: email.trim() && !loading ? "pointer" : "not-allowed",
                transition: "all 150ms",
              }}
            >
              {loading ? "SENDING..." : "SEND CODE"}
            </button>

            <p
              style={{
                ...MONO,
                color: "#333333",
                fontSize: "0.625rem",
                letterSpacing: "0.04em",
                textAlign: "center",
                marginTop: "24px",
              }}
            >
              ANONYMOUS · NO PASSWORD · EMAIL ONLY
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <p style={{ ...MONO, color: "#777777", fontSize: "0.75rem", letterSpacing: "0.04em", marginBottom: "24px" }}>
              CODE SENT TO {email}
            </p>

            <label style={{ ...MONO, display: "block", fontSize: "0.625rem", letterSpacing: "0.1em", color: "#777777", marginBottom: "8px" }}>
              6-DIGIT CODE
            </label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              autoFocus
              required
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                background: "#0A0A0A",
                border: "1px solid #1F1F1F",
                borderRadius: 0,
                color: "#FFFFFF",
                fontSize: "2rem",
                letterSpacing: "0.3em",
                padding: "12px 14px",
                outline: "none",
                boxSizing: "border-box",
                textAlign: "center",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "#333333")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#1F1F1F")}
            />

            {error && (
              <p style={{ ...MONO, color: "#FF3333", fontSize: "0.75rem", marginTop: "8px", letterSpacing: "0.02em" }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                marginTop: "16px",
                background: code.length === 6 && !loading ? "#FFFFFF" : "transparent",
                color: code.length === 6 && !loading ? "#000000" : "#777777",
                border: `1px solid ${code.length === 6 && !loading ? "#FFFFFF" : "#333333"}`,
                borderRadius: 0,
                padding: "12px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                cursor: code.length === 6 && !loading ? "pointer" : "not-allowed",
                transition: "all 150ms",
              }}
            >
              {loading ? "VERIFYING..." : "VERIFY"}
            </button>

            <button
              type="button"
              onClick={() => { setStep("email"); setCode(""); setError(null); }}
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                marginTop: "8px",
                background: "transparent",
                color: "#777777",
                border: "none",
                padding: "8px",
                fontSize: "0.75rem",
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              ← CHANGE EMAIL
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ background: "#000000", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontFamily: "monospace", color: "#333333", fontSize: "0.75rem", letterSpacing: "0.1em" }}>
          LOADING...
        </span>
      </div>
    }>
      <LoginPageInner />
    </Suspense>
  );
}
