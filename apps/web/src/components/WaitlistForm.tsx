"use client";

import { useState } from "react";

export default function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("loading");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setStatus("success");
        setMessage("YOU'RE ON THE LIST");
        setEmail("");
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed");
      }
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong. Try again.");
    }
  };

  if (status === "success") {
    return (
      <div
        style={{
          fontFamily: "var(--font-mono), monospace",
          color: "#FFFFFF",
          letterSpacing: "0.08em",
          fontSize: "0.8125rem",
          fontWeight: 700,
          border: "1px solid #333333",
          padding: "12px 20px",
        }}
      >
        ✓ {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-0 w-full max-w-md">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        style={{
          flex: 1,
          background: "#000000",
          border: "1px solid #333333",
          borderRight: "none",
          color: "#FFFFFF",
          padding: "12px 16px",
          outline: "none",
          fontSize: "0.875rem",
          fontFamily: "var(--font-mono), monospace",
        }}
        className="placeholder:text-[#777777] focus:border-white transition-colors sm:border-r-0"
        onFocus={(e) => e.target.style.borderColor = "#FFFFFF"}
        onBlur={(e) => e.target.style.borderColor = "#333333"}
      />
      <button
        type="submit"
        disabled={status === "loading"}
        style={{
          background: "#FFFFFF",
          color: "#000000",
          border: "1px solid #FFFFFF",
          padding: "12px 24px",
          fontFamily: "var(--font-mono), monospace",
          letterSpacing: "0.06em",
          fontSize: "0.8125rem",
          fontWeight: 500,
          cursor: status === "loading" ? "wait" : "pointer",
          opacity: status === "loading" ? 0.6 : 1,
          whiteSpace: "nowrap",
          transition: "opacity 150ms",
        }}
      >
        {status === "loading" ? "JOINING..." : "JOIN WAITLIST"}
      </button>
      {status === "error" && (
        <p
          style={{
            color: "#FF3333",
            fontFamily: "var(--font-mono), monospace",
            fontSize: "0.75rem",
            marginTop: "8px",
          }}
        >
          {message}
        </p>
      )}
    </form>
  );
}
