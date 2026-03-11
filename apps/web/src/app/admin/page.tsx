"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardStats {
  total_accounts: number;
  accounts_today: number;
  accounts_active_24h: number;
  total_posts: number;
  posts_today: number;
  replies_today: number;
  votes_today: number;
}

interface TrendingPost {
  id: string;
  content: string;
  score: number;
  upvotes: number;
  downvotes: number;
  reply_count: number;
  created_at: number;
  status: string;
}

interface DashboardData {
  stats: DashboardStats;
  trending_posts: TrendingPost[];
  trending_h3: Array<{ h3_index: string; post_count: number }>;
}

interface User {
  id: string;
  email: string;
  is_admin: number;
  created_at: number;
  last_seen_at: number;
  post_count: number;
  session_count: number;
}

interface Post {
  id: string;
  content: string;
  score: number;
  upvotes: number;
  downvotes: number;
  reply_count: number;
  status: string;
  created_at: number;
  h3_index: string;
  mod_confidence: number | null;
  account_id: string | null;
}

interface Report {
  id: string;
  post_id: string;
  reason: string;
  reporter_hash: string;
  created_at: number;
  resolved: number;
  post_content: string;
  post_status: string;
  score: number;
}

interface ActivityPoint {
  hour: number;
  posts: number;
  votes: number;
  replies: number;
}

type Tab = "dashboard" | "users" | "posts" | "reports";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(ts: number): string {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString();
}

function fmtShort(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString();
}

