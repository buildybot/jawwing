"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";

interface InlineComposeProps {
  locationLabel?: string;
  hasLocation?: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onSubmit: (content: string, imageUrl?: string) => Promise<void>;
}

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;
const MAX = 300;

const PROMPTS = [
  "WHAT'S HAPPENING NEARBY?",
  "SPILL THE TEA...",
  "HOT TAKE TIME...",
  "OVERHEARD NEARBY...",
  "PSA FOR THE NEIGHBORHOOD...",
  "WHAT'S THE VIBE RIGHT NOW?",
];

export default function InlineCompose({
  locationLabel,
  hasLocation = true,
  disabled,
  disabledReason,
  onSubmit,
}: InlineComposeProps) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showRateLimitModal, setShowRateLimitModal] = useState(false);
  const [posted, setPosted] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [promptIndex, setPromptIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rotate placeholder prompt every 3s when collapsed
  useEffect(() => {
    if (expanded) return;
    const timer = setInterval(() => {
      setPromptIndex((i) => (i + 1) % PROMPTS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [expanded]);

  // Focus textarea when expanded
  useEffect(() => {
    if (expanded && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [expanded]);

  const handleExpand = () => {
    if (disabled) return;
    setExpanded(true);
  };

  const handleCollapse = () => {
    if (loading || uploading) return;
    setExpanded(false);
    setContent("");
    setError(null);
    removeImage();
  };

  const removeImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Only image files are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5MB.");
      return;
    }
    setImageFile(file);
    setError(null);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || loading || uploading) return;
    if (!hasLocation) {
      setError("ENABLE LOCATION TO POST · JAWWING IS LOCATION-BASED");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      let imageUrl: string | undefined;

      if (imageFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append("file", imageFile);
        const res = await fetch("/api/v1/upload", { method: "POST", body: formData });
        setUploading(false);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error((data as { error?: string }).error ?? "Image upload failed.");
        }
        const data = await res.json() as { url: string };
        imageUrl = data.url;
      }

      await onSubmit(content.trim(), imageUrl);

      // Success: show brief confirmation then collapse
      setPosted(true);
      setContent("");
      removeImage();
      setTimeout(() => {
        setPosted(false);
        setExpanded(false);
      }, 1000);
    } catch (err) {
      const status = (err as { status?: number }).status;
      const code = (err as { code?: string }).code;
      if (status === 429 || code === "RATE_LIMIT" || code === "RATE_LIMITED") {
        setShowRateLimitModal(true);
        setError(null);
      } else {
        setError(err instanceof Error ? err.message : "Failed to post.");
      }
      setUploading(false);
    } finally {
      setLoading(false);
    }
  };

  const isSubmitting = loading || uploading;
  const canSubmit = !!content.trim() && !isSubmitting && !posted && hasLocation;
  const charPct = Math.min((content.length / MAX) * 100, 100);
  const nearLimit = content.length > MAX * 0.9;

  // Collapsed state
  if (!expanded) {
    return (
      <div
        style={{
          padding: "0 0 2px 0",
          borderBottom: "1px solid #1A1A1A",
        }}
      >
        <button
          onClick={handleExpand}
          disabled={disabled}
          title={disabled ? disabledReason : undefined}
          style={{
            display: "block",
            width: "100%",
            background: "#000000",
            border: "1px solid #333333",
            color: disabled ? "#333333" : "#888888",
            cursor: disabled ? "not-allowed" : "text",
            padding: "14px 16px",
            textAlign: "left",
            ...MONO,
            fontSize: "0.6875rem",
            letterSpacing: "0.1em",
            transition: "border-color 150ms, color 150ms",
          }}
          className={disabled ? "" : "hover:border-[#888] hover:text-[#AAA]"}
          aria-label="Write a post"
        >
          <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "0.875rem", opacity: 0.4, flexShrink: 0 }}>✏</span>
            <span
              key={promptIndex}
              style={{
                animation: "fadeInUp 300ms ease",
              }}
            >
              {PROMPTS[promptIndex]}
            </span>
          </span>
        </button>
      </div>
    );
  }

  // Expanded state
  return (
    <div
      style={{
        background: "#000000",
        border: "1px solid #333333",
        borderBottom: "none",
        marginBottom: "2px",
      }}
    >
      <form onSubmit={handleSubmit}>
        {/* Posted confirmation */}
        {posted ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "32px 16px",
              ...MONO,
              fontSize: "0.875rem",
              fontWeight: 700,
              letterSpacing: "0.1em",
              color: "#FFFFFF",
            }}
          >
            POSTED ✓
          </div>
        ) : (
          <>
            {/* Textarea */}
            <div style={{ position: "relative", padding: "14px 16px 0" }}>
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, MAX))}
                placeholder="WHAT'S ON YOUR MIND?"
                rows={4}
                disabled={isSubmitting}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "#FFFFFF",
                  width: "100%",
                  resize: "none",
                  outline: "none",
                  fontSize: "0.9375rem",
                  lineHeight: "1.6",
                  ...MONO,
                  letterSpacing: "0.02em",
                  display: "block",
                }}
                className="placeholder:text-[#333]"
              />
              {/* Progress bar */}
              <div
                style={{
                  height: "1px",
                  width: `${charPct}%`,
                  background: nearLimit ? "#FF3333" : "#333333",
                  transition: "width 100ms linear, background 150ms",
                  marginTop: "8px",
                }}
              />
            </div>

            {/* Image preview */}
            {imagePreview && (
              <div style={{ position: "relative", margin: "8px 16px 0", border: "1px solid #1F1F1F" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Preview"
                  style={{ width: "100%", maxHeight: "160px", objectFit: "cover", display: "block" }}
                />
                <button
                  type="button"
                  onClick={removeImage}
                  disabled={isSubmitting}
                  style={{
                    position: "absolute",
                    top: "6px",
                    right: "6px",
                    background: "#000000",
                    border: "1px solid #333333",
                    color: "#AAAAAA",
                    cursor: "pointer",
                    ...MONO,
                    fontSize: "0.5625rem",
                    letterSpacing: "0.06em",
                    padding: "3px 8px",
                  }}
                >
                  REMOVE
                </button>
              </div>
            )}

            {/* Uploading indicator */}
            {uploading && (
              <p style={{ ...MONO, color: "#888888", fontSize: "0.6875rem", letterSpacing: "0.06em", padding: "6px 16px 0" }}>
                UPLOADING IMAGE...
              </p>
            )}

            {/* Error */}
            {error && (
              <p style={{ ...MONO, color: "#FF3333", fontSize: "0.6875rem", letterSpacing: "0.04em", padding: "6px 16px 0" }}>
                {error}
              </p>
            )}

            {/* Bottom bar */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px 12px",
                borderTop: "1px solid #1A1A1A",
                marginTop: "12px",
              }}
            >
              {/* Left: camera + location */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                {!imagePreview && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      color: "#888888",
                      fontSize: "1rem",
                      padding: 0,
                      lineHeight: 1,
                      display: "flex",
                      alignItems: "center",
                    }}
                    className="hover:text-white transition-colors"
                    title="Attach image"
                    aria-label="Attach image"
                  >
                    📷
                  </button>
                )}
              </div>

              {/* Right: char count + cancel + post */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span
                  style={{
                    ...MONO,
                    color: nearLimit ? "#FF3333" : "#333333",
                    fontSize: "0.625rem",
                    letterSpacing: "0.04em",
                    transition: "color 150ms",
                  }}
                >
                  {content.length}/{MAX}
                </span>
                <button
                  type="button"
                  onClick={handleCollapse}
                  disabled={isSubmitting}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#888888",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    ...MONO,
                    fontSize: "0.6875rem",
                    letterSpacing: "0.06em",
                    padding: 0,
                  }}
                  className="hover:text-white transition-colors"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  disabled={!canSubmit && hasLocation}
                  style={{
                    background: canSubmit ? "#FFFFFF" : "transparent",
                    color: canSubmit ? "#000000" : "#333333",
                    border: `1px solid ${canSubmit ? "#FFFFFF" : "#222222"}`,
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    ...MONO,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    padding: "6px 14px",
                    transition: "all 150ms",
                  }}
                  className={canSubmit ? "hover:bg-[#C0C0C0]" : ""}
                >
                  {uploading ? "UPLOADING..." : loading ? "POSTING..." : "POST"}
                </button>
              </div>
            </div>

            {/* Location indicator */}
            <div
              style={{
                padding: "4px 16px 10px",
                ...MONO,
                fontSize: "0.5625rem",
                letterSpacing: "0.08em",
                color: "#888888",
              }}
            >
              {hasLocation && locationLabel
                ? `📍 POSTING FROM: ${locationLabel.toUpperCase()}`
                : "📍 LOCATION REQUIRED TO POST"}
            </div>
          </>
        )}
      </form>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      {/* Rate Limit → Sign In Modal */}
      {showRateLimitModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
          display: "flex", alignItems: "center", justifyContent: "center",
          zIndex: 9999, padding: "24px",
        }} onClick={() => setShowRateLimitModal(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#0A0A0A", border: "1px solid #333",
            maxWidth: "400px", width: "100%", padding: "32px",
          }}>
            <div style={{
              fontFamily: "var(--font-mono), monospace", color: "#FF3333",
              fontSize: "0.6875rem", letterSpacing: "0.1em", marginBottom: "16px",
            }}>
              RATE LIMIT REACHED
            </div>
            <p style={{ color: "#FFFFFF", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "8px" }}>
              You've hit the posting limit for your connection.
            </p>
            <p style={{ color: "#AAAAAA", fontSize: "0.8125rem", lineHeight: 1.5, marginBottom: "24px" }}>
              On shared networks (universities, offices, public WiFi), multiple people share the same limit. Sign in with your email to get your own posting identity.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <Link href="/signin" style={{
                display: "block", textAlign: "center", textDecoration: "none",
                fontFamily: "var(--font-mono), monospace", fontSize: "0.75rem",
                letterSpacing: "0.08em", fontWeight: 600,
                background: "#FFFFFF", color: "#000000", padding: "12px 20px",
              }}>
                SIGN IN WITH EMAIL
              </Link>
              <button onClick={() => setShowRateLimitModal(false)} style={{
                fontFamily: "var(--font-mono), monospace", fontSize: "0.6875rem",
                letterSpacing: "0.06em", background: "none",
                border: "1px solid #333", color: "#888", padding: "10px 20px",
                cursor: "pointer",
              }}>
                DISMISS
              </button>
            </div>
            <p style={{
              color: "#555", fontSize: "0.6875rem", marginTop: "16px",
              fontFamily: "var(--font-mono), monospace", lineHeight: 1.4,
            }}>
              Email verification required. Your identity stays anonymous in the feed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
