"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getModActions, type Post, type ModAction } from "@/lib/api";
import { getToken } from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

function formatDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).toUpperCase();
}

interface UserPost {
  id: string;
  content: string;
  score: number;
  reply_count: number;
  created_at: number;
  status: string;
}

function ProfileContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [posts, setPosts] = useState<UserPost[]>([]);
  const [modActions, setModActions] = useState<ModAction[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [joinedAt, setJoinedAt] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        // Fetch user posts via /api/v1/posts/mine if it exists, else skip
        const token = getToken();
        const res = await fetch("/api/v1/posts/mine", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          setPosts(data.posts ?? []);
        }
      } catch {
        // Endpoint may not exist yet — fail silently
      } finally {
        setLoadingPosts(false);
      }

      // Fetch mod actions for this user's posts
      try {
        if (user) {
          const data = await getModActions({ limit: 20 });
          setModActions(data.actions ?? []);
        }
      } catch {
        // best-effort
      }

      // Try to get join date from /api/auth/me
      try {
        const token = getToken();
        const res = await fetch("/api/auth/me", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok) {
          const data = await res.json();
          if (data.user?.created_at) setJoinedAt(data.user.created_at);
        }
      } catch {
        // best-effort
      }
    }

    load();
  }, [user]);

  const handleDeleteAccount = () => {
    // Future: call DELETE /api/v1/users/me
    alert("DELETE ACCOUNT - Not yet implemented.");
    setShowDeleteConfirm(false);
  };

  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      {/* Header */}
      <header
        style={{
          background: "#000000",
          borderBottom: "1px solid #1F1F1F",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        <div
          style={{ maxWidth: "480px" }}
          className="mx-auto flex items-center justify-between px-4 py-3"
        >
          <button
            onClick={() => router.push("/")}
            style={{
              ...MONO,
              background: "none",
              border: "none",
              color: "#777777",
              fontSize: "0.75rem",
              letterSpacing: "0.06em",
              cursor: "pointer",
              padding: 0,
            }}
          >
            ← FEED
          </button>
          <span
            style={{
              ...MONO,
              color: "#FFFFFF",
              fontSize: "0.75rem",
              letterSpacing: "0.12em",
              fontWeight: 700,
            }}
          >
            PROFILE
          </span>
          <button
            onClick={logout}
            style={{
              ...MONO,
              background: "none",
              border: "none",
              color: "#777777",
              fontSize: "0.75rem",
              letterSpacing: "0.06em",
              cursor: "pointer",
              padding: 0,
            }}
          >
            SIGN OUT
          </button>
        </div>
      </header>

      <main style={{ maxWidth: "480px", margin: "0 auto", padding: "0" }}>
        {/* Identity block */}
        <div
          style={{
            background: "#0A0A0A",
            border: "1px solid #1F1F1F",
            margin: "16px",
            padding: "20px",
          }}
        >
          <p style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.1em", marginBottom: "6px" }}>
            DISPLAY NAME
          </p>
          <p style={{ ...MONO, color: "#FFFFFF", fontSize: "1.25rem", fontWeight: 700, letterSpacing: "0.06em", marginBottom: "16px" }}>
            {user?.displayName.toUpperCase()}
          </p>

          <div style={{ display: "flex", gap: "24px" }}>
            <div>
              <p style={{ ...MONO, color: "#333333", fontSize: "0.5625rem", letterSpacing: "0.1em", marginBottom: "2px" }}>
                ACCOUNT TYPE
              </p>
              <p style={{ ...MONO, color: "#C0C0C0", fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                {(user?.type ?? "HUMAN").toUpperCase()}
              </p>
            </div>
            {joinedAt && (
              <div>
                <p style={{ ...MONO, color: "#333333", fontSize: "0.5625rem", letterSpacing: "0.1em", marginBottom: "2px" }}>
                  JOINED
                </p>
                <p style={{ ...MONO, color: "#C0C0C0", fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                  {formatDate(joinedAt)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Posts section */}
        <div style={{ padding: "0 16px", marginBottom: "8px" }}>
          <p style={{ ...MONO, color: "#777777", fontSize: "0.625rem", letterSpacing: "0.1em", marginBottom: "8px" }}>
            YOUR POSTS
          </p>

          {loadingPosts && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {[...Array(3)].map((_, i) => (
                <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", padding: "14px", height: "72px" }}>
                  <div style={{ background: "#1A1A1A", height: "10px", width: `${60 + i * 10}%`, marginBottom: "8px" }} />
                  <div style={{ background: "#1A1A1A", height: "10px", width: "80%" }} />
                </div>
              ))}
            </div>
          )}

          {!loadingPosts && posts.length === 0 && (
            <div
              style={{
                background: "#0A0A0A",
                border: "1px solid #1F1F1F",
                padding: "32px 16px",
                textAlign: "center",
              }}
            >
              <p style={{ ...MONO, color: "#333333", fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                NO POSTS YET
              </p>
            </div>
          )}

          {!loadingPosts && posts.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {posts.map((post) => (
                <div
                  key={post.id}
                  onClick={() => router.push(`/post/${post.id}`)}
                  style={{
                    background: "#0A0A0A",
                    border: "1px solid #1F1F1F",
                    padding: "14px 16px",
                    cursor: "pointer",
                  }}
                >
                  <p style={{ color: "#FFFFFF", fontSize: "0.875rem", marginBottom: "8px", lineHeight: 1.5 }}>
                    {post.content.length > 120 ? post.content.slice(0, 120) + "…" : post.content}
                  </p>
                  <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                    <span style={{ ...MONO, color: "#777777", fontSize: "0.625rem", letterSpacing: "0.06em" }}>
                      ↑ {post.score}
                    </span>
                    <span style={{ ...MONO, color: "#777777", fontSize: "0.625rem", letterSpacing: "0.06em" }}>
                      {post.reply_count} REPLIES
                    </span>
                    {post.status !== "active" && (
                      <span style={{ ...MONO, color: "#FF3333", fontSize: "0.625rem", letterSpacing: "0.08em" }}>
                        {post.status.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mod actions section */}
        {modActions.length > 0 && (
          <div style={{ padding: "16px 16px", marginBottom: "8px" }}>
            <p style={{ ...MONO, color: "#777777", fontSize: "0.625rem", letterSpacing: "0.1em", marginBottom: "8px" }}>
              MOD ACTIONS ON YOUR POSTS
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
              {modActions.map((action) => (
                <div
                  key={action.id}
                  style={{
                    background: "#0A0A0A",
                    border: "1px solid #1F1F1F",
                    borderLeft: `2px solid ${action.action === "removed" ? "#FF3333" : action.action === "approved" ? "#FFFFFF" : "#777777"}`,
                    padding: "12px 14px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ ...MONO, color: "#C0C0C0", fontSize: "0.625rem", letterSpacing: "0.08em" }}>
                      {action.action.toUpperCase()}
                    </span>
                    <span style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.06em" }}>
                      {Math.round(action.confidence * 100)}% CONFIDENCE
                    </span>
                  </div>
                  {action.post_excerpt && (
                    <p style={{ color: "#777777", fontSize: "0.75rem", marginBottom: "6px", fontStyle: "italic" }}>
                      "{action.post_excerpt}"
                    </p>
                  )}
                  <p style={{ ...MONO, color: "#777777", fontSize: "0.625rem", letterSpacing: "0.04em" }}>
                    {action.rule_cited}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Danger zone */}
        <div style={{ padding: "16px", marginBottom: "40px" }}>
          <p style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.1em", marginBottom: "8px" }}>
            DANGER ZONE
          </p>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                ...MONO,
                background: "transparent",
                color: "#FF3333",
                border: "1px solid #FF3333",
                padding: "10px 20px",
                fontSize: "0.75rem",
                letterSpacing: "0.08em",
                fontWeight: 600,
                cursor: "pointer",
                width: "100%",
              }}
            >
              DELETE ACCOUNT
            </button>
          ) : (
            <div
              style={{
                background: "#0A0A0A",
                border: "1px solid #FF3333",
                padding: "16px",
              }}
            >
              <p style={{ ...MONO, color: "#FF3333", fontSize: "0.75rem", letterSpacing: "0.06em", marginBottom: "12px" }}>
                ARE YOU SURE? THIS CANNOT BE UNDONE.
              </p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleDeleteAccount}
                  style={{
                    ...MONO,
                    flex: 1,
                    background: "#FF3333",
                    color: "#000000",
                    border: "none",
                    padding: "10px",
                    fontSize: "0.75rem",
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  DELETE
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    ...MONO,
                    flex: 1,
                    background: "transparent",
                    color: "#777777",
                    border: "1px solid #333333",
                    padding: "10px",
                    fontSize: "0.75rem",
                    letterSpacing: "0.08em",
                    cursor: "pointer",
                  }}
                >
                  CANCEL
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  );
}
