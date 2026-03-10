"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getModActions, type ModAction } from "@/lib/api";

const ACTION_COLOR = {
  approved: "#FFFFFF",
  removed: "#FF3333",
  flagged: "#C0C0C0",
} as const;

const ACTION_LABEL = {
  approved: "APPROVED",
  removed: "REMOVED",
  flagged: "FLAGGED",
} as const;

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

function formatTs(unixSec: number): string {
  const d = new Date(unixSec * 1000);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

export default function TransparencyPage() {
  const [actions, setActions] = useState<ModAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getModActions({ limit: 50 })
      .then((data) => setActions(data.actions))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load."))
      .finally(() => setLoading(false));
  }, []);

  const stats = {
    total: actions.length,
    approved: actions.filter((a) => a.action === "approved").length,
    removed: actions.filter((a) => a.action === "removed").length,
    flagged: actions.filter((a) => a.action === "flagged").length,
  };

  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #1F1F1F" }} className="px-6 py-4 flex items-center gap-3">
        <Link
          href="/"
          style={{ ...MONO, letterSpacing: "0.12em", fontWeight: 700, fontSize: "0.875rem", color: "#FFFFFF", textDecoration: "none" }}
        >
          JAWWING
        </Link>
        <span style={{ color: "#333333", ...MONO }}>/ </span>
        <span style={{ ...MONO, color: "#777777", fontSize: "0.75rem", letterSpacing: "0.06em" }}>TRANSPARENCY</span>
      </nav>

      <main style={{ maxWidth: "760px" }} className="mx-auto px-4 py-16">
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <div
            style={{
              ...MONO,
              color: "#777777",
              fontSize: "0.6875rem",
              letterSpacing: "0.08em",
              border: "1px solid #1F1F1F",
              display: "inline-block",
              padding: "4px 12px",
              marginBottom: "20px",
            }}
          >
            MODERATION LOG · REAL-TIME
          </div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              marginBottom: "12px",
            }}
          >
            Moderation Transparency
          </h1>
          <p style={{ color: "#C0C0C0", fontSize: "0.875rem", lineHeight: 1.6 }}>
            Every moderation action logged in real time. Who made the call, what rule was cited, why.
          </p>
        </div>

        {/* Stats */}
        {!loading && !error && (
          <div
            style={{ border: "1px solid #1F1F1F", marginBottom: "32px" }}
            className="grid grid-cols-4"
          >
            {[
              { label: "TOTAL", value: stats.total, color: "#FFFFFF" },
              { label: "APPROVED", value: stats.approved, color: "#FFFFFF" },
              { label: "REMOVED", value: stats.removed, color: "#FF3333" },
              { label: "FLAGGED", value: stats.flagged, color: "#C0C0C0" },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  background: "#0A0A0A",
                  borderRight: i < 3 ? "1px solid #1F1F1F" : "none",
                  padding: "20px",
                  textAlign: "center",
                }}
              >
                <div style={{ ...MONO, fontSize: "1.5rem", fontWeight: 700, color: stat.color, marginBottom: "4px" }}>
                  {stat.value}
                </div>
                <div style={{ ...MONO, color: "#777777", fontSize: "0.625rem", letterSpacing: "0.08em" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col" style={{ gap: "1px" }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", borderTop: i > 0 ? "none" : undefined, padding: "16px", height: "80px" }}>
                <div style={{ background: "#1F1F1F", height: "10px", marginBottom: "8px", width: "30%" }} />
                <div style={{ background: "#1F1F1F", height: "10px", marginBottom: "8px", width: "80%" }} />
                <div style={{ background: "#1F1F1F", height: "10px", width: "60%" }} />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <p style={{ ...MONO, color: "#FF3333", fontSize: "0.75rem", letterSpacing: "0.04em" }}>
            {error.toUpperCase()}
          </p>
        )}

        {/* Empty */}
        {!loading && !error && actions.length === 0 && (
          <p style={{ ...MONO, color: "#333333", fontSize: "0.75rem", letterSpacing: "0.06em", textAlign: "center", padding: "60px 0" }}>
            NO MODERATION ACTIONS YET
          </p>
        )}

        {/* Actions */}
        {!loading && !error && actions.length > 0 && (
          <>
            {/* Column headers */}
            <div
              style={{
                ...MONO,
                display: "grid",
                gridTemplateColumns: "1fr 80px 120px 60px",
                gap: "16px",
                padding: "8px 16px",
                borderBottom: "1px solid #1F1F1F",
                fontSize: "0.625rem",
                letterSpacing: "0.08em",
                color: "#777777",
              }}
            >
              <span>POST / REASONING</span>
              <span>RULE</span>
              <span>AGENT</span>
              <span style={{ textAlign: "right" }}>CONF.</span>
            </div>

            <div className="flex flex-col">
              {actions.map((action) => (
                <div
                  key={action.id}
                  style={{
                    background: "#0A0A0A",
                    border: "1px solid #1F1F1F",
                    borderTop: "none",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 80px 120px 60px",
                      gap: "16px",
                      alignItems: "start",
                    }}
                  >
                    {/* Post excerpt + reasoning */}
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span
                          style={{
                            ...MONO,
                            fontSize: "0.625rem",
                            letterSpacing: "0.08em",
                            color: ACTION_COLOR[action.action] ?? "#C0C0C0",
                            fontWeight: 600,
                          }}
                        >
                          {ACTION_LABEL[action.action] ?? action.action.toUpperCase()}
                        </span>
                      </div>
                      {action.post_excerpt && (
                        <p
                          style={{
                            color: "#C0C0C0",
                            fontSize: "0.875rem",
                            lineHeight: 1.5,
                            fontStyle: "italic",
                            marginBottom: "8px",
                          }}
                        >
                          &ldquo;{action.post_excerpt}&rdquo;
                        </p>
                      )}
                      <p style={{ color: "#777777", fontSize: "0.8125rem", lineHeight: 1.5 }}>
                        {action.reasoning}
                      </p>
                    </div>

                    {/* Rule */}
                    <div style={{ ...MONO, color: "#C0C0C0", fontSize: "0.6875rem", letterSpacing: "0.02em", lineHeight: 1.5 }}>
                      {action.rule_cited}
                    </div>

                    {/* Agent + timestamp */}
                    <div style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", lineHeight: 1.6 }}>
                      <div>{action.agent_id}</div>
                      <div style={{ color: "#333333" }}>{formatTs(action.created_at)}</div>
                    </div>

                    {/* Confidence */}
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          ...MONO,
                          fontSize: "0.875rem",
                          fontWeight: 600,
                          color: action.confidence >= 90 ? "#FFFFFF" : action.confidence >= 80 ? "#C0C0C0" : "#777777",
                        }}
                      >
                        {action.confidence}%
                      </div>
                      <div style={{ height: "2px", background: "#1F1F1F", marginTop: "4px", position: "relative" }}>
                        <div
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            height: "100%",
                            width: `${action.confidence}%`,
                            background: action.confidence >= 90 ? "#FFFFFF" : action.confidence >= 80 ? "#C0C0C0" : "#777777",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div style={{ borderTop: "1px solid #1F1F1F", marginTop: "40px", paddingTop: "24px", display: "flex", flexWrap: "wrap", gap: "24px" }}>
          <Link
            href="/constitution"
            style={{
              ...MONO,
              color: "#C0C0C0",
              fontSize: "0.75rem",
              letterSpacing: "0.04em",
              textDecoration: "underline",
              textUnderlineOffset: "4px",
            }}
            className="hover:text-white transition-colors"
          >
            READ THE MODERATION CONSTITUTION →
          </Link>
        </div>
      </main>

      <footer style={{ borderTop: "1px solid #1F1F1F", padding: "24px" }}>
        <div style={{ maxWidth: "760px", margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "24px" }}>
          {[
            { href: "/about", label: "ABOUT" },
            { href: "/terms", label: "TERMS" },
            { href: "/privacy", label: "PRIVACY" },
            { href: "/constitution", label: "CONSTITUTION" },
            { href: "/transparency", label: "TRANSPARENCY" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.06em", textDecoration: "none" }}
              className="hover:text-white transition-colors">
              {label}
            </Link>
          ))}
        </div>
      </footer>
    </div>
  );
}
