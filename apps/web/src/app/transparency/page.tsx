"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

interface ModAction {
  id: string;
  post_id: string;
  action: string;
  rule_cited: string | null;
  reasoning: string;
  post_excerpt: string | null;
  agent: string;
  created_at: number;
}

interface Stats {
  total?: number;
  approve?: number;
  remove?: number;
  flag?: number;
  warn?: number;
}

function timeAgo(unix: number): string {
  const diff = Math.floor(Date.now() / 1000) - unix;
  if (diff < 60) return "JUST NOW";
  if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
  return `${Math.floor(diff / 86400)}D AGO`;
}

const ACTION_STYLE: Record<string, { color: string; label: string; icon: string }> = {
  approve: { color: "#22C55E", label: "APPROVED", icon: "✓" },
  remove: { color: "#FF3333", label: "REMOVED", icon: "✗" },
  flag: { color: "#EAB308", label: "FLAGGED", icon: "⚠" },
  warn: { color: "#EAB308", label: "WARNED", icon: "⚠" },
};

export default function TransparencyPage() {
  const [actions, setActions] = useState<ModAction[]>([]);
  const [stats, setStats] = useState<Stats>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string | null>(null);

  const fetchActions = async (actionFilter?: string | null) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (actionFilter) params.set("action", actionFilter);
      const res = await fetch(`/api/v1/mod/actions?${params}`);
      const data = await res.json();
      setActions(data.actions || []);
      setStats(data.stats || {});
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchActions(filter); }, [filter]);

  const approvalRate = stats.total && stats.total > 0
    ? Math.round(((stats.approve || 0) / stats.total) * 100)
    : 0;

  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      <main style={{ maxWidth: "680px" }} className="mx-auto px-4 py-16">
        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF", marginBottom: "12px" }}>
            MODERATION TRANSPARENCY
          </h1>
          <p style={{ color: "#888888", fontSize: "0.875rem", lineHeight: 1.6 }}>
            Every post on Jawwing is reviewed by AI before it appears in the feed. No human moderators. 
            Every decision is logged here with full reasoning.
          </p>
        </div>

        {/* Stats grid */}
        {!loading && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1px", background: "#222", border: "1px solid #222", marginBottom: "32px" }}>
            {[
              { label: "TOTAL REVIEWS", value: stats.total || 0, color: "#FFFFFF" },
              { label: "APPROVED", value: stats.approve || 0, color: "#22C55E" },
              { label: "REMOVED", value: stats.remove || 0, color: "#FF3333" },
              { label: "APPROVAL RATE", value: `${approvalRate}%`, color: "#FFFFFF" },
            ].map((s) => (
              <div key={s.label} style={{ background: "#000", padding: "20px", textAlign: "center" }}>
                <div style={{ ...MONO, fontSize: "1.5rem", fontWeight: 700, color: s.color }}>
                  {s.value}
                </div>
                <div style={{ ...MONO, color: "#555", fontSize: "0.5625rem", letterSpacing: "0.1em", marginTop: "4px" }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AI model info */}
        <div style={{ border: "1px solid #222", padding: "16px 20px", marginBottom: "32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <div style={{ ...MONO, color: "#555", fontSize: "0.5625rem", letterSpacing: "0.1em", marginBottom: "4px" }}>AI MODERATOR</div>
            <div style={{ ...MONO, color: "#FFFFFF", fontSize: "0.8125rem" }}>ANTHROPIC CLAUDE HAIKU 4.5</div>
          </div>
          <div>
            <div style={{ ...MONO, color: "#555", fontSize: "0.5625rem", letterSpacing: "0.1em", marginBottom: "4px" }}>GOVERNED BY</div>
            <Link href="/constitution" style={{ ...MONO, color: "#FFFFFF", fontSize: "0.8125rem", textDecoration: "underline", textUnderlineOffset: "3px" }}>
              8-ARTICLE CONSTITUTION
            </Link>
          </div>
          <div>
            <div style={{ ...MONO, color: "#555", fontSize: "0.5625rem", letterSpacing: "0.1em", marginBottom: "4px" }}>HUMAN MODERATORS</div>
            <div style={{ ...MONO, color: "#FFFFFF", fontSize: "0.8125rem" }}>ZERO</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: "0", borderBottom: "1px solid #222", marginBottom: "0" }}>
          {[
            { key: null, label: "ALL" },
            { key: "approve", label: "APPROVED" },
            { key: "remove", label: "REMOVED" },
            { key: "flag", label: "FLAGGED" },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => setFilter(tab.key)}
              style={{
                ...MONO,
                background: "none",
                border: "none",
                borderBottom: filter === tab.key ? "2px solid #FFFFFF" : "2px solid transparent",
                color: filter === tab.key ? "#FFFFFF" : "#555",
                fontSize: "0.6875rem",
                letterSpacing: "0.08em",
                padding: "12px 20px",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Actions list */}
        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ ...MONO, color: "#333", fontSize: "0.75rem", letterSpacing: "0.08em" }}>LOADING...</div>
          </div>
        ) : actions.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ ...MONO, color: "#333", fontSize: "0.75rem", letterSpacing: "0.08em" }}>NO ACTIONS FOUND</div>
          </div>
        ) : (
          <div>
            {actions.map((action) => {
              const style = ACTION_STYLE[action.action] || ACTION_STYLE.approve;
              return (
                <div
                  key={action.id}
                  style={{
                    borderBottom: "1px solid #111",
                    padding: "20px 0",
                  }}
                >
                  {/* Top row: action badge + time */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{ ...MONO, color: style.color, fontSize: "0.75rem", fontWeight: 700 }}>
                        {style.icon} {style.label}
                      </span>
                      {action.rule_cited && (
                        <span style={{ ...MONO, color: "#444", fontSize: "0.625rem" }}>
                          {action.rule_cited}
                        </span>
                      )}
                    </div>
                    <span style={{ ...MONO, color: "#333", fontSize: "0.625rem", letterSpacing: "0.06em" }}>
                      {timeAgo(action.created_at as number)}
                    </span>
                  </div>

                  {/* Post excerpt */}
                  {action.post_excerpt && (
                    <p style={{ color: "#AAAAAA", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: "8px", fontStyle: "italic" }}>
                      &ldquo;{action.post_excerpt}{action.post_excerpt.length >= 118 ? "..." : ""}&rdquo;
                    </p>
                  )}

                  {/* AI reasoning */}
                  <p style={{ color: "#666", fontSize: "0.8125rem", lineHeight: 1.6 }}>
                    {action.reasoning}
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer links */}
        <div style={{ borderTop: "1px solid #222", marginTop: "40px", paddingTop: "24px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <Link href="/constitution" style={{ ...MONO, color: "#888888", fontSize: "0.6875rem", letterSpacing: "0.04em", textDecoration: "underline", textUnderlineOffset: "4px" }}>
            READ THE CONSTITUTION →
          </Link>
          <Link href="/" style={{ ...MONO, color: "#888888", fontSize: "0.6875rem", letterSpacing: "0.04em", textDecoration: "underline", textUnderlineOffset: "4px" }}>
            BACK TO FEED →
          </Link>
        </div>
      </main>
    </div>
  );
}
