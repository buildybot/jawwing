"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendCode, verifyCode } from "@/lib/api";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendCode(phone.trim());
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
      await verifyCode(phone.trim(), code.trim());
      router.push("/feed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setLoading(false);
    }
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

        {step === "phone" ? (
          <form onSubmit={handleSendCode}>
            <label
              style={{
                ...MONO,
                display: "block",
                fontSize: "0.625rem",
                letterSpacing: "0.1em",
                color: "#555555",
                marginBottom: "8px",
              }}
            >
              PHONE NUMBER
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 000 0000"
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
              <p
                style={{
                  ...MONO,
                  color: "#FF3333",
                  fontSize: "0.75rem",
                  marginTop: "8px",
                  letterSpacing: "0.02em",
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                marginTop: "16px",
                background: phone.trim() && !loading ? "#FFFFFF" : "transparent",
                color: phone.trim() && !loading ? "#000000" : "#555555",
                border: `1px solid ${phone.trim() && !loading ? "#FFFFFF" : "#333333"}`,
                borderRadius: 0,
                padding: "12px",
                fontSize: "0.8125rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                cursor: phone.trim() && !loading ? "pointer" : "not-allowed",
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
              ANONYMOUS · NO PASSWORD · SMS ONLY
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerify}>
            <p
              style={{
                ...MONO,
                color: "#555555",
                fontSize: "0.75rem",
                letterSpacing: "0.04em",
                marginBottom: "24px",
              }}
            >
              CODE SENT TO {phone}
            </p>

            <label
              style={{
                ...MONO,
                display: "block",
                fontSize: "0.625rem",
                letterSpacing: "0.1em",
                color: "#555555",
                marginBottom: "8px",
              }}
            >
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
              <p
                style={{
                  ...MONO,
                  color: "#FF3333",
                  fontSize: "0.75rem",
                  marginTop: "8px",
                  letterSpacing: "0.02em",
                }}
              >
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
                color: code.length === 6 && !loading ? "#000000" : "#555555",
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
              onClick={() => { setStep("phone"); setCode(""); setError(null); }}
              style={{
                ...MONO,
                display: "block",
                width: "100%",
                marginTop: "8px",
                background: "transparent",
                color: "#555555",
                border: "none",
                padding: "8px",
                fontSize: "0.75rem",
                letterSpacing: "0.06em",
                cursor: "pointer",
              }}
            >
              ← CHANGE NUMBER
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
