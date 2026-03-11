"use client";

import { memo, useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { votePost } from "@/lib/api";
import { useToast } from "./Toast";
import ReportButton from "./ReportButton";
import { useBlockedUsers } from "@/hooks/useBlockedUsers";

export interface Post {
  id: string;
  content: string;
  score: number;
  upvotes?: number;
  downvotes?: number;
  reply_count?: number;
  replyCount?: number; // legacy
  timeAgo?: string;
  distance?: string;
  created_at?: number;
  expires_at?: number;
  territoryName?: string;
  user_id?: string;
  author_id?: string;
  metro?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  video_thumbnail?: string | null;
  mod_confidence?: number | null;
}

export interface PostCardProps {
  post: Post;
  /** "card" = standard list layout (default). "fullscreen" = TikTok-style snap layout. */
  variant?: "card" | "fullscreen";
  feedScope?: string;
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

// ─── URL shortener ────────────────────────────────────────────────────────────

function shortenUrl(url: string): string {
  let s = url.replace(/^https?:\/\//, "").replace(/^www\./, "");
  if (s.length > 35) s = s.slice(0, 32) + "...";
  return s;
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
        {shortenUrl(url)}
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
  const maxH = fullscreen ? "70vh" : "500px";

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
          display: "flex",
          justifyContent: "center",
        }}
        onClick={() => setExpanded(true)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          style={{
            width: "100%",
            maxHeight: maxH,
            objectFit: "contain",
            objectPosition: "center",
            display: "block",
          }}
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
                color: "#AAAAAA",
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

// ─── Video preview ───────────────────────────────────────────────────────────

function VideoPreview({ videoUrl, thumbnail }: { videoUrl: string; thumbnail: string | null | undefined }) {
  if (!thumbnail) {
    // No thumbnail: show plain link
    return (
      <a
        href={videoUrl}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "block",
          marginTop: "10px",
          padding: "10px 12px",
          background: "#000000",
          border: "1px solid #1F1F1F",
          color: "#FFFFFF",
          textDecoration: "none",
          fontFamily: "var(--font-mono), monospace",
          fontSize: "0.75rem",
          letterSpacing: "0.04em",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        WATCH VIDEO
      </a>
    );
  }

  return (
    <a
      href={videoUrl}
      target="_blank"
      rel="noopener noreferrer"
      style={{ display: "block", marginTop: "10px", textDecoration: "none", position: "relative" }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 16:9 aspect ratio container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingTop: "56.25%",
          background: "#000000",
          border: "1px solid #1F1F1F",
          overflow: "hidden",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnail}
          alt="Video preview"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
          loading="lazy"
        />
        {/* Play button overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.3)",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "2px solid #FFFFFF",
            }}
          >
            {/* Triangle play icon */}
            <div
              style={{
                width: 0,
                height: 0,
                borderTop: "11px solid transparent",
                borderBottom: "11px solid transparent",
                borderLeft: "18px solid #FFFFFF",
                marginLeft: "4px",
              }}
            />
          </div>
        </div>
      </div>
    </a>
  );
}

// ─── Mod Badge ───────────────────────────────────────────────────────────────

interface ModDetail {
  action?: string;
  reasoning?: string;
  rule_cited?: string | null;
  confidence?: number | null;
  agent_id?: string;
  created_at?: number;
  status?: string;
}

function ModBadge({ postId, modConfidence }: { postId: string; modConfidence: number | null | undefined }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<ModDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Determine badge type
  const isFailedReview =
    modConfidence === 0;

  let icon: string;
  let color: string;
  let label: string;

  if (modConfidence == null) {
    // Active posts with no confidence = admin-seeded or bypassed moderation
    icon = "✓";
    color = "#22C55E";
    label = "APPROVED";
  } else if (isFailedReview) {
    icon = "⚠";
    color = "#EAB308";
    label = "REVIEW FAILED";
  } else if (modConfidence >= 0.7) {
    icon = "✓";
    color = "#22C55E";
    label = "APPROVED";
  } else if (modConfidence > 0) {
    icon = "⚠";
    color = "#EAB308";
    label = "LOW CONF";
  } else {
    icon = "✗";
    color = "#EF4444";
    label = "FLAGGED";
  }

  const fetchDetail = useCallback(async () => {
    if (detail || loading || modConfidence == null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/posts/${postId}/mod`);
      const data: ModDetail = await res.json();
      // Check if failed review
      if (data.action === "flag" && data.reasoning && data.reasoning.includes("AI review failed")) {
        setDetail({ ...data, action: "failed" });
      } else {
        setDetail(data);
      }
    } catch {
      setDetail({ status: "error" });
    } finally {
      setLoading(false);
    }
  }, [postId, detail, loading, modConfidence]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (modConfidence == null) {
      setOpen((o) => !o);
      return;
    }
    setOpen((o) => {
      if (!o) fetchDetail();
      return !o;
    });
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const actionLabel = detail?.action
    ? detail.action === "failed" ? "REVIEW FAILED"
    : detail.action === "approve" ? "APPROVED"
    : detail.action === "flag" ? "FLAGGED"
    : detail.action === "remove" ? "REMOVED"
    : detail.action === "warn" ? "WARNED"
    : detail.action.toUpperCase()
    : null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onClick={handleClick}
        title={modConfidence == null ? "AWAITING AI REVIEW" : `AI MODERATED — ${label}`}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: "2px 4px",
          display: "inline-flex",
          alignItems: "center",
          gap: "3px",
          ...MONO,
          fontSize: "0.5625rem",
          letterSpacing: "0.08em",
          color,
        }}
      >
        <span>{icon}</span>
        <span>{label}</span>
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            zIndex: 100,
            background: "#0A0A0A",
            border: "1px solid #333",
            padding: "12px 14px",
            minWidth: "220px",
            maxWidth: "280px",
            ...MONO,
          }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
        >
          {modConfidence == null ? (
            <>
              <p style={{ color: "#22C55E", fontSize: "0.625rem", letterSpacing: "0.1em", marginBottom: "6px" }}>✓ APPROVED</p>
              <p style={{ color: "#555", fontSize: "0.5625rem", letterSpacing: "0.06em", lineHeight: 1.5 }}>
                THIS POST WAS APPROVED.
              </p>
            </>
          ) : (
            <>
              <p style={{ color: "#AAAAAA", fontSize: "0.625rem", letterSpacing: "0.12em", marginBottom: "8px", borderBottom: "1px solid #222", paddingBottom: "6px" }}>
                AI REVIEWED
              </p>
              {loading && (
                <p style={{ color: "#555", fontSize: "0.5625rem", letterSpacing: "0.06em" }}>LOADING...</p>
              )}
              {!loading && detail && detail.status !== "error" && (
                <>
                  {actionLabel && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ color: "#888888", fontSize: "0.5625rem", letterSpacing: "0.08em" }}>ACTION</span>
                      <span style={{ color: detail?.action === "failed" ? "#EAB308" : detail?.action === "approve" ? "#22C55E" : "#EF4444", fontSize: "0.5625rem", letterSpacing: "0.08em" }}>{actionLabel}</span>
                    </div>
                  )}
                  {modConfidence != null && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ color: "#888888", fontSize: "0.5625rem", letterSpacing: "0.08em" }}>CONFIDENCE</span>
                      <span style={{ color: "#AAAAAA", fontSize: "0.5625rem", letterSpacing: "0.08em" }}>{Math.round(modConfidence * 100)}%</span>
                    </div>
                  )}
                  {detail.rule_cited && (
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ color: "#888888", fontSize: "0.5625rem", letterSpacing: "0.08em" }}>RULE</span>
                      <span style={{ color: "#AAAAAA", fontSize: "0.5625rem", letterSpacing: "0.08em" }}>{detail.rule_cited}</span>
                    </div>
                  )}
                  {detail.reasoning && (
                    <p style={{ color: "#777777", fontSize: "0.5rem", letterSpacing: "0.04em", lineHeight: 1.5, marginTop: "6px", borderTop: "1px solid #1F1F1F", paddingTop: "6px" }}>
                      {detail.reasoning}
                    </p>
                  )}
                </>
              )}
              {!loading && (!detail || detail.status === "error") && (
                <p style={{ color: "#555", fontSize: "0.5625rem", letterSpacing: "0.06em" }}>UNABLE TO LOAD DETAILS</p>
              )}
              <p style={{ color: "#333", fontSize: "0.4375rem", letterSpacing: "0.06em", lineHeight: 1.5, marginTop: "8px", borderTop: "1px solid #1F1F1F", paddingTop: "6px" }}>
                THIS POST WAS REVIEWED BY AN AI AGENT FOLLOWING THE JAWWING CONSTITUTION
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Score animation ──────────────────────────────────────────────────────────

function AnimatedScore({ value, voted }: { value: number; voted: "up" | "down" | null }) {
  const [display, setDisplay] = useState(value);
  const [flash, setFlash] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value !== prevRef.current) {
      setDisplay(value);
      prevRef.current = value;
      setFlash(true);
      const t = setTimeout(() => setFlash(false), 300);
      return () => clearTimeout(t);
    }
  }, [value]);

  return (
    <span
      style={{
        color: flash ? "#C0C0C0" : voted === "up" ? "#FFFFFF" : voted === "down" ? "#AAAAAA" : "#C0C0C0",
        ...MONO,
        fontSize: "0.875rem",
        fontWeight: 500,
        minWidth: "24px",
        textAlign: "center",
        display: "inline-block",
        transition: "color 150ms ease",
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
    <span style={{ ...MONO, fontSize: "0.5625rem", letterSpacing: "0.08em", color: "#AAAAAA", border: "1px solid #1F1F1F", padding: "2px 5px" }}>
      {label}
    </span>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

function isControversial(post: Post): boolean {
  const ups = post.upvotes ?? 0;
  const downs = post.downvotes ?? 0;
  const engagement = ups + downs;
  if (engagement <= 10) return false;
  const controversy = Math.min(ups, downs) / Math.max(ups, downs);
  return controversy > 0.7;
}

function PostCard({ post, variant = "card", feedScope }: PostCardProps) {
  const replyCount = post.reply_count ?? post.replyCount ?? 0;
  const [score, setScore] = useState(post.score);
  const controversial = isControversial(post);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [voting, setVoting] = useState(false);
  const [voteAnim, setVoteAnim] = useState<"up" | "down" | null>(null);
  const [copyLabel, setCopyLabel] = useState<"SHARE" | "COPIED ✓">("SHARE");
  const toast = useToast();
  const { blockUser } = useBlockedUsers();

  const handleBlock = (e: React.MouseEvent) => {
    e.stopPropagation();
    const blockId = post.author_id || post.user_id;
    if (!blockId) return;
    blockUser(blockId);
    toast.show("BLOCKED", 2000);
  };

  const contentImageUrls = matchImageUrls(post.content);
  // Include the post's image_url field (from uploads/seeding) if not already in content
  const imageUrls = post.image_url && !contentImageUrls.includes(post.image_url)
    ? [post.image_url, ...contentImageUrls]
    : contentImageUrls;
  const linkPreviewUrl = matchLinkPreviewUrl(post.content);

  const vote = async (dir: "up" | "down") => {
    if (voting) return;

    // Scale animation
    setVoteAnim(dir);
    setTimeout(() => setVoteAnim(null), 150);

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
      setCopyLabel("COPIED ✓");
      setTimeout(() => setCopyLabel("SHARE"), 2000);
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

          {/* Video preview */}
          {post.video_url && <VideoPreview videoUrl={post.video_url} thumbnail={post.video_thumbnail} />}

          {/* Bottom meta */}
          <div style={{ display: "flex", gap: "12px", marginTop: "12px", alignItems: "center" }}>
            {post.timeAgo && (
              <span style={{ ...MONO, color: "#888888", fontSize: "0.625rem", letterSpacing: "0.06em" }}>
                {post.timeAgo}
              </span>
            )}
            {feedScope === "country" && post.metro && (
              <>
                <span style={{ color: "#1F1F1F" }}>·</span>
                <span style={{ ...MONO, fontSize: "0.625rem", letterSpacing: "0.08em", color: "#888888", textTransform: "uppercase" }}>{post.metro}</span>
              </>
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
                color: voted === "up" ? "#FFFFFF" : "#AAAAAA",
                background: "none",
                border: "none",
                cursor: voting ? "wait" : "pointer",
                fontSize: "1.25rem",
                lineHeight: 1,
                padding: "10px",
                minWidth: "44px",
                minHeight: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "color 150ms",
              }}
              aria-label="Upvote"
            >
              ▲
            </button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
              <AnimatedScore value={score} voted={voted} />
              {controversial && (
                <span style={{ fontSize: "0.65rem", color: "#FFF", lineHeight: 1 }} title="Hot debate">⚡</span>
              )}
            </div>
            <button
              onClick={() => vote("down")}
              disabled={voting}
              style={{
                color: voted === "down" ? "#C0C0C0" : "#888888",
                background: "none",
                border: "none",
                cursor: voting ? "wait" : "pointer",
                fontSize: "1.25rem",
                lineHeight: 1,
                padding: "10px",
                minWidth: "44px",
                minHeight: "44px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
              style={{ color: "#AAAAAA", textDecoration: "none", fontSize: "1.125rem", lineHeight: 1, display: "block", padding: "4px" }}
              aria-label={`${replyCount} replies`}
            >
              ↩
            </Link>
            <span style={{ ...MONO, color: "#888888", fontSize: "0.625rem" }}>{replyCount}</span>
          </div>

          {/* Share */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <button
              onClick={handleShare}
              style={{ color: "#AAAAAA", background: "none", border: "none", cursor: "pointer", fontSize: "1.125rem", lineHeight: 1, padding: "4px", transition: "color 150ms" }}
              aria-label="Share"
            >
              ↗
            </button>
            <span style={{ ...MONO, color: "#888888", fontSize: "0.625rem" }}>SHARE</span>
          </div>

          {/* Report */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <ReportButton postId={post.id} size="md" />
          </div>

          {/* Block */}
          {(post.author_id || post.user_id) && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <button
                onClick={handleBlock}
                title="Block this user"
                aria-label="Block user"
                style={{ color: "#888888", background: "none", border: "none", cursor: "pointer", fontSize: "1.125rem", lineHeight: 1, padding: "4px", transition: "color 150ms" }}
              >
                🚫
              </button>
              <span style={{ ...MONO, color: "#888888", fontSize: "0.625rem" }}>BLOCK</span>
            </div>
          )}
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

      {/* Video preview */}
      {post.video_url && <VideoPreview videoUrl={post.video_url} thumbnail={post.video_thumbnail} />}

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
              color: voted === "up" ? "#FFFFFF" : "#AAAAAA",
              background: "none",
              border: "none",
              cursor: voting ? "wait" : "pointer",
              transform: voteAnim === "up" ? "scale(1.2)" : "scale(1)",
              transition: "color 150ms, transform 150ms",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "44px",
              minHeight: "44px",
              fontSize: "1rem",
            }}
            aria-label="Upvote"
          >
            ▲
          </button>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
            <AnimatedScore value={score} voted={voted} />
            {controversial && (
              <span style={{ fontSize: "0.65rem", color: "#FFF", lineHeight: 1 }} title="Hot debate">⚡</span>
            )}
          </div>
          <button
            onClick={() => vote("down")}
            disabled={voting}
            style={{
              color: voted === "down" ? "#C0C0C0" : "#AAAAAA",
              opacity: voted === "down" ? 1 : 0.6,
              background: "none",
              border: "none",
              cursor: voting ? "wait" : "pointer",
              transform: voteAnim === "down" ? "scale(1.2)" : "scale(1)",
              transition: "color 150ms, transform 150ms, opacity 150ms",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "44px",
              minHeight: "44px",
              fontSize: "1rem",
            }}
            aria-label="Downvote"
          >
            ▼
          </button>
        </div>

        {/* Right meta — clicking anywhere navigates to post detail */}
        <Link
          href={`/post/${post.id}`}
          style={{ color: "#AAAAAA", textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", ...MONO, letterSpacing: "0.02em" }}
          className="text-xs hover:text-[#A0A0A0] transition-colors"
          onClick={(e) => {
            // Don't intercept the share button click (it's a sibling, not nested here)
          }}
        >
          {post.expires_at && <ExpiryIndicator expiresAt={post.expires_at} />}
          {/* Comment count */}
          <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span>💬</span>
            <span style={{ ...MONO, fontSize: "0.75rem" }}>{replyCount}</span>
          </span>
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
          {feedScope === "country" && post.metro && (
            <>
              <span style={{ color: "#1F1F1F" }}>·</span>
              <span style={{ ...MONO, fontSize: "0.625rem", letterSpacing: "0.08em", color: "#888888", textTransform: "uppercase" }}>{post.metro}</span>
            </>
          )}
          {(post.mod_confidence !== undefined) && (
            <>
              <span style={{ color: "#1F1F1F" }}>·</span>
              <ModBadge postId={post.id} modConfidence={post.mod_confidence} />
            </>
          )}
        </Link>

        {/* Report / Share / Block — inline on same row */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto", paddingLeft: "8px", flexShrink: 0 }}>
          <ReportButton postId={post.id} size="sm" />
          <button
            onClick={handleShare}
            style={{
              color: copyLabel === "COPIED ✓" ? "#FFFFFF" : "#888888",
              background: "none", border: "none", cursor: "pointer", padding: "2px 4px",
              fontSize: "0.6875rem", lineHeight: 1, ...MONO, letterSpacing: "0.04em", transition: "color 150ms",
            }}
            className="hover:text-[#A0A0A0]"
            aria-label="Share post"
            title="Copy link"
          >
            ↗
          </button>
          {(post.author_id || post.user_id) && (
            <button
              onClick={handleBlock}
              title="Block this user"
              aria-label="Block user"
              style={{
                background: "none", border: "none", cursor: "pointer", color: "#888888",
                fontSize: "0.6875rem", lineHeight: 1, padding: "2px 4px", ...MONO, transition: "color 150ms",
              }}
              className="hover:text-[#A0A0A0]"
            >
              🚫
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(PostCard);
