"use client";

import { useState } from "react";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
}

export default function CreatePostModal({ open, onClose }: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const MAX = 500;

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    console.log("New post:", content);
    setContent("");
    onClose();
  };

  return (
    <div
      style={{ background: "rgba(0,0,0,0.85)" }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
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
            style={{ color: "#555555", cursor: "pointer", background: "none", border: "none", fontSize: "1rem" }}
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
            className="placeholder:text-[#555555]"
          />

          <div className="flex items-center justify-between">
            <span
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: content.length > MAX * 0.9 ? "#FF3333" : "#555555",
                fontSize: "0.75rem",
              }}
            >
              {content.length}/{MAX}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                style={{
                  color: "#555555",
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
                disabled={!content.trim()}
                style={{
                  background: content.trim() ? "#FFFFFF" : "transparent",
                  color: content.trim() ? "#000000" : "#555555",
                  border: `1px solid ${content.trim() ? "#FFFFFF" : "#333333"}`,
                  cursor: content.trim() ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-mono), monospace",
                  letterSpacing: "0.06em",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  padding: "6px 16px",
                  transition: "all 150ms",
                }}
              >
                POST
              </button>
            </div>
          </div>
        </form>

        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "#555555",
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
