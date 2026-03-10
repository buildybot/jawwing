"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  getPost,
  getReplies,
  createReply,
  votePost,
  formatTimeAgo,
  type Post,
  type Reply,
} from "@/lib/api";
import { ToastProvider } from "@/components/Toast";
import ReportButton from "@/components/ReportButton";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;
const MAX_CHARS = 300;
const MAX_DEPTH = 4;

// ─── Reply vote state (client-side only, optimistic) ─────────────────────────

interface ReplyVoteState {
  score: number;
  voted: "up" | "down" | null;
}

// ─── Threaded reply tree ──────────────────────────────────────────────────────

interface ReplyNode extends Reply {
  children: ReplyNode[];
}

function buildReplyTree(replies: Reply[]): ReplyNode[] {
  const map = new Map<string, ReplyNode>();
  const roots: ReplyNode[] = [];

  for (const r of replies) {
    map.set(r.id, { ...r, children: [] });
  }
  for (const r of replies) {
    const node = map.get(r.id)!;
    if (r.parent_reply_id && map.has(r.parent_reply_id)) {
      map.get(r.parent_reply_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort: top-level by created_at desc (newest first), nested by created_at asc
  roots.sort((a, b) => b.created_at - a.created_at);
  sortNestedByDate(roots);

  return roots;
}

function sortNestedByDate(nodes: ReplyNode[]) {
  for (const node of nodes) {
    if (node.children.length > 0) {
      node.children.sort((a, b) => a.created_at - b.created_at);
      sortNestedByDate(node.children);
    }
  }
}

// ─── InlineReplyInput ─────────────────────────────────────────────────────────

interface InlineReplyInputProps {
  parentId: string;
  onSubmit: (parentId: string, content: string) => Promise<void>;
  onCancel: () => void;
}

function InlineReplyInput({ parentId, onSubmit, onCancel }: InlineReplyInputProps) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(parentId, content.trim());
      setContent("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        marginLeft: "16px",
        borderLeft: "1px solid #1F1F1F",
        padding: "8px 12px",
        background: "#050505",
      }}
    >
      {error && (
        <p style={{ ...MONO, color: "#FF3333", fontSize: "0.625rem", letterSpacing: "0.04em", marginBottom: "6px" }}>
          {error.toUpperCase()}
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <textarea
          ref={inputRef}
          value={content}
          onChange={(e) => setContent(e.target.value.slice(0, MAX_CHARS))}
          placeholder="Reply..."
          disabled={submitting}
          rows={2}
          style={{
            flex: 1,
            background: "#0A0A0A",
            border: "1px solid #1F1F1F",
            borderRadius: 0,
            color: "#FFFFFF",
            fontSize: "0.875rem",
            lineHeight: 1.5,
            padding: "6px 8px",
            resize: "none",
            outline: "none",
            fontFamily: "inherit",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "#333333")}
          onBlur={(e) => (e.currentTarget.style.borderColor = "#1F1F1F")}
          className="placeholder:text-[#555555]"
        />
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <button
            type="submit"
            disabled={!content.trim() || submitting}
            style={{
              ...MONO,
              background: content.trim() && !submitting ? "#FFFFFF" : "transparent",
              color: content.trim() && !submitting ? "#000000" : "#555555",
              border: `1px solid ${content.trim() && !submitting ? "#FFFFFF" : "#333333"}`,
              padding: "5px 12px",
              fontSize: "0.625rem",
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: content.trim() && !submitting ? "pointer" : "not-allowed",
              transition: "all 150ms",
              whiteSpace: "nowrap",
            }}
          >
            {submitting ? "..." : "POST"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              ...MONO,
              background: "none",
              border: "1px solid #1F1F1F",
              color: "#555555",
              padding: "5px 12px",
              fontSize: "0.625rem",
              letterSpacing: "0.08em",
              cursor: "pointer",
            }}
          >
            CANCEL
          </button>
        </div>
      </form>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px" }}>
        <span style={{ ...MONO, color: "#333333", fontSize: "0.5625rem" }}>
          {content.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  );
}

// ─── ReplyItem ────────────────────────────────────────────────────────────────

interface ReplyItemProps {
  reply: ReplyNode;
  depth: number;
  voteStates: Map<string, ReplyVoteState>;
  onVote: (replyId: string, dir: "up" | "down") => void;
  activeReplyId: string | null;
  onSetActiveReply: (replyId: string | null) => void;
  onSubmitReply: (parentId: string, content: string) => Promise<void>;
}

function ReplyItem({
  reply,
  depth,
  voteStates,
  onVote,
  activeReplyId,
  onSetActiveReply,
  onSubmitReply,
}: ReplyItemProps) {
  const vs = voteStates.get(reply.id) ?? { score: 0, voted: null };
  // Cap indent at depth 4; deeper replies render flat under depth 4
  const effectiveDepth = Math.min(depth, MAX_DEPTH);
  const indentPx = effectiveDepth * 16;
  const isReplying = activeReplyId === reply.id;

  return (
    <div>
      {/* Comment row */}
      <div
        style={{
          background: "#0A0A0A",
          borderBottom: "1px solid #111111",
          padding: "10px 16px 10px 0",
          paddingLeft: `${16 + indentPx}px`,
          borderLeft: effectiveDepth > 0 ? "1px solid #1F1F1F" : "none",
          marginLeft: effectiveDepth > 0 ? `${indentPx}px` : 0,
        }}
      >
        <p style={{ color: "#FFFFFF", fontSize: "0.9rem", lineHeight: 1.6, marginBottom: "8px" }}>
          {reply.content}
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Votes */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => onVote(reply.id, "up")}
              style={{
                color: vs.voted === "up" ? "#FFFFFF" : "#555555",
                background: "none", border: "none",
                cursor: "pointer", fontSize: "0.625rem",
                transition: "color 150ms", padding: 0,
              }}
              aria-label="Upvote reply"
            >
              ▲
            </button>
            <span style={{ ...MONO, color: "#555555", fontSize: "0.625rem", minWidth: "14px", textAlign: "center" }}>
              {vs.score}
            </span>
            <button
              onClick={() => onVote(reply.id, "down")}
              style={{
                color: vs.voted === "down" ? "#A0A0A0" : "#555555",
                background: "none", border: "none",
                cursor: "pointer", fontSize: "0.625rem",
                opacity: vs.voted === "down" ? 1 : 0.6,
                transition: "color 150ms", padding: 0,
              }}
              aria-label="Downvote reply"
            >
              ▼
            </button>
          </div>
          {/* Time + Reply + Report */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ ...MONO, color: "#555555", fontSize: "0.5625rem", letterSpacing: "0.02em" }}>
              {formatTimeAgo(reply.created_at)}
            </span>
            <button
              onClick={() => onSetActiveReply(isReplying ? null : reply.id)}
              style={{
                ...MONO,
                color: isReplying ? "#FFFFFF" : "#555555",
                background: "none", border: "none",
                cursor: "pointer", fontSize: "0.5rem",
                letterSpacing: "0.08em", padding: 0,
                transition: "color 150ms",
              }}
            >
              REPLY
            </button>
            <ReportButton postId={reply.post_id} replyId={reply.id} size="sm" />
          </div>
        </div>
      </div>

      {/* Inline reply input */}
      {isReplying && (
        <InlineReplyInput
          parentId={reply.id}
          onSubmit={async (parentId, content) => {
            await onSubmitReply(parentId, content);
            onSetActiveReply(null);
          }}
          onCancel={() => onSetActiveReply(null)}
        />
      )}

      {/* Nested children */}
      {reply.children.map((child) => (
        <ReplyItem
          key={child.id}
          reply={child}
          depth={depth + 1}
          voteStates={voteStates}
          onVote={onVote}
          activeReplyId={activeReplyId}
          onSetActiveReply={onSetActiveReply}
          onSubmitReply={onSubmitReply}
        />
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

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

  const [replyVotes, setReplyVotes] = useState<Map<string, ReplyVoteState>>(new Map());

  // Top-level comment input (fixed bottom bar)
  const [commentContent, setCommentContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [posted, setPosted] = useState(false);

  // Inline threading: which reply ID has the open inline input
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null);

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
      .then((data) => {
        setReplies(data.replies);
        const initVotes = new Map<string, ReplyVoteState>();
        for (const r of data.replies) {
          initVotes.set(r.id, { score: 0, voted: null });
        }
        setReplyVotes(initVotes);
      })
      .catch(() => {})
      .finally(() => setRepliesLoading(false));
  }, [id]);

  const vote = async (dir: "up" | "down") => {
    if (voting || !post) return;

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

  const handleReplyVote = (replyId: string, dir: "up" | "down") => {
    setReplyVotes((prev) => {
      const next = new Map(prev);
      const cur = next.get(replyId) ?? { score: 0, voted: null };
      let newScore = cur.score;
      let newVoted: "up" | "down" | null;
      if (cur.voted === dir) {
        newScore = cur.score + (dir === "up" ? -1 : 1);
        newVoted = null;
      } else if (cur.voted === null) {
        newScore = cur.score + (dir === "up" ? 1 : -1);
        newVoted = dir;
      } else {
        newScore = cur.score + (dir === "up" ? 2 : -2);
        newVoted = dir;
      }
      next.set(replyId, { score: newScore, voted: newVoted });
      return next;
    });
  };

  // Submit a nested reply (inline, with parentId)
  const handleSubmitReply = useCallback(async (parentId: string, content: string) => {
    const data = await createReply(id, content, parentId);
    setReplies((prev) => [...prev, data.reply]);
    setReplyVotes((prev) => {
      const next = new Map(prev);
      next.set(data.reply.id, { score: 0, voted: null });
      return next;
    });
  }, [id]);

  // Submit a top-level comment (bottom bar)
  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentContent.trim() || submitting) return;
    setCommentError(null);
    setSubmitting(true);
    try {
      const data = await createReply(id, commentContent.trim(), undefined);
      setReplies((prev) => [...prev, data.reply]);
      setReplyVotes((prev) => {
        const next = new Map(prev);
        next.set(data.reply.id, { score: 0, voted: null });
        return next;
      });
      setCommentContent("");
      setPosted(true);
      setTimeout(() => setPosted(false), 2500);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setSubmitting(false);
    }
  };

  const replyTree = buildReplyTree(replies);

  return (
    <ToastProvider>
      <div style={{ background: "#000000", minHeight: "100vh" }}>
        {/* Nav */}
        <nav style={{ borderBottom: "1px solid #1F1F1F" }} className="px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            style={{
              ...MONO, color: "#777777", background: "none", border: "none",
              cursor: "pointer", fontSize: "0.875rem", letterSpacing: "0.04em",
            }}
            className="hover:text-white transition-colors"
          >
            ← BACK
          </button>
          <span style={{ color: "#1F1F1F", ...MONO }}>|</span>
          <Link
            href="/"
            style={{
              ...MONO, letterSpacing: "0.12em", fontWeight: 700,
              fontSize: "0.875rem", color: "#FFFFFF", textDecoration: "none",
            }}
          >
            JAWWING
          </Link>
        </nav>

        <main style={{ maxWidth: "480px", paddingBottom: "120px" }} className="mx-auto">

          {/* Post loading skeleton */}
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

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    onClick={() => vote("up")}
                    disabled={voting}
                    style={{
                      color: voted === "up" ? "#FFFFFF" : "#777777",
                      background: "none", border: "none",
                      cursor: voting ? "wait" : "pointer",
                      fontSize: "0.875rem", transition: "color 150ms",
                    }}
                    className="hover:text-white"
                  >
                    ▲
                  </button>
                  <span
                    style={{
                      ...MONO,
                      color: voted === "up" ? "#FFFFFF" : voted === "down" ? "#777777" : "#C0C0C0",
                      fontSize: "1rem", fontWeight: 600,
                      minWidth: "28px", textAlign: "center",
                    }}
                  >
                    {score}
                  </span>
                  <button
                    onClick={() => vote("down")}
                    disabled={voting}
                    style={{
                      color: voted === "down" ? "#C0C0C0" : "#777777",
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
                <div style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.02em", display: "flex", alignItems: "center", gap: "12px" }}>
                  <span>{formatTimeAgo(post.created_at)}</span>
                  <ReportButton postId={post.id} size="sm" />
                </div>
              </div>
            </div>
          )}

          {/* Comments header — "23 COMMENTS" */}
          {!postLoading && post && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 16px",
                borderBottom: "1px solid #1F1F1F",
                borderTop: "1px solid #1F1F1F",
                background: "#000000",
              }}
            >
              <span style={{ ...MONO, fontSize: "0.625rem", letterSpacing: "0.1em", color: "#777777" }}>
                {repliesLoading
                  ? "LOADING..."
                  : `${replies.length} ${replies.length === 1 ? "COMMENT" : "COMMENTS"}`}
              </span>
              {!repliesLoading && replies.length > 0 && (
                <span style={{ ...MONO, fontSize: "0.5625rem", letterSpacing: "0.06em", color: "#333333" }}>
                  NEWEST FIRST
                </span>
              )}
            </div>
          )}

          {/* Empty state */}
          {!repliesLoading && replies.length === 0 && !postLoading && post && (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <p style={{ ...MONO, color: "#333333", fontSize: "0.75rem", letterSpacing: "0.08em" }}>
                NO COMMENTS YET — BE FIRST
              </p>
            </div>
          )}

          {/* Threaded comments */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
            {replyTree.map((reply) => (
              <ReplyItem
                key={reply.id}
                reply={reply}
                depth={0}
                voteStates={replyVotes}
                onVote={handleReplyVote}
                activeReplyId={activeReplyId}
                onSetActiveReply={setActiveReplyId}
                onSubmitReply={handleSubmitReply}
              />
            ))}
          </div>
        </main>

        {/* Fixed bottom — top-level comment input */}
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
              padding: "10px 16px 12px",
              zIndex: 20,
            }}
          >
            {commentError && (
              <p style={{ ...MONO, color: "#FF3333", fontSize: "0.625rem", letterSpacing: "0.02em", marginBottom: "6px" }}>
                {commentError.toUpperCase()}
              </p>
            )}

            <form onSubmit={handleCommentSubmit} style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
              <textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Add a comment..."
                disabled={submitting}
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
              <button
                type="submit"
                disabled={!commentContent.trim() || submitting}
                style={{
                  ...MONO,
                  background: posted ? "#FFFFFF" : (commentContent.trim() && !submitting ? "#FFFFFF" : "transparent"),
                  color: posted ? "#000000" : (commentContent.trim() && !submitting ? "#000000" : "#555555"),
                  border: `1px solid ${commentContent.trim() && !submitting ? "#FFFFFF" : "#333333"}`,
                  padding: "8px 16px",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  cursor: commentContent.trim() && !submitting ? "pointer" : "not-allowed",
                  transition: "all 150ms",
                  whiteSpace: "nowrap",
                  height: "fit-content",
                }}
              >
                {submitting ? "..." : posted ? "POSTED ✓" : "COMMENT"}
              </button>
            </form>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "3px" }}>
              <span style={{ ...MONO, color: "#333333", fontSize: "0.5625rem" }}>
                {commentContent.length}/{MAX_CHARS}
              </span>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}
