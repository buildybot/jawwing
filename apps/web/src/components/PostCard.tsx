"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { votePost, isAuthenticated } from "@/lib/api";
import { useToast } from "./Toast";

export interface Post {
  id: string;
  content: string;
  score: number;
  reply_count?: number;
  replyCount?: number; // legacy
  timeAgo?: string;
  distance?: string;
  created_at?: number;
  expires_at?: number;
  territoryName?: string;
}

export interface PostCardProps {
  post: Post;
  onLoginRequired?: () => void;
  /** "card" = standard list layout (default). "fullscreen" = TikTok-style snap layout. */
  variant?: "card" | "fullscreen";
}

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

// ─── URL / media detection ────────────────────────────────────────────────────

const URL_RE = /https?:\/\/[^\s<>"')\]]+/gi;
const IMAGE_RE = /https?:\/\/[^\s<>"')\]]+\.(?:jpg|jpeg|png|gif|webp)(\?[^\s<>"')\]]*)?/gi;

// Video domains — skip OG preview for these, just show plain link
const VIDEO_DOMAIN_RE = /(?:youtube\.com|youtu\.be|tiktok\.com|vimeo\.com|twitch\.tv|dailymotion\.com)/i;

function matchImageUrls(content: string): string[] {
  IMAGE_RE.lastIndex = 0;
  return Array.from(new Set(content.match(IMAGE_RE) || []));
}

/** Returns first non-image, non-video URL for OG preview */
function matchLinkPreviewUrl(content: string): string | null {
  URL_RE.lastIndex = 0;
  IMAGE_RE.lastIndex = 0;
  const all = Array.from(new Set(content.match(URL_RE) || []));
  return (
    all.find((u) => {
      IMAGE_RE.lastIndex = 0;
      return !IMAGE_RE.test(u) && !VIDEO_DOMAIN_RE.test(u);
    }) ?? null
  );
}

// ─── Content renderer (text + clickable links) ───────────────────────────────

function ContentWithLinks({ content, fontSize }: { content: string; fontSize?: string }) {
  const parts: React.ReactNode[] = [];
  const re = new RegExp(URL_RE.source, "gi");
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push(content.slice(last, m.index));
    const url = m[0];
    parts.push(
      <a
        key={m.index}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: "#FFFFFF", textDecoration: "underline" }}
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    );
    last = m.index + url.length;
  }
  if (last < content.length) parts.push(content.slice(last));

  return (
    <p style={{ color: "#FFFFFF", lineHeight: "1.6", fontSize: fontSize ?? "1rem", margin: 0 }}>
      {parts}
    </p>
  );
}

// ─── Image embed ──────────────────────────────────────────────────────────────

