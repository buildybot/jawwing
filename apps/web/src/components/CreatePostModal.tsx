"use client";

import { useState } from "react";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (content: string) => Promise<void>;
}

export default function CreatePostModal({ open, onClose, onSubmit }: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const MAX = 300;

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);
    setLoading(true);
    try {
      if (onSubmit) {
        await onSubmit(content.trim());
      }
      setContent("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ background: "rgba(0,0,0,0.85)" }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div
        style={{
          background: "#000000",
          border: "1px solid #1F1F1F",
          width: "100%",
          maxWidth: "480px",
        }}
        className="relative z-10 p-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
              letterSpacing: "0.08em",
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#FFFFFF",
            }}
          >
            NEW POST
          </span>
          <button
            onClick={onClose}
            disabled={loading}
            style={{ color: "#777777", cursor: "pointer", background: "none", border: "none", fontSize: "1rem" }}
            className="hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value.slice(0, MAX))}
            placeholder="What's happening around you?"
            rows={6}
            autoFocus
            disabled={loading}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: "1px solid #1F1F1F",
              color: "#FFFFFF",
              width: "100%",
              resize: "none",
              outline: "none",
              fontSize: "1rem",
              lineHeight: "1.6",
              paddingBottom: "12px",
              marginBottom: "12px",
            }}
            className="placeholder:text-[#777777]"
          />

          {error && (
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "#FF3333",
                fontSize: "0.75rem",
                marginBottom: "8px",
                letterSpacing: "0.02em",
              }}
            >
              {error}
            </p>
          )}

          <div className="flex items-center justify-between">
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: content.length > MAX * 0.9 ? "#FF3333" : "#777777",
                fontSize: "0.75rem",
              }}
            >
              {content.length}/{MAX}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  color: "#777777",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono), monospace",
                  letterSpacing: "0.04em",
                  fontSize: "0.8125rem",
                }}
                className="hover:text-white transition-colors"
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!content.trim() || loading}
                style={{
                  background: content.trim() && !loading ? "#FFFFFF" : "transparent",
                  color: content.trim() && !loading ? "#000000" : "#777777",
                  border: `1px solid ${content.trim() && !loading ? "#FFFFFF" : "#333333"}`,
                  cursor: content.trim() && !loading ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-mono), monospace",
                  letterSpacing: "0.06em",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  padding: "6px 16px",
                  transition: "all 150ms",
                }}
              >
                {loading ? "POSTING..." : "POST"}
              </button>
            </div>
          </div>
        </form>

        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "#777777",
            fontSize: "0.6875rem",
            letterSpacing: "0.02em",
            marginTop: "16px",
            borderTop: "1px solid #1F1F1F",
            paddingTop: "12px",
          }}
        >
          ANONYMOUS · LOCATION RADIUS ONLY
        </p>
      </div>
    </div>
  );
}