async function adminFetch(path: string, opts?: RequestInit) {
  return fetch(path, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts?.headers },
    credentials: "include",
  });
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      border: "1px solid #333",
      padding: "20px 24px",
      background: "#0A0A0A",
      minWidth: 150,
      flex: 1,
    }}>
      <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ color: "#FFF", fontSize: 28, fontWeight: 700, fontFamily: "monospace" }}>
        {value}
      </div>
      {sub && <div style={{ color: "#555", fontSize: 11, marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ─── Activity Chart ───────────────────────────────────────────────────────────

function ActivityChart({ data }: { data: ActivityPoint[] }) {
  const maxVal = Math.max(...data.map(d => d.posts + d.votes + d.replies), 1);
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
        Activity — Last 5d
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 80, border: "1px solid #1F1F1F", padding: "8px 8px 0" }}>
        {data.map((d, i) => {
          const total = d.posts + d.votes + d.replies;
          const h = Math.round((total / maxVal) * 64);
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }} title={`${new Date(d.hour * 1000).toLocaleTimeString()}: ${d.posts}p ${d.votes}v ${d.replies}r`}>
              <div style={{ width: "100%", background: "#FFF", height: h || 1, opacity: 0.7 }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: "#555", fontSize: 9 }}>
        <span>5d ago</span><span>now</span>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const [authState, setAuthState] = useState<"loading" | "denied" | "ok">("loading");
  const [tab, setTab] = useState<Tab>("dashboard");

  // Dashboard
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [activity, setActivity] = useState<ActivityPoint[]>([]);

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<Record<string, unknown> | null>(null);

  // Posts
  const [posts, setPosts] = useState<Post[]>([]);
  const [postSearch, setPostSearch] = useState("");
  const [postStatus, setPostStatus] = useState("");
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Reports
  const [reports, setReports] = useState<Report[]>([]);

  // Auth check
  useEffect(() => {
    adminFetch("/api/v1/admin/dashboard")
      .then(r => {
        if (r.status === 403) { setAuthState("denied"); return null; }
        if (r.status === 401) { window.location.href = "/signin"; return null; }
        return r.json();
      })
      .then(data => {
        if (data) {
          setDashboard(data);
          setAuthState("ok");
        }
      })
      .catch(() => setAuthState("denied"));
  }, []);

  const loadActivity = useCallback(() => {
    adminFetch("/api/v1/admin/stats/activity")
      .then(r => r.json())
      .then(d => setActivity(d.activity ?? []));
  }, []);

  const loadUsers = useCallback(() => {
    adminFetch(`/api/v1/admin/users?limit=100&search=${encodeURIComponent(userSearch)}`)
      .then(r => r.json())
      .then(d => setUsers(d.users ?? []));
  }, [userSearch]);

  const loadPosts = useCallback(() => {
    const params = new URLSearchParams({ limit: "100", search: postSearch });
    if (postStatus) params.set("status", postStatus);
    adminFetch(`/api/v1/admin/posts?${params}`)
      .then(r => r.json())
      .then(d => setPosts(d.posts ?? []));
  }, [postSearch, postStatus]);

  const loadReports = useCallback(() => {
    adminFetch("/api/v1/admin/reports")
      .then(r => r.json())
      .then(d => setReports(d.reports ?? []));
  }, []);

  useEffect(() => {
    if (authState !== "ok") return;
    if (tab === "dashboard") loadActivity();
    if (tab === "users") loadUsers();
    if (tab === "posts") loadPosts();
    if (tab === "reports") loadReports();
  }, [tab, authState, loadActivity, loadUsers, loadPosts, loadReports]);

  const banUser = async (userId: string, ban: boolean) => {
    await adminFetch(`/api/v1/admin/users/${userId}/ban`, { method: ban ? "POST" : "DELETE" });
    loadUsers();
  };

  const removePost = async (postId: string) => {
    await adminFetch(`/api/v1/admin/posts/${postId}/remove`, { method: "POST" });
    setSelectedPost(null);
    loadPosts();
  };

  const restorePost = async (postId: string) => {
    await adminFetch(`/api/v1/admin/posts/${postId}/restore`, { method: "POST" });
    setSelectedPost(null);
    loadPosts();
  };

  const resolveReport = async (reportId: string) => {
    await adminFetch("/api/v1/admin/reports", { method: "POST", body: JSON.stringify({ report_id: reportId }) });
    loadReports();
  };

  const viewUser = async (userId: string) => {
    const r = await adminFetch(`/api/v1/admin/users/${userId}`);
    const d = await r.json();
    setSelectedUser(d);
  };

  // ── Styles ──

  const sidebarStyle: React.CSSProperties = {
    width: 200,
    background: "#0A0A0A",
    borderRight: "1px solid #1F1F1F",
    display: "flex",
    flexDirection: "column",
    padding: "24px 0",
    flexShrink: 0,
    minHeight: "100vh",
  };

  const mainStyle: React.CSSProperties = {
    flex: 1,
    background: "#000",
    padding: "32px 40px",
    minHeight: "100vh",
    overflow: "auto",
  };

  const tableStyle: React.CSSProperties = {
    width: "100%",
    borderCollapse: "collapse",
    fontFamily: "monospace",
    fontSize: 12,
  };

  const thStyle: React.CSSProperties = {
    textAlign: "left",
    padding: "8px 12px",
    color: "#888",
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    borderBottom: "1px solid #1F1F1F",
    background: "#0A0A0A",
  };

  const tdStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderBottom: "1px solid #111",
    color: "#CCC",
    verticalAlign: "top",
  };

  const inputStyle: React.CSSProperties = {
    background: "#0A0A0A",
    border: "1px solid #333",
    color: "#FFF",
    padding: "8px 12px",
    fontFamily: "monospace",
    fontSize: 13,
    outline: "none",
    width: 260,
  };

  const btnStyle = (variant: "danger" | "success" | "neutral" = "neutral"): React.CSSProperties => ({
    background: variant === "danger" ? "#300" : variant === "success" ? "#030" : "#111",
    border: `1px solid ${variant === "danger" ? "#F33" : variant === "success" ? "#3F3" : "#333"}`,
    color: variant === "danger" ? "#F66" : variant === "success" ? "#6F6" : "#AAA",
    padding: "4px 10px",
    cursor: "pointer",
    fontFamily: "monospace",
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    borderRadius: 0,
  });

  if (authState === "loading") {
    return (
      <div style={{ background: "#000", color: "#FFF", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace" }}>
        LOADING...
      </div>
    );
  }

  if (authState === "denied") {
    return (
      <div style={{ background: "#000", color: "#F33", height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "monospace", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 48, fontWeight: 700 }}>ACCESS DENIED</div>
        <div style={{ color: "#666", fontSize: 14 }}>You are not authorized to view this page.</div>
        <Link href="/" style={{ color: "#AAA", fontSize: 12, marginTop: 16 }}>← Back to Feed</Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "monospace", background: "#000" }}>
      {/* Sidebar */}
      <div style={sidebarStyle}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #1F1F1F", marginBottom: 8 }}>
          <div style={{ color: "#FFF", fontSize: 12, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" }}>
            JAWWING
          </div>
          <div style={{ color: "#555", fontSize: 10, letterSpacing: 2, textTransform: "uppercase" }}>
            ADMIN
          </div>
        </div>
        {(["dashboard", "users", "posts", "reports"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: "none",
              border: "none",
              borderLeft: tab === t ? "3px solid #FFF" : "3px solid transparent",
              color: tab === t ? "#FFF" : "#555",
              padding: "10px 20px",
              cursor: "pointer",
              textAlign: "left",
              fontFamily: "monospace",
              fontSize: 11,
              letterSpacing: 2,
              textTransform: "uppercase",
              width: "100%",
            }}
          >
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <Link href="/" style={{
          color: "#444",
          padding: "10px 20px",
          fontSize: 11,
          letterSpacing: 1,
          textTransform: "uppercase",
          textDecoration: "none",
          borderTop: "1px solid #1F1F1F",
          display: "block",
        }}>
          ← Back to Feed
        </Link>
      </div>

      {/* Main content */}
      <div style={mainStyle}>
        {/* DASHBOARD TAB */}
        {tab === "dashboard" && dashboard && (
          <>
            <h1 style={{ color: "#FFF", fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", marginBottom: 32, margin: "0 0 32px" }}>
              Dashboard
            </h1>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 40 }}>
              {dashboard?.stats ? (
                <>
                  <StatCard label="Total Users" value={dashboard.stats.total_accounts} sub={`+${dashboard.stats.accounts_today} today`} />
                  <StatCard label="Active 24h" value={dashboard.stats.accounts_active_24h} />
                  <StatCard label="Posts Today" value={dashboard.stats.posts_today} sub={`${dashboard.stats.total_posts} total`} />
                  <StatCard label="Pending" value={dashboard.stats.pending_posts ?? 0} />
                  <StatCard label="Votes Today" value={dashboard.stats.votes_today} />
                  <StatCard label="Replies Today" value={dashboard.stats.replies_today} />
                </>
              ) : (
                <div style={{ color: "#555", fontSize: 12 }}>LOADING STATS...</div>
              )}
            </div>

            {/* Moderation Pipeline */}
            {dashboard?.moderation && (
              <div style={{ marginTop: 24, marginBottom: 24, padding: "16px", border: "1px solid #1F1F1F", background: "#0A0A0A" }}>
                <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>
                  MODERATION PIPELINE
                </div>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                  <StatCard label="Awaiting Mod" value={dashboard.moderation.awaiting_moderation}
                    sub={dashboard.moderation.awaiting_moderation > 0 ? "⚠ QUEUE NOT EMPTY" : "Queue clear"} />
                  <StatCard label="Flagged" value={dashboard.moderation.flagged_for_review} sub="Needs review" />
                  <StatCard label="Removed" value={dashboard.moderation.removed} sub="By AI mod" />
                  <StatCard label="Mod Failed" value={dashboard.moderation.mod_failed} sub="3x retry failed" />
                  <StatCard label="Open Reports" value={dashboard.moderation.open_reports} sub="User reports" />
                  <StatCard label="Mod Actions Today" value={dashboard.moderation.mod_actions_today} />
                </div>
              </div>
            )}

            {activity.length > 0 && <ActivityChart data={activity} />}

            <div style={{ marginTop: 40 }}>
              <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
                Trending Posts — Last 24h
              </div>
              <table style={tableStyle}>
                <thead>
                  <tr>
                    <th style={thStyle}>Content</th>
                    <th style={thStyle}>Score</th>
                    <th style={thStyle}>Replies</th>
                    <th style={thStyle}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard?.trending_posts?.map(p => (
                    <tr key={p.id} onClick={() => { setTab("posts"); setSelectedPost(p as unknown as Post); }} style={{ cursor: "pointer" }}>
                      <td style={tdStyle}>{p.content}</td>
                      <td style={{ ...tdStyle, color: p.score > 0 ? "#6F6" : p.score < 0 ? "#F66" : "#CCC" }}>{p.score > 0 ? "+" : ""}{p.score}</td>
                      <td style={tdStyle}>{p.reply_count}</td>
                      <td style={{ ...tdStyle, color: p.status === "active" ? "#6F6" : "#F66" }}>{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {dashboard?.trending_h3?.length > 0 && (
              <div style={{ marginTop: 40 }}>
                <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, textTransform: "uppercase", marginBottom: 16 }}>
                  Hot Zones — Last 24h
                </div>
                {dashboard?.trending_h3?.map((h, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 8 }}>
                    <div style={{ color: "#555", fontSize: 11, width: 200, fontFamily: "monospace" }}>{String(h.h3_index)}</div>
                    <div style={{ flex: 1, background: "#1F1F1F", height: 8 }}>
                      <div style={{ width: `${Math.min(Number(h.post_count) * 10, 100)}%`, height: "100%", background: "#FFF" }} />
                    </div>
                    <div style={{ color: "#FFF", fontSize: 12, width: 30, textAlign: "right" }}>{Number(h.post_count)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* USERS TAB */}
        {tab === "users" && (
          <>
            <h1 style={{ color: "#FFF", fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 24px" }}>
              Users
            </h1>
            <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
              <input
                style={inputStyle}
                placeholder="Search by email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadUsers()}
              />
              <button style={btnStyle()} onClick={loadUsers}>Search</button>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ flex: 1, overflow: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Email</th>
                      <th style={thStyle}>Joined</th>
                      <th style={thStyle}>Last Active</th>
                      <th style={thStyle}>Posts</th>
                      <th style={thStyle}>Sessions</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr
                        key={u.id}
                        style={{ cursor: "pointer", background: selectedUser && (selectedUser as {id: string}).id === u.id ? "#111" : "transparent" }}
                        onClick={() => viewUser(u.id)}
                      >
                        <td style={tdStyle}>
                          {u.email}
                          {u.is_admin ? <span style={{ color: "#FF0", fontSize: 9, marginLeft: 6, letterSpacing: 1 }}>ADMIN</span> : null}
                        </td>
                        <td style={tdStyle}>{fmtShort(u.created_at)}</td>
                        <td style={tdStyle}>{fmtShort(u.last_seen_at)}</td>
                        <td style={tdStyle}>{u.post_count}</td>
                        <td style={tdStyle}>{u.session_count}</td>
                        <td style={tdStyle}>
                          <button style={btnStyle("danger")} onClick={e => { e.stopPropagation(); banUser(u.id, true); }}>Ban</button>
                          {" "}
                          <button style={btnStyle("success")} onClick={e => { e.stopPropagation(); banUser(u.id, false); }}>Unban</button>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr><td colSpan={6} style={{ ...tdStyle, color: "#555", textAlign: "center", padding: 32 }}>No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {selectedUser && (
                <div style={{ width: 340, border: "1px solid #333", padding: 20, background: "#0A0A0A", flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ color: "#FFF", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>User Detail</div>
                    <button style={{ ...btnStyle(), padding: "2px 8px" }} onClick={() => setSelectedUser(null)}>✕</button>
                  </div>
                  <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>EMAIL</div>
                  <div style={{ color: "#FFF", fontSize: 13, marginBottom: 16, wordBreak: "break-all" }}>{selectedUser.email as string}</div>
                  <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>JOINED</div>
                  <div style={{ color: "#CCC", fontSize: 12, marginBottom: 12 }}>{fmt(selectedUser.created_at as number)}</div>
                  <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>LAST ACTIVE</div>
                  <div style={{ color: "#CCC", fontSize: 12, marginBottom: 12 }}>{fmt(selectedUser.last_seen_at as number)}</div>
                  <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>POSTS ({selectedUser.post_count as number})</div>
                  <div style={{ maxHeight: 200, overflowY: "auto" }}>
                    {((selectedUser.posts as Post[]) ?? []).map((p: Post) => (
                      <div key={p.id} style={{ fontSize: 11, color: "#AAA", padding: "6px 0", borderBottom: "1px solid #1F1F1F" }}>
                        <span style={{ color: p.status === "active" ? "#6F6" : "#F66" }}>[{p.status}]</span>{" "}
                        {p.content?.slice(0, 60)}...
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* POSTS TAB */}
        {tab === "posts" && (
          <>
            <h1 style={{ color: "#FFF", fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 24px" }}>
              Posts
            </h1>
            <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
              <input
                style={inputStyle}
                placeholder="Search content..."
                value={postSearch}
                onChange={e => setPostSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && loadPosts()}
              />
              <select
                value={postStatus}
                onChange={e => setPostStatus(e.target.value)}
                style={{ ...inputStyle, width: "auto" }}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="flagged">Flagged</option>
                <option value="removed">Removed</option>
              </select>
              <button style={btnStyle()} onClick={loadPosts}>Filter</button>
            </div>
            <div style={{ display: "flex", gap: 24 }}>
              <div style={{ flex: 1, overflow: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={thStyle}>Content</th>
                      <th style={thStyle}>Score</th>
                      <th style={thStyle}>Status</th>
                      <th style={thStyle}>Mod %</th>
                      <th style={thStyle}>Date</th>
                      <th style={thStyle}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map(p => (
                      <tr
                        key={p.id}
                        style={{ cursor: "pointer", background: selectedPost?.id === p.id ? "#111" : "transparent" }}
                        onClick={() => setSelectedPost(p)}
                      >
                        <td style={{ ...tdStyle, maxWidth: 300 }}>{(p.content ?? "").slice(0, 80)}{(p.content ?? "").length > 80 ? "…" : ""}</td>
                        <td style={{ ...tdStyle, color: p.score > 0 ? "#6F6" : p.score < 0 ? "#F66" : "#CCC" }}>
                          {p.score > 0 ? "+" : ""}{p.score}
                        </td>
                        <td style={{ ...tdStyle, color: p.status === "active" ? "#6F6" : p.status === "removed" ? "#F66" : "#FA0" }}>
                          {p.status}
                        </td>
                        <td style={{ ...tdStyle, color: p.mod_confidence && p.mod_confidence > 0.7 ? "#F66" : "#888" }}>
                          {p.mod_confidence != null ? `${Math.round(p.mod_confidence * 100)}%` : "—"}
                        </td>
                        <td style={tdStyle}>{fmtShort(p.created_at)}</td>
                        <td style={tdStyle} onClick={e => e.stopPropagation()}>
                          {p.status !== "removed" ? (
                            <button style={btnStyle("danger")} onClick={() => removePost(p.id)}>Remove</button>
                          ) : (
                            <button style={btnStyle("success")} onClick={() => restorePost(p.id)}>Restore</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {posts.length === 0 && (
                      <tr><td colSpan={6} style={{ ...tdStyle, color: "#555", textAlign: "center", padding: 32 }}>No posts found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {selectedPost && (
                <div style={{ width: 340, border: "1px solid #333", padding: 20, background: "#0A0A0A", flexShrink: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                    <div style={{ color: "#FFF", fontSize: 12, letterSpacing: 2, textTransform: "uppercase" }}>Post Detail</div>
                    <button style={{ ...btnStyle(), padding: "2px 8px" }} onClick={() => setSelectedPost(null)}>✕</button>
                  </div>
                  <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>ID</div>
                  <div style={{ color: "#555", fontSize: 11, marginBottom: 12, fontFamily: "monospace" }}>{selectedPost.id}</div>
                  <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>CONTENT</div>
                  <div style={{ color: "#FFF", fontSize: 13, marginBottom: 16, lineHeight: 1.5 }}>{selectedPost.content}</div>
                  <div style={{ display: "flex", gap: 12, marginBottom: 16, fontSize: 11 }}>
                    <div><span style={{ color: "#888" }}>↑</span> {selectedPost.upvotes}</div>
                    <div><span style={{ color: "#888" }}>↓</span> {selectedPost.downvotes}</div>
                    <div><span style={{ color: "#888" }}>💬</span> {selectedPost.reply_count}</div>
                  </div>
                  <div style={{ color: "#888", fontSize: 10, marginBottom: 4 }}>STATUS</div>
                  <div style={{ color: selectedPost.status === "active" ? "#6F6" : "#F66", fontSize: 12, marginBottom: 16, textTransform: "uppercase" }}>
                    {selectedPost.status}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {selectedPost.status !== "removed" ? (
                      <button style={btnStyle("danger")} onClick={() => removePost(selectedPost.id)}>Remove Post</button>
                    ) : (
                      <button style={btnStyle("success")} onClick={() => restorePost(selectedPost.id)}>Restore Post</button>
                    )}
                    <Link href={`/post/${selectedPost.id}`} target="_blank" style={{ ...btnStyle(), textDecoration: "none" }}>
                      View →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* REPORTS TAB */}
        {tab === "reports" && (
          <>
            <h1 style={{ color: "#FFF", fontSize: 18, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", margin: "0 0 24px" }}>
              Reports
            </h1>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={thStyle}>Post Content</th>
                  <th style={thStyle}>Reason</th>
                  <th style={thStyle}>Reporter</th>
                  <th style={thStyle}>Post Status</th>
                  <th style={thStyle}>Date</th>
                  <th style={thStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reports.map(r => (
                  <tr key={r.id}>
                    <td style={{ ...tdStyle, maxWidth: 280 }}>{(r.post_content ?? "").slice(0, 80)}{(r.post_content ?? "").length > 80 ? "…" : ""}</td>
                    <td style={tdStyle}>{r.reason}</td>
                    <td style={{ ...tdStyle, color: "#555", fontSize: 10 }}>{(r.reporter_hash ?? "").slice(0, 8)}…</td>
                    <td style={{ ...tdStyle, color: r.post_status === "active" ? "#6F6" : "#F66" }}>{r.post_status}</td>
                    <td style={tdStyle}>{fmtShort(r.created_at)}</td>
                    <td style={tdStyle}>
                      <button style={btnStyle("success")} onClick={() => resolveReport(r.id)}>Resolve</button>
                      {" "}
                      {r.post_id && r.post_status === "active" && (
                        <button style={btnStyle("danger")} onClick={() => removePost(r.post_id)}>Remove Post</button>
                      )}
                    </td>
                  </tr>
                ))}
                {reports.length === 0 && (
                  <tr><td colSpan={6} style={{ ...tdStyle, color: "#555", textAlign: "center", padding: 32 }}>No unresolved reports</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}
