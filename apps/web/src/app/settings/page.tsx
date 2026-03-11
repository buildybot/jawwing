"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import BlockedUsersPanel from "@/components/BlockedUsersPanel";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
};

const SECTION_LABEL: React.CSSProperties = {
  ...MONO,
  letterSpacing: "0.1em",
  fontSize: "0.5625rem",
  fontWeight: 700,
  color: "#888888",
  textTransform: "uppercase" as const,
  marginBottom: "2px",
};

const ROW: React.CSSProperties = {
  borderBottom: "1px solid #1A1A1A",
  padding: "14px 0",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

const LINK_STYLE: React.CSSProperties = {
  ...MONO,
  color: "#FFFFFF",
  fontSize: "0.8125rem",
  letterSpacing: "0.06em",
  textDecoration: "none",
};

function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const masked = user.length <= 2 ? user : user[0] + "•".repeat(user.length - 2) + user[user.length - 1];
  return `${masked}@${domain}`;
}

function formatTimeAgo(ts: number): string {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface UserPost {
  id: string;
  content: string;
  score: number;
  reply_count: number;
  created_at: number;
  status: string;
}

interface PostMeta {
  count: number;
  totalScore: number;
  avgScore: number;
}

interface NotifPrefs {
  replies: boolean;
  trending: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  // My posts state
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [meta, setMeta] = useState<PostMeta | null>(null);
  const [postsLoading, setPostsLoading] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({ replies: true, trending: false });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsSaved, setPrefsSaved] = useState(false);

  useEffect(() => {
    const loggedIn = document.cookie.includes("jw_account_ok=1");
    setIsLoggedIn(loggedIn);
    if (loggedIn) {
      fetch("/api/auth/me")
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data?.email) setEmail(data.email);
        })
        .catch(() => {});
      fetchPosts();
    }
  }, []);

  async function fetchPosts() {
    setPostsLoading(true);
    try {
      const res = await fetch("/api/v1/my/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data.posts ?? []);
        setMeta(data.meta ?? null);
      }
    } catch { /* noop */ } finally {
      setPostsLoading(false);
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
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      <main
        style={{
          maxWidth: "480px",
          margin: "0 auto",
          padding: "32px 16px 80px",
        }}
      >
        <h1
          style={{
            ...MONO,
            color: "#FFFFFF",
            fontSize: "1rem",
            fontWeight: 700,
            letterSpacing: "0.14em",
            marginBottom: "40px",
          }}
        >
          SETTINGS
        </h1>

        {/* ── MY POSTS (signed in only) ──────────────────────────────────── */}
        {isLoggedIn && (
          <section style={{ marginBottom: "40px" }}>
            <p style={SECTION_LABEL}>YOUR POSTS</p>
            <div style={{ borderTop: "1px solid #1A1A1A" }}>
              {/* Stats */}
              {meta && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 1,
                    marginTop: 16,
                    marginBottom: 16,
                    border: "1px solid #1A1A1A",
                  }}
                >
                  {[
                    { label: "POSTS", value: meta.count },
                    { label: "TOTAL SCORE", value: meta.totalScore },
                    { label: "AVG SCORE", value: meta.avgScore },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      style={{ padding: "12px", background: "#000", borderRight: "1px solid #1A1A1A" }}
                    >
                      <div style={{ ...MONO, color: "#888888", fontSize: "0.5rem", letterSpacing: "0.1em", marginBottom: 4 }}>
                        {label}
                      </div>
                      <div style={{ ...MONO, color: "#FFFFFF", fontSize: "1.125rem", fontWeight: 700 }}>
                        {value}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {postsLoading && (
                <p style={{ ...MONO, color: "#888888", fontSize: "0.6875rem", padding: "14px 0" }}>LOADING...</p>
              )}

              {!postsLoading && posts.length === 0 && (
                <div style={{ ...MONO, color: "#888888", fontSize: "0.6875rem", padding: "14px 0" }}>
                  No posts yet. <Link href="/" style={{ color: "#AAAAAA", textDecoration: "none" }}>START POSTING →</Link>
                </div>
              )}

              {!postsLoading && posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/post/${post.id}`}
                  style={{ textDecoration: "none", display: "block" }}
                >
                  <div
                    style={{
                      borderBottom: "1px solid #111111",
                      padding: "14px 0",
                    }}
                  >
                    {bestPost?.id === post.id && posts.length > 1 && (
                      <div style={{ ...MONO, color: "#888888", fontSize: "0.5rem", letterSpacing: "0.1em", marginBottom: 4 }}>
                        ★ BEST POST
                      </div>
                    )}
                    <p
                      style={{
                        ...MONO,
                        color: post.status === "active" ? "#CCCCCC" : "#555555",
                        fontSize: "0.8125rem",
                        lineHeight: 1.6,
                        marginBottom: 6,
                        wordBreak: "break-word",
                      }}
                    >
                      {post.content.length > 120 ? post.content.slice(0, 120) + "..." : post.content}
                    </p>
                    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                      <span style={{ ...MONO, color: "#888888", fontSize: "0.5625rem" }}>
                        {post.score >= 0 ? "+" : ""}{post.score}
                      </span>
                      <span style={{ ...MONO, color: "#555555", fontSize: "0.5625rem" }}>
                        {post.reply_count} {post.reply_count === 1 ? "reply" : "replies"}
                      </span>
                      <span style={{ ...MONO, color: "#555555", fontSize: "0.5625rem" }}>
                        {formatTimeAgo(post.created_at)}
                      </span>
                      {post.status !== "active" && (
                        <span style={{ ...MONO, color: "#EF4444", fontSize: "0.5rem", letterSpacing: "0.08em" }}>
                          {post.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── ACCOUNT ────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: "40px" }}>
          <p style={SECTION_LABEL}>ACCOUNT</p>
          <div style={{ borderTop: "1px solid #1A1A1A" }}>
            {isLoggedIn ? (
              <>
                {email && (
                  <div style={ROW}>
                    <span style={{ ...MONO, color: "#888888", fontSize: "0.8125rem", letterSpacing: "0.04em" }}>
                      {maskEmail(email)}
                    </span>
                  </div>
                )}
                {/* Notification preferences */}
                <div style={{ padding: "14px 0", borderBottom: "1px solid #1A1A1A" }}>
                  <div style={{ ...MONO, color: "#888888", fontSize: "0.5rem", letterSpacing: "0.1em", marginBottom: 12 }}>
                    NOTIFICATIONS
                  </div>
                  {(["replies", "trending"] as const).map((key) => {
                    const labels: Record<string, string> = {
                      replies: "Replies to my posts",
                      trending: "My post is trending",
                    };
                    return (
                      <label
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 10,
                          cursor: "pointer",
                        }}
                      >
                        <div
                          onClick={() => handlePrefsChange(key, !notifPrefs[key])}
                          style={{
                            width: 28,
                            height: 16,
                            border: `1px solid ${notifPrefs[key] ? "#FFFFFF" : "#333333"}`,
                            background: notifPrefs[key] ? "#FFFFFF" : "#000000",
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
                              background: notifPrefs[key] ? "#000000" : "#333333",
                              transition: "left 0.1s",
                            }}
                          />
                        </div>
                        <span style={{ ...MONO, color: "#AAAAAA", fontSize: "0.6875rem" }}>
                          {labels[key]}
                        </span>
                      </label>
                    );
                  })}
                  {savingPrefs && <p style={{ ...MONO, color: "#555555", fontSize: "0.5rem" }}>SAVING...</p>}
                  {prefsSaved && <p style={{ ...MONO, color: "#888888", fontSize: "0.5rem" }}>SAVED</p>}
                </div>
                <div style={ROW}>
                  <button
                    onClick={handleSignOut}
                    style={{
                      ...MONO,
                      background: "none",
                      border: "none",
                      color: "#888888",
                      fontSize: "0.75rem",
                      letterSpacing: "0.08em",
                      cursor: "pointer",
                      padding: 0,
                    }}
                    className="hover:text-[#FFFFFF] transition-colors"
                  >
                    SIGN OUT
                  </button>
                </div>
              </>
            ) : (
              <div style={ROW}>
                <Link href="/signin" style={LINK_STYLE} className="hover:text-[#AAAAAA] transition-colors">
                  SIGN IN
                </Link>
                <span style={{ color: "#333333", fontSize: "0.75rem" }}>→</span>
              </div>
            )}
          </div>
        </section>

        {/* ── LEGAL & INFO ───────────────────────────────────────────────── */}
        <section style={{ marginBottom: "40px" }}>
          <p style={SECTION_LABEL}>LEGAL &amp; INFO</p>
          <div style={{ borderTop: "1px solid #1A1A1A" }}>
            {[
              { href: "/constitution", label: "CONSTITUTION" },
              { href: "/transparency", label: "TRANSPARENCY" },
              { href: "/terms", label: "TERMS OF SERVICE" },
              { href: "/privacy", label: "PRIVACY POLICY" },
            ].map(({ href, label }) => (
              <div key={href} style={ROW}>
                <Link href={href} style={LINK_STYLE} className="hover:text-[#AAAAAA] transition-colors">
                  {label}
                </Link>
                <span style={{ color: "#333333", fontSize: "0.75rem" }}>→</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── BLOCKED USERS ──────────────────────────────────────────────── */}
        <section style={{ marginBottom: "40px" }}>
          <p style={SECTION_LABEL}>BLOCKED USERS</p>
          <div style={{ borderTop: "1px solid #1A1A1A", paddingTop: "16px" }}>
            <BlockedUsersPanel />
          </div>
        </section>

        {/* ── SUPPORT ────────────────────────────────────────────────────── */}
        <section style={{ marginBottom: "40px" }}>
          <p style={SECTION_LABEL}>SUPPORT</p>
          <div style={{ borderTop: "1px solid #1A1A1A" }}>
            <div style={ROW}>
              <a href="mailto:support@jawwing.com" style={LINK_STYLE} className="hover:text-[#AAAAAA] transition-colors">
                support@jawwing.com
              </a>
            </div>
          </div>
        </section>

        {/* Footer */}
        <p style={{ ...MONO, color: "#333333", fontSize: "0.5625rem", letterSpacing: "0.08em", marginTop: "48px" }}>
          JAWWING · 2026
        </p>
      </main>
    </div>
  );
}
