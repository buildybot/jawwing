"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

interface Post {
  id: string;
  content: string;
  score: number;
  reply_count: number;
  created_at: number;
  status: string;
}

interface Meta {
  count: number;
  totalScore: number;
  avgScore: number;
}

interface NotifPrefs {
  replies: boolean;
  trending: boolean;
}

function formatTimeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function MyPostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ replies: true, trending: false });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    // Check login state
    if (!document.cookie.includes("jw_account_ok=1")) {
      router.replace("/signin");
      return;
    }
    fetchPosts();
  }, []);

  async function fetchPosts() {
    try {
      const res = await fetch("/api/v1/my/posts");
      if (res.status === 401) {
        router.replace("/signin");
        return;
      }
      const data = await res.json();
      setPosts(data.posts ?? []);
      setMeta(data.meta ?? null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handlePrefsChange(key: keyof NotifPrefs, val: boolean) {
    const updated = { ...notifPrefs, [key]: val };
    setNotifPrefs(updated);
    setSavingPrefs(true);
    setPrefsSaved(false);
    try {
      await fetch("/api/v1/my/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    } catch { /* best-effort */ } finally {
      setSavingPrefs(false);
    }
  }

  async function handleSignOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  }

  const bestPost = posts.length > 0
    ? posts.reduce((best, p) => (p.score > best.score ? p : best), posts[0])
    : null;

  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        padding: "40px 20px",
        maxWidth: 600,
        margin: "0 auto",
      }}
    >
      {/* Back */}
      <Link
        href="/"
        style={{
          ...MONO,
          color: "#333",
          fontSize: "0.6875rem",
          letterSpacing: "0.08em",
          textDecoration: "none",
          display: "block",
          marginBottom: 32,
        }}
      >
        ← JAWWING
      </Link>

      <h1
        style={{
          ...MONO,
          color: "#fff",
          fontSize: "1rem",
          fontWeight: 700,
          letterSpacing: "0.1em",
          marginBottom: 32,
        }}
      >
        YOUR POSTS
      </h1>

      {/* Stats */}
      {meta && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 1,
            marginBottom: 40,
            border: "1px solid #1a1a1a",
          }}
        >
          {[
            { label: "POSTS", value: meta.count },
            { label: "TOTAL SCORE", value: meta.totalScore },
            { label: "AVG SCORE", value: meta.avgScore },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                padding: "16px",
                background: "#000",
                borderRight: "1px solid #1a1a1a",
              }}
            >
              <div style={{ ...MONO, color: "#444", fontSize: "0.5rem", letterSpacing: "0.1em", marginBottom: 6 }}>
                {label}
              </div>
              <div style={{ ...MONO, color: "#fff", fontSize: "1.25rem", fontWeight: 700 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <p style={{ ...MONO, color: "#333", fontSize: "0.6875rem" }}>LOADING...</p>
      )}

      {/* No posts */}
      {!loading && posts.length === 0 && (
        <div style={{ ...MONO, color: "#333", fontSize: "0.6875rem", letterSpacing: "0.06em" }}>
          <p>No posts yet.</p>
          <p style={{ marginTop: 8 }}>
            <Link href="/" style={{ color: "#555", textDecoration: "none" }}>
              START POSTING →
            </Link>
          </p>
        </div>
      )}

      {/* Posts list */}
      {!loading && posts.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          {posts.map((post) => (
            <div
              key={post.id}
              style={{
                borderBottom: "1px solid #111",
                padding: "16px 0",
                position: "relative",
              }}
            >
              {bestPost?.id === post.id && posts.length > 1 && (
                <div style={{ ...MONO, color: "#555", fontSize: "0.5rem", letterSpacing: "0.1em", marginBottom: 4 }}>
                  ★ BEST POST
                </div>
              )}
              <p
                style={{
                  ...MONO,
                  color: post.status === "active" ? "#ccc" : "#444",
                  fontSize: "0.8125rem",
                  lineHeight: 1.6,
                  marginBottom: 8,
                  wordBreak: "break-word",
                }}
              >
                {post.content}
              </p>
              <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                <span style={{ ...MONO, color: "#555", fontSize: "0.5625rem", letterSpacing: "0.06em" }}>
                  {post.score >= 0 ? "+" : ""}{post.score}
                </span>
                <span style={{ ...MONO, color: "#333", fontSize: "0.5625rem" }}>
                  {post.reply_count} {post.reply_count === 1 ? "reply" : "replies"}
                </span>
                <span style={{ ...MONO, color: "#333", fontSize: "0.5625rem" }}>
                  {formatTimeAgo(post.created_at)}
                </span>
                {post.status !== "active" && (
                  <span style={{ ...MONO, color: "#f44", fontSize: "0.5rem", letterSpacing: "0.08em" }}>
                    {post.status.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Notification preferences */}
      <div
        style={{
          border: "1px solid #1a1a1a",
          padding: "20px",
          marginBottom: 32,
        }}
      >
        <div style={{ ...MONO, color: "#555", fontSize: "0.5rem", letterSpacing: "0.1em", marginBottom: 16 }}>
          NOTIFICATIONS
        </div>
        {(["replies", "trending"] as const).map((key) => {
          const labels: Record<string, string> = {
            replies: "Notify me when someone replies to my posts",
            trending: "Notify me when my post is trending",
          };
          return (
            <label
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
                cursor: "pointer",
              }}
            >
              <div
                onClick={() => handlePrefsChange(key, !notifPrefs[key])}
                style={{
                  width: 28,
                  height: 16,
                  border: `1px solid ${notifPrefs[key] ? "#fff" : "#333"}`,
                  background: notifPrefs[key] ? "#fff" : "#000",
                  position: "relative",
                  flexShrink: 0,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 2,
                    left: notifPrefs[key] ? 12 : 2,
                    width: 10,
                    height: 10,
                    background: notifPrefs[key] ? "#000" : "#333",
                    transition: "left 0.1s",
                  }}
                />
              </div>
              <span style={{ ...MONO, color: "#666", fontSize: "0.6875rem", letterSpacing: "0.04em" }}>
                {labels[key]}
              </span>
            </label>
          );
        })}
        {savingPrefs && (
          <p style={{ ...MONO, color: "#333", fontSize: "0.5rem", marginTop: 4 }}>SAVING...</p>
        )}
        {prefsSaved && (
          <p style={{ ...MONO, color: "#555", fontSize: "0.5rem", marginTop: 4 }}>SAVED</p>
        )}
      </div>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        style={{
          ...MONO,
          background: "none",
          border: "none",
          color: "#333",
          fontSize: "0.5625rem",
          letterSpacing: "0.08em",
          cursor: "pointer",
          padding: 0,
        }}
        className="hover:text-[#555]"
      >
        SIGN OUT
      </button>
    </div>
  );
}
