"use client";

import { useState, useEffect, useRef } from "react";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

const REPORT_REASONS = [
  { label: "THREATS OR VIOLENCE", value: "threats_or_violence", rule: "P-2" },
  { label: "HATE SPEECH", value: "hate_speech", rule: "P-1" },
  { label: "SPAM", value: "spam", rule: "R-2" },
  { label: "DOXXING / PERSONAL INFO", value: "doxxing", rule: "P-3" },
  { label: "MISLEADING / FALSE INFO", value: "false_info", rule: "R-4" },
  { label: "OTHER", value: "other", rule: null },
] as const;

interface ReportButtonProps {
  postId: string;
  /** If set, this is a comment report on this reply ID */
  replyId?: string;
  size?: "sm" | "md";
}

export default function ReportButton({ postId, replyId, size = "sm" }: ReportButtonProps) {
  const storageKey = replyId ? `jawwing_reported_reply_${replyId}` : `jawwing_reported_post_${postId}`;
  const [reported, setReported] = useState(false);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [otherText, setOtherText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Read localStorage on mount (client only)
  useEffect(() => {
    try {
      setReported(!!localStorage.getItem(storageKey));
    } catch {
      // SSR or private mode — ignore
    }
  }, [storageKey]);

  // Close modal on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSelected(null);
        setOtherText("");
        setError(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setSelected(null);
        setOtherText("");
        setError(null);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open]);

  const handleSubmit = async () => {
    if (!selected || submitting) return;
    const isOther = selected === "other";
    if (isOther && !otherText.trim()) return;

    const reason = isOther
      ? otherText.trim()
      : REPORT_REASONS.find((r) => r.value === selected)?.label ?? selected;

    setSubmitting(true);
    setError(null);

    try {
      const body: Record<string, string> = { post_id: postId, reason };
      if (replyId) body.reply_id = replyId;

      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      try { localStorage.setItem(storageKey, "1"); } catch { /* noop */ }
      setReported(true);
      setOpen(false);
      setSelected(null);
      setOtherText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "FAILED TO SUBMIT REPORT");
    } finally {
      setSubmitting(false);
    }
  };

  const iconSize = size === "sm" ? "0.8rem" : "1rem";
  const labelSize = size === "sm" ? "0.5625rem" : "0.625rem";

  return (
    <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (!reported) setOpen(true);
        }}
        title={reported ? "Already reported" : "Report"}
        aria-label={reported ? "Already reported" : "Report this content"}
        style={{
          background: "none",
          border: "none",
          cursor: reported ? "default" : "pointer",
          color: reported ? "#FF3333" : "#555555",
          fontSize: iconSize,
          lineHeight: 1,
          padding: "2px 4px",
          transition: "color 150ms",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          ...MONO,
        }}
        className={!reported ? "hover:text-[#A0A0A0]" : ""}
      >
        <span>⚑</span>
        {reported && (
          <span style={{ fontSize: labelSize, letterSpacing: "0.06em", color: "#FF3333" }}>
            REPORTED
          </span>
        )}
      </button>

      {/* ── Modal ── */}
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.80)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            ref={modalRef}
            style={{
              background: "#0A0A0A",
              border: "1px solid #1F1F1F",
              width: "100%",
              maxWidth: "380px",
              padding: "20px",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span
                style={{
                  ...MONO,
                  color: "#FFFFFF",
                  fontSize: "0.6875rem",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                }}
              >
                {replyId ? "REPORT COMMENT" : "REPORT POST"}
              </span>
              <button
                onClick={() => {
                  setOpen(false);
                  setSelected(null);
                  setOtherText("");
                  setError(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#555555",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  ...MONO,
                  padding: "2px 6px",
                }}
              >
                ✕
              </button>
            </div>
            <p
              style={{
                ...MONO,
                color: "#333333",
                fontSize: "0.5rem",
                letterSpacing: "0.08em",
                marginBottom: "16px",
              }}
            >
              SELECT A REASON — ALL REPORTS ARE ANONYMOUS
            </p>

            {/* Reason list */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "2px",
                marginBottom: "14px",
              }}
            >
              {REPORT_REASONS.map((r) => {
                const isSelected = selected === r.value;
                return (
                  <button
                    key={r.value}
                    onClick={() => {
                      setSelected(r.value);
                      if (r.value !== "other") setOtherText("");
                    }}
                    style={{
                      background: isSelected ? "#1A1A1A" : "transparent",
                      border: `1px solid ${isSelected ? "#333333" : "#1F1F1F"}`,
                      color: isSelected ? "#FFFFFF" : "#777777",
                      ...MONO,
                      fontSize: "0.5875rem",
                      letterSpacing: "0.08em",
                      fontWeight: isSelected ? 700 : 400,
                      padding: "10px 12px",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      transition: "all 100ms",
                      width: "100%",
                    }}
                  >
                    <span>{r.label}</span>
                    {r.rule && (
                      <span
                        style={{
                          color: isSelected ? "#555555" : "#2A2A2A",
                          fontSize: "0.5rem",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {r.rule}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Other text input */}
            {selected === "other" && (
              <textarea
                value={otherText}
                onChange={(e) => setOtherText(e.target.value.slice(0, 200))}
                placeholder="Describe the issue..."
                rows={3}
                autoFocus
                style={{
                  width: "100%",
                  background: "#000000",
                  border: "1px solid #1F1F1F",
                  color: "#FFFFFF",
                  fontSize: "0.875rem",
                  padding: "8px 10px",
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                  marginBottom: "12px",
                  display: "block",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#333333")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#1F1F1F")}
                className="placeholder:text-[#333333]"
              />
            )}

            {/* Error */}
            {error && (
              <p
                style={{
                  ...MONO,
                  color: "#FF3333",
                  fontSize: "0.5625rem",
                  letterSpacing: "0.04em",
                  marginBottom: "10px",
                }}
              >
                {error.toUpperCase()}
              </p>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                onClick={handleSubmit}
                disabled={
                  !selected ||
                  submitting ||
                  (selected === "other" && !otherText.trim())
                }
                style={{
                  flex: 1,
                  ...MONO,
                  background:
                    selected && !submitting ? "#FFFFFF" : "transparent",
                  color:
                    selected && !submitting ? "#000000" : "#555555",
                  border: `1px solid ${
                    selected && !submitting ? "#FFFFFF" : "#333333"
                  }`,
                  padding: "10px",
                  fontSize: "0.625rem",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  cursor:
                    selected && !submitting ? "pointer" : "not-allowed",
                  transition: "all 150ms",
                }}
              >
                {submitting ? "..." : "SUBMIT REPORT"}
              </button>
              <button
                onClick={() => {
                  setOpen(false);
                  setSelected(null);
                  setOtherText("");
                  setError(null);
                }}
                style={{
                  ...MONO,
                  background: "none",
                  border: "1px solid #1F1F1F",
                  color: "#555555",
                  padding: "10px 14px",
                  fontSize: "0.625rem",
                  letterSpacing: "0.1em",
                  cursor: "pointer",
                  transition: "all 150ms",
                  whiteSpace: "nowrap",
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
