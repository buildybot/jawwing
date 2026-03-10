"use client";

import { useState, useRef } from "react";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (content: string, imageUrl?: string) => Promise<void>;
}

export default function CreatePostModal({ open, onClose, onSubmit }: CreatePostModalProps) {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const MAX = 300;

  if (!open) return null;

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

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (loading || uploading) return;
    removeImage();
    setContent("");
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setError(null);
    setLoading(true);

    try {
      let imageUrl: string | undefined;

      // Upload image first if present
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

      if (onSubmit) {
        await onSubmit(content.trim(), imageUrl);
      }

      setContent("");
      removeImage();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post.");
      setUploading(false);
    } finally {
      setLoading(false);
    }
  };

  const isSubmitting = loading || uploading;
  const canSubmit = !!content.trim() && !isSubmitting;

  return (
    <div
      style={{ background: "rgba(0,0,0,0.85)" }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget && !isSubmitting) handleClose(); }}
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
            onClick={handleClose}
            disabled={isSubmitting}
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
            disabled={isSubmitting}
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

          {/* Image preview */}
          {imagePreview && (
            <div style={{ position: "relative", marginBottom: "12px", border: "1px solid #1F1F1F" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imagePreview}
                alt="Preview"
                style={{
                  width: "100%",
                  maxHeight: "180px",
                  objectFit: "cover",
                  display: "block",
                  borderRadius: 0,
                }}
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
                  color: "#777777",
                  cursor: "pointer",
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: "0.625rem",
                  letterSpacing: "0.06em",
                  padding: "3px 8px",
                }}
                className="hover:text-white hover:border-white transition-colors"
              >
                REMOVE
              </button>
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <p
              style={{
                fontFamily: "var(--font-mono), monospace",
                color: "#777777",
                fontSize: "0.75rem",
                marginBottom: "8px",
                letterSpacing: "0.04em",
              }}
            >
              UPLOADING IMAGE...
            </p>
          )}

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
            <div className="flex items-center gap-3">
              <span
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  color: content.length > MAX * 0.9 ? "#FF3333" : "#777777",
                  fontSize: "0.75rem",
                }}
              >
                {content.length}/{MAX}
              </span>

              {/* Image attach button */}
              {!imagePreview && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isSubmitting}
                  style={{
                    color: "#777777",
                    background: "none",
                    border: "none",
                    cursor: isSubmitting ? "not-allowed" : "pointer",
                    fontFamily: "var(--font-mono), monospace",
                    letterSpacing: "0.04em",
                    fontSize: "0.75rem",
                    padding: 0,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                  }}
                  className="hover:text-white transition-colors"
                  title="Attach image"
                >
                  📷
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
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
                disabled={!canSubmit}
                style={{
                  background: canSubmit ? "#FFFFFF" : "transparent",
                  color: canSubmit ? "#000000" : "#777777",
                  border: `1px solid ${canSubmit ? "#FFFFFF" : "#333333"}`,
                  cursor: canSubmit ? "pointer" : "not-allowed",
                  fontFamily: "var(--font-mono), monospace",
                  letterSpacing: "0.06em",
                  fontSize: "0.8125rem",
                  fontWeight: 500,
                  padding: "6px 16px",
                  transition: "all 150ms",
                }}
              >
                {uploading ? "UPLOADING..." : loading ? "POSTING..." : "POST"}
              </button>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            style={{ display: "none" }}
          />
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
