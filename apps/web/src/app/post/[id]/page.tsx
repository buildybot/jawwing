"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPost,
  getReplies,
  createReply,
  votePost,
  isAuthenticated,
  formatTimeAgo,
  type Post,
  type Reply,
} from "@/lib/api";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;
const MAX_REPLY = 300;

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [postLoading, setPostLoading] = useState(true);
  const [repliesLoading, setRepliesLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [score, setScore] = useState(0);
  const [voted, setVoted] = useState<"up" | "down" | null>(null);
  const [voting, setVoting] = useState(false);

  const [replyContent, setReplyContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const replyInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!id) return;
    getPost(id)
      .then((data) => {
        setPost(data.post);
        setScore(data.post.score);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Post not found."))
      .finally(() => setPostLoading(false));

    getReplies(id)
      .then((data) => setReplies(data.replies))
      .catch(() => {}) // non-fatal
      .finally(() => setRepliesLoading(false));
  }, [id]);

  const vote = async (dir: "up" | "down") => {
    if (voting || !post) return;
    if (!isAuthenticated()) {
      router.push("/login");
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
      await votePost(id, dir === "up" ? 1 : -1);
    } catch {
      setScore(score);
      setVoted(voted);
    } finally {
      setVoting(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyContent.trim()) return;
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }
    setReplyError(null);
    setSubmitting(true);
    try {
      const data = await createReply(id, replyContent.trim());
      setReplies((prev) => [...prev, data.reply]);
      setReplyContent("");
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Failed to post reply.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #1F1F1F" }} className="px-4 py-4 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          style={{ ...MONO, color: "#555555", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem", letterSpacing: "0.04em" }}
          className="hover:text-white transition-colors"
        >
          ← BACK
        </button>
        <span style={{ color: "#1F1F1F", ...MONO }}>|</span>
        <Link
          href="/"
          style={{ ...MONO, letterSpacing: "0.12em", fontWeight: 700, fontSize: "0.875rem", color: "#FFFFFF", textDecoration: "none" }}
        >
          JAWWING
        </Link>
      </nav>

      <main style={{ maxWidth: "480px", paddingBottom: "120px" }} className="mx-auto">

        {/* Post loading */}
        {postLoading && (
          <div style={{ padding: "24px 16px" }}>
            <div style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", padding: "20px" }}>
              <div style={{ background: "#1F1F1F", height: "14px", marginBottom: "10px", width: "90%" }} />
              <div style={{ background: "#1F1F1F", height: "14px", marginBottom: "10px", width: "80%" }} />
              <div style={{ background: "#1F1F1F", height: "14px", width: "60%" }} />
            </div>
          </div>
        )}

        {/* Error */}
        {!postLoading && error && (
          <div style={{ padding: "60px 16px", textAlign: "center" }}>
            <p style={{ ...MONO, color: "#FF3333", fontSize: "0.75rem", letterSpacing: "0.04em" }}>
              {error.toUpperCase()}
            </p>
          </div>
        )}

        {/* Post detail */}
        {!postLoading && post && (
          <div
            style={{
              background: "#0A0A0A",
              border: "1px solid #1F1F1F",
              margin: "2px 0",
              padding: "20px 16px",
            }}
          >
            <p style={{ color: "#FFFFFF", fontSize: "1.0625rem", lineHeight: "1.65", marginBottom: "20px" }}>
              {post.content}
            </p>

            {/* Vote + meta */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button
                  onClick={() => vote("up")}
                  disabled={voting}
                  style={{
                    color: voted === "up" ? "#FFFFFF" : "#555555",
                    background: "none", border: "none",
                    cursor: voting ? "wait" : "pointer",
                    fontSize: "0.875rem",
                    transition: "color 150ms",
                  }}
                  className="hover:text-white"
                >
                  ▲
                </button>
                <span
                  style={{
                    ...MONO,
                    color: voted === "up" ? "#FFFFFF" : voted === "down" ? "#555555" : "#A0A0A0",
                    fontSize: "1rem",
                    fontWeight: 600,
                    minWidth: "28px",
                    textAlign: "center",
                  }}
                >
                  {score}
                </span>
                <button
                  onClick={() => vote("down")}
                  disabled={voting}
                  style={{
                    color: voted === "down" ? "#A0A0A0" : "#555555",
                    background: "none", border: "none",
                    cursor: voting ? "wait" : "pointer",
                    fontSize: "0.875rem",
                    opacity: voted === "down" ? 1 : 0.6,
                    transition: "color 150ms",
                  }}
                  className="hover:opacity-100"
                >
                  ▼
                </button>
              </div>

              <div style={{ ...MONO, color: "#555555", fontSize: "0.6875rem", letterSpacing: "0.02em", display: "flex", gap: "8px" }}>
                <span>↩ {post.reply_count}</span>
                <span style={{ color: "#1F1F1F" }}>·</span>
                <span>{formatTimeAgo(post.created_at)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Replies header */}
        {!postLoading && post && (
          <div
            style={{
              ...MONO,
              fontSize: "0.625rem",
              letterSpacing: "0.1em",
              color: "#555555",
              padding: "12px 16px",
              borderBottom: "1px solid #1F1F1F",
            }}
          >
            REPLIES {repliesLoading ? "· LOADING..." : `· ${replies.length}`}
          </div>
        )}

        {/* Replies list */}
        {!repliesLoading && replies.length === 0 && !postLoading && post && (
          <div style={{ padding: "40px 16px", textAlign: "center" }}>
            <p style={{ ...MONO, color: "#333333", fontSize: "0.75rem", letterSpacing: "0.06em" }}>
              NO REPLIES YET
            </p>
          </div>
        )}

        <div className="flex flex-col" style={{ gap: "1px" }}>
          {replies.map((reply) => (
            <div
              key={reply.id}
              style={{
                background: "#0A0A0A",
                borderBottom: "1px solid #1F1F1F",
                padding: "14px 16px",
              }}
            >
              <p style={{ color: "#FFFFFF", fontSize: "0.9375rem", lineHeight: 1.6, marginBottom: "8px" }}>
                {reply.content}
              </p>
              <span style={{ ...MONO, color: "#555555", fontSize: "0.6875rem", letterSpacing: "0.02em" }}>
                {formatTimeAgo(reply.created_at)}
              </span>
            </div>
          ))}
        </div>

        {/* Reply input */}
        {post && (
          <div
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "480px",
              background: "#000000",
              borderTop: "1px solid #1F1F1F",
              padding: "12px 16px",
              zIndex: 20,
            }}
          >
            {replyError && (
              <p style={{ ...MONO, color: "#FF3333", fontSize: "0.6875rem", letterSpacing: "0.02em", marginBottom: "6px" }}>
                {replyError}
              </p>
            )}
            <form onSubmit={handleReplySubmit} style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                ref={replyInputRef}
                value={replyContent}
                onChange={(e) => setReplyContent(e.target.value.slice(0, MAX_REPLY))}
                placeholder={isAuthenticated() ? "Reply anonymously..." : "Login to reply..."}
                disabled={submitting || !isAuthenticated()}
                rows={2}
                style={{
                  flex: 1,
                  background: "#0A0A0A",
                  border: "1px solid #1F1F1F",
                  borderRadius: 0,
                  color: "#FFFFFF",
                  fontSize: "0.9375rem",
                  lineHeight: 1.5,
                  padding: "8px 10px",
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "#333333")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "#1F1F1F")}
                className="placeholder:text-[#555555]"
              />
              {isAuthenticated() ? (
                <button
                  type="submit"
                  disabled={!replyContent.trim() || submitting}
                  style={{
                    ...MONO,
                    background: replyContent.trim() && !submitting ? "#FFFFFF" : "transparent",
                    color: replyContent.trim() && !submitting ? "#000000" : "#555555",
                    border: `1px solid ${replyContent.trim() && !submitting ? "#FFFFFF" : "#333333"}`,
                    padding: "8px 16px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    cursor: replyContent.trim() && !submitting ? "pointer" : "not-allowed",
                    transition: "all 150ms",
                    whiteSpace: "nowrap",
                    height: "fit-content",
                  }}
                >
                  {submitting ? "..." : "REPLY"}
                </button>
              ) : (
                <Link
                  href="/login"
                  style={{
                    ...MONO,
                    background: "#FFFFFF",
                    color: "#000000",
                    border: "1px solid #FFFFFF",
                    padding: "8px 16px",
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  LOGIN
                </Link>
              )}
            </form>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "4px" }}>
              <span style={{ ...MONO, color: "#333333", fontSize: "0.625rem" }}>
                {replyContent.length}/{MAX_REPLY}
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
