"use client";

import { useState } from "react";
import Link from "next/link";
import { votePost, isAuthenticated } from "@/lib/api";

export interface Post {
  id: string;
  content: string;
  score: number;
  reply_count?: number;
  replyCount?: number; // legacy
  timeAgo?: string;
  distance?: string;
  created_at?: number;
}

interface PostCardProps {
  post: Post;
  onLoginRequired?: () => void;
}

export default function PostCard({ post, onLoginRequired }: PostCardProps) {
  const replyCount = post.reply_count ?? post.replyCount ?? 0;
  const [score, setScore] = useState(post.score);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [voting, setVoting] = useState(false);

  const vote = async (dir: "up" | "down") => {
    if (voting) return;

    if (!isAuthenticated()) {
      onLoginRequired?.();
      return;
    }

    // Optimistic update
    let newScore = score;
    let newVoted: "up" | "down" | null;

    if (voted === dir) {
      newScore = post.score + (voted === "up" ? 0 : 0);
      // unvote — compute delta reversal
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
      // Revert on failure
      setScore(score);
      setVoted(voted);
      console.error("[vote] failed:", err);
    } finally {
      setVoting(false);
    }
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

      {/* Meta row */}
      <div className="flex items-center justify-between">
        {/* Voting */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => vote("up")}
            disabled={voting}
            style={{
              color: voted === "up" ? "#FFFFFF" : "#555555",
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
          <span
            style={{
              color: voted === "up" ? "#FFFFFF" : voted === "down" ? "#555555" : "#A0A0A0",
              fontFamily: "var(--font-mono), monospace",
            }}
            className="text-sm font-medium tabular-nums w-6 text-center"
          >
            {score}
          </span>
          <button
            onClick={() => vote("down")}
            disabled={voting}
            style={{
              color: voted === "down" ? "#A0A0A0" : "#555555",
              opacity: voted === "down" ? 1 : 0.6,
              transition: "color 150ms, transform 150ms",
              background: "none",
              border: "none",
              cursor: voting ? "wait" : "pointer",
            }}
            className={`text-xs hover:opacity-100 hover:text-[#A0A0A0] ${voted === "down" ? "scale-[1.15]" : ""}`}
            aria-label="Downvote"
          >
            ▼
          </button>
        </div>

        {/* Meta */}
        <div
          style={{
            color: "#555555",
            fontFamily: "var(--font-mono), monospace",
            letterSpacing: "0.02em",
          }}
          className="flex items-center gap-3 text-xs"
        >
          <Link
            href={`/post/${post.id}`}
            style={{ color: "#555555", textDecoration: "none" }}
            className="hover:text-[#A0A0A0] transition-colors"
          >
            ↩ {replyCount}
          </Link>
          {post.distance && (
            <>
              <span style={{ color: "#1F1F1F" }}>·</span>
              <span>{post.distance}</span>
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
