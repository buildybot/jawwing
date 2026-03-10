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

interface PostCardProps {
  post: Post;
  onLoginRequired?: () => void;
}

// ─── Score display with slide animation ──────────────────────────────────────

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
        fontFamily: "var(--font-mono), monospace",
        fontSize: "0.875rem",
        fontWeight: 500,
        minWidth: "24px",
        textAlign: "center",
        display: "inline-block",
        transition: "transform 150ms ease, opacity 150ms ease",
        transform: animDir === "up"
          ? "translateY(-3px)"
          : animDir === "down"
          ? "translateY(3px)"
          : "translateY(0)",
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
    <span
      style={{
        fontFamily: "var(--font-mono), monospace",
        fontSize: "0.5625rem",
        letterSpacing: "0.08em",
        color: "#777777",
        border: "1px solid #1F1F1F",
        padding: "2px 5px",
      }}
    >
      {label}
    </span>
  );
}

// ─── PostCard ─────────────────────────────────────────────────────────────────

export default function PostCard({ post, onLoginRequired }: PostCardProps) {
  const replyCount = post.reply_count ?? post.replyCount ?? 0;
  const [score, setScore] = useState(post.score);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [voting, setVoting] = useState(false);
  const [showVotePrompt, setShowVotePrompt] = useState(false);
  const toast = useToast();

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

  return (
    <article
      style={{
        background: "#0A0A0A",
        border: "1px solid #1F1F1F",
      }}
      className="p-4 transition-colors hover:border-[#333333]"
    >
      <p
        style={{ color: "#FFFFFF", lineHeight: "1.6" }}
        className="text-base mb-4"
      >
        {post.content}
      </p>

      {/* Territory badge */}
      {post.territoryName && (
        <div style={{ marginBottom: "8px" }}>
          <span
            style={{
              fontFamily: "var(--font-mono), monospace",
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
      <div className="flex items-center justify-between">
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
        </div>

        {/* Right side meta */}
        <div
          style={{
            color: "#777777",
            fontFamily: "var(--font-mono), monospace",
            letterSpacing: "0.02em",
          }}
          className="flex items-center gap-3 text-xs"
        >
          {/* Expiry */}
          {post.expires_at && <ExpiryIndicator expiresAt={post.expires_at} />}

          {/* Share */}
          <button
            onClick={handleShare}
            style={{
              color: "#777777",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
              fontSize: "0.75rem",
              lineHeight: 1,
            }}
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