function ImageEmbed({ src, fullscreen }: { src: string; fullscreen?: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const maxH = fullscreen ? "50vh" : "300px";

  return (
    <>
      <div
        style={{
          width: "100%",
          maxHeight: maxH,
          overflow: "hidden",
          background: "#0A0A0A",
          marginTop: "10px",
          cursor: "zoom-in",
          border: "1px solid #1F1F1F",
        }}
        onClick={() => setExpanded(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          style={{ width: "100%", height: maxH, objectFit: "cover", display: "block" }}
          loading="lazy"
        />
      </div>
      {expanded && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.95)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
            cursor: "zoom-out",
          }}
          onClick={() => setExpanded(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt=""
            style={{ maxWidth: "100%", maxHeight: "100vh", objectFit: "contain" }}
          />
          <button
            onClick={() => setExpanded(false)}
            style={{
              ...MONO,
              position: "absolute",
              top: "16px",
              right: "16px",
              background: "none",
              border: "1px solid #333",
              color: "#FFFFFF",
              padding: "6px 12px",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            ✕ CLOSE
          </button>
        </div>
      )}
    </>
  );
}

// ─── Link preview (OG) ───────────────────────────────────────────────────────

interface OGData {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  error?: string;
}

function LinkPreview({ url }: { url: string }) {
  const [og, setOg] = useState<OGData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/v1/og?url=${encodeURIComponent(url)}`)
      .then((r) => r.json())
      .then((data: OGData) => { setOg(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [url]);

  if (loading) {
    return (
      <div
        style={{
          background: "#0A0A0A",
          border: "1px solid #1F1F1F",
          height: "64px",
          marginTop: "8px",
          display: "flex",
          alignItems: "center",
          padding: "0 12px",
        }}
      >
        <span style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.08em" }}>
          LOADING PREVIEW...
        </span>
      </div>
    );
  }

  if (!og || og.error || (!og.title && !og.description && !og.image)) {
    return null;
  }

  let hostname = "";
  try { hostname = new URL(url).hostname.toUpperCase(); } catch { /* noop */ }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "block", textDecoration: "none", marginTop: "8px" }}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        style={{
          background: "#0A0A0A",
          border: "1px solid #1F1F1F",
          display: "flex",
          overflow: "hidden",
        }}
      >
        {og.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={og.image}
            alt=""
            style={{ width: "80px", height: "80px", objectFit: "cover", flexShrink: 0 }}
          />
        )}
        <div style={{ padding: "10px 12px", overflow: "hidden", flex: 1 }}>
          {og.title && (
            <p
              style={{
                color: "#FFFFFF",
                fontSize: "0.8125rem",
                fontWeight: 600,
                marginBottom: "4px",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {og.title}
            </p>
          )}
          {og.description && (
            <p
              style={{
                color: "#777777",
                fontSize: "0.75rem",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                marginBottom: "4px",
              } as React.CSSProperties}
            >
              {og.description}
            </p>
          )}
          {hostname && (
            <p style={{ ...MONO, color: "#333333", fontSize: "0.5625rem", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {hostname}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

// ─── Score animation ──────────────────────────────────────────────────────────

function AnimatedScore({ value, voted }: { value: number; voted: "up" | "down" | null }) {
  const [display, setDisplay] = useState(value);
  const [animDir, setAnimDir] = useState<"up" | "down" | null>(null);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      setAnimDir(value > prevRef.current ? "up" : "down");
      setDisplay(value);
      prevRef.current = value;
      const t = setTimeout(() => setAnimDir(null), 300);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span
      style={{
        color: voted === "up" ? "#FFFFFF" : voted === "down" ? "#777777" : "#C0C0C0",
        ...MONO,
        fontSize: "0.875rem",
        fontWeight: 500,
        minWidth: "24px",
        textAlign: "center",
        display: "inline-block",
        transition: "transform 150ms ease, opacity 150ms ease",
        transform: animDir === "up" ? "translateY(-3px)" : animDir === "down" ? "translateY(3px)" : "translateY(0)",
        opacity: animDir ? 0.7 : 1,
      }}
      className="tabular-nums"
    >
      {display}
    </span>
  );
}

// ─── Expiry indicator ─────────────────────────────────────────────────────────

function ExpiryIndicator({ expiresAt }: { expiresAt: number }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const secsLeft = expiresAt - nowSec;
  if (secsLeft <= 0 || secsLeft > 4 * 3600) return null;

  const hoursLeft = Math.floor(secsLeft / 3600);
  const minsLeft = Math.floor((secsLeft % 3600) / 60);
  const label = hoursLeft > 0 ? `${hoursLeft}H LEFT` : `${minsLeft}M LEFT`;

  return (
    <span style={{ ...MONO, fontSize: "0.5625rem", letterSpacing: "0.08em", color: "#777777", border: "1px solid #1F1F1F", padding: "2px 5px" }}>
      {label}
    </span>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

export default function PostCard({ post, onLoginRequired, variant = "card" }: PostCardProps) {
  const replyCount = post.reply_count ?? post.replyCount ?? 0;
  const [score, setScore] = useState(post.score);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [voting, setVoting] = useState(false);
  const [showVotePrompt, setShowVotePrompt] = useState(false);
  const toast = useToast();

  const imageUrls = matchImageUrls(post.content);
  const linkPreviewUrl = matchLinkPreviewUrl(post.content);

  const vote = async (dir: "up" | "down") => {
    if (voting) return;
    if (!isAuthenticated()) {
      setShowVotePrompt(true);
      onLoginRequired?.();
      return;
    }

    let newScore = score;
    let newVoted: "up" | "down" | null;

    if (voted === dir) {
      newScore = score + (dir === "up" ? -1 : 1);
      newVoted = null;
    } else if (voted === null) {
      newScore = score + (dir === "up" ? 1 : -1);
      newVoted = dir;
    } else {
      newScore = score + (dir === "up" ? 2 : -2);
      newVoted = dir;
    }

    setScore(newScore);
    setVoted(newVoted);
    setVoting(true);

    try {
      await votePost(post.id, dir === "up" ? 1 : -1);
    } catch (err) {
      setScore(score);
      setVoted(voted);
      console.error("[vote] failed:", err);
    } finally {
      setVoting(false);
    }
  };

  const handleShare = () => {
    const url = `https://jawwing.com/post/${post.id}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.show("COPIED!", 2000);
    }).catch(() => {
      toast.show("SHARE FAILED", 2000);
    });
  };

  // ── FULLSCREEN variant (TikTok-style snap) ────────────────────────────────
  if (variant === "fullscreen") {
    return (
      <article
        style={{
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Main content area */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-end",
            padding: "16px 60px 28px 16px",
            overflow: "hidden",
          }}
        >
          {/* Territory + distance badges at top */}
          <div
            style={{
              position: "absolute",
              top: "16px",
              left: "16px",
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
            }}
          >
            {post.territoryName && (
              <span
                style={{
                  ...MONO,
                  fontSize: "0.5625rem",
                  letterSpacing: "0.08em",
                  color: "#333333",
                  border: "1px solid #1F1F1F",
                  padding: "2px 6px",
                  textTransform: "uppercase",
                  background: "rgba(0,0,0,0.6)",
                }}
              >
                {post.territoryName}
              </span>
            )}
            {post.distance && (
              <span
                style={{
                  ...MONO,
                  fontSize: "0.5625rem",
                  letterSpacing: "0.08em",
                  color: "#333333",
                  border: "1px solid #1F1F1F",
                  padding: "2px 6px",
                  textTransform: "uppercase",
                  background: "rgba(0,0,0,0.6)",
                }}
              >
                {post.distance}
              </span>
            )}
            {post.expires_at && <ExpiryIndicator expiresAt={post.expires_at} />}
          </div>

          {/* Images */}
          {imageUrls.map((src, i) => (
            <ImageEmbed key={i} src={src} fullscreen />
          ))}

          {/* Content text */}
          <div style={{ marginTop: "12px", marginBottom: "8px" }}>
            <ContentWithLinks content={post.content} fontSize="1.125rem" />
          </div>

          {/* Link preview */}
          {linkPreviewUrl && <LinkPreview url={linkPreviewUrl} />}

          {/* Bottom meta */}
          <div style={{ display: "flex", gap: "12px", marginTop: "12px", alignItems: "center" }}>
            {post.timeAgo && (
              <span style={{ ...MONO, color: "#555555", fontSize: "0.625rem", letterSpacing: "0.06em" }}>
                {post.timeAgo}
              </span>
            )}
            {showVotePrompt && (
              <a
                href="/login"
                style={{ ...MONO, color: "#C0C0C0", fontSize: "0.625rem", letterSpacing: "0.06em", textDecoration: "none" }}
              >
                SIGN UP TO VOTE
              </a>
            )}
          </div>
        </div>

        {/* Right sidebar: actions */}
        <div
          style={{
            position: "absolute",
            right: "12px",
            bottom: "80px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "20px",
          }}
        >
          {/* Vote cluster */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <button
              onClick={() => vote("up")}
              disabled={voting}
              style={{
                color: voted === "up" ? "#FFFFFF" : "#777777",
                background: "none",
                border: "none",
                cursor: voting ? "wait" : "pointer",
                fontSize: "1.25rem",
                lineHeight: 1,
                padding: "4px",
                transition: "color 150ms",
              }}
              aria-label="Upvote"
            >
              ▲
            </button>
            <AnimatedScore value={score} voted={voted} />
            <button
              onClick={() => vote("down")}
              disabled={voting}
              style={{
                color: voted === "down" ? "#C0C0C0" : "#555555",
                background: "none",
                border: "none",
                cursor: voting ? "wait" : "pointer",
                fontSize: "1.25rem",
                lineHeight: 1,
                padding: "4px",
                transition: "color 150ms",
              }}
              aria-label="Downvote"
            >
              ▼
            </button>
          </div>

          {/* Reply */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <Link
              href={`/post/${post.id}`}
              style={{ color: "#777777", textDecoration: "none", fontSize: "1.125rem", lineHeight: 1, display: "block", padding: "4px" }}
              aria-label={`${replyCount} replies`}
            >
              ↩
            </Link>
            <span style={{ ...MONO, color: "#555555", fontSize: "0.625rem" }}>{replyCount}</span>
          </div>

          {/* Share */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <button
              onClick={handleShare}
              style={{ color: "#777777", background: "none", border: "none", cursor: "pointer", fontSize: "1.125rem", lineHeight: 1, padding: "4px", transition: "color 150ms" }}
              aria-label="Share"
            >
              ↗
            </button>
            <span style={{ ...MONO, color: "#555555", fontSize: "0.625rem" }}>SHARE</span>
          </div>
        </div>

        {/* Bottom rule */}
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", background: "#1F1F1F" }} />
      </article>
    );
  }

  // ── CARD variant (default desktop) ────────────────────────────────────────
  return (
    <article
      style={{ background: "#0A0A0A", border: "1px solid #1F1F1F" }}
      className="p-4 transition-colors hover:border-[#333333]"
    >
      <div className="mb-4">
        <ContentWithLinks content={post.content} />
      </div>

      {/* Images */}
      {imageUrls.map((src, i) => (
        <ImageEmbed key={i} src={src} />
      ))}

      {/* Link preview */}
      {linkPreviewUrl && <LinkPreview url={linkPreviewUrl} />}

      {/* Territory badge */}
      {post.territoryName && (
        <div style={{ marginTop: "10px", marginBottom: "4px" }}>
          <span
            style={{
              ...MONO,
              fontSize: "0.625rem",
              letterSpacing: "0.08em",
              color: "#333333",
              border: "1px solid #1F1F1F",
              padding: "2px 6px",
              textTransform: "uppercase",
            }}
          >
            {post.territoryName}
          </span>
        </div>
      )}

      {/* Meta row */}
      <div className="flex items-center justify-between" style={{ marginTop: "12px" }}>
        {/* Voting */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => vote("up")}
            disabled={voting}
            style={{
              color: voted === "up" ? "#FFFFFF" : "#777777",
              transition: "color 150ms, transform 150ms",
              background: "none",
              border: "none",
              cursor: voting ? "wait" : "pointer",
            }}
            className={`text-xs hover:text-white ${voted === "up" ? "scale-[1.15]" : ""}`}
            aria-label="Upvote"
          >
            ▲
          </button>
          <AnimatedScore value={score} voted={voted} />
          <button
            onClick={() => vote("down")}
            disabled={voting}
            style={{
              color: voted === "down" ? "#C0C0C0" : "#777777",
              opacity: voted === "down" ? 1 : 0.6,
              transition: "color 150ms, transform 150ms",
              background: "none",
              border: "none",
              cursor: voting ? "wait" : "pointer",
            }}
            className={`text-xs hover:opacity-100 hover:text-[#C0C0C0] ${voted === "down" ? "scale-[1.15]" : ""}`}
            aria-label="Downvote"
          >
            ▼
          </button>
          {showVotePrompt && (
            <span style={{ ...MONO, fontSize: "0.625rem", letterSpacing: "0.06em", color: "#555555" }}>
              <a
                href="/login"
                style={{ color: "#C0C0C0", textDecoration: "none" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#FFFFFF")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#C0C0C0")}
              >
                SIGN UP TO VOTE
              </a>
            </span>
          )}
        </div>

        {/* Right meta */}
        <div
          style={{ color: "#777777", ...MONO, letterSpacing: "0.02em" }}
          className="flex items-center gap-3 text-xs"
        >
          {post.expires_at && <ExpiryIndicator expiresAt={post.expires_at} />}
          <button
            onClick={handleShare}
            style={{ color: "#777777", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "0.75rem", lineHeight: 1 }}
            className="hover:text-[#C0C0C0] transition-colors"
            aria-label="Share post"
            title="Copy link"
          >
            ↗
          </button>
          <Link
            href={`/post/${post.id}`}
            style={{ color: "#777777", textDecoration: "none" }}
            className="hover:text-[#C0C0C0] transition-colors"
          >
            ↩ {replyCount}
          </Link>
          {post.distance && (
            <>
              <span style={{ color: "#1F1F1F" }}>·</span>
              <span style={{ textTransform: "uppercase" }}>{post.distance}</span>
            </>
          )}
          {post.timeAgo && (
            <>
              <span style={{ color: "#1F1F1F" }}>·</span>
              <span>{post.timeAgo}</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
