"use client";

import { useState } from "react";

export interface Post {
  id: string;
  content: string;
  score: number;
  replyCount: number;
  timeAgo: string;
  distance: string;
}

interface PostCardProps {
  post: Post;
}

export default function PostCard({ post }: PostCardProps) {
  const [score, setScore] = useState(post.score);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);

  const vote = (dir: "up" | "down") => {
    if (voted === dir) {
      setScore(post.score);
      setVoted(null);
    } else if (voted === null) {
      setScore((s) => s + (dir === "up" ? 1 : -1));
      setVoted(dir);
    } else {
      setScore((s) => s + (dir === "up" ? 2 : -2));
      setVoted(dir);
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
            style={{
              color: voted === "up" ? "#FFFFFF" : "#555555",
              transition: "color 150ms, transform 150ms",
            }}
            className={`text-xs cursor-pointer hover:text-white ${voted === "up" ? "scale-[1.15]" : ""}`}
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
            style={{
              color: voted === "down" ? "#555555" : "#555555",
              opacity: voted === "down" ? 1 : 0.6,
              transition: "color 150ms, transform 150ms",
            }}
            className={`text-xs cursor-pointer hover:opacity-100 hover:text-[#A0A0A0] ${voted === "down" ? "scale-[1.15]" : ""}`}
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
          <span>↩ {post.replyCount}</span>
          <span style={{ color: "#1F1F1F" }}>·</span>
          <span>{post.distance}</span>
          <span style={{ color: "#1F1F1F" }}>·</span>
          <span>{post.timeAgo}</span>
        </div>
      </div>
    </article>
  );
}
