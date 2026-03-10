"use client";

import { useBlockedUsers } from "@/hooks/useBlockedUsers";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

export default function BlockedUsersPanel() {
  const { blockedCount, unblockAll } = useBlockedUsers();

  return (
    <div
      style={{
        background: "#0A0A0A",
        border: "1px solid #1F1F1F",
        padding: "20px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
        <span
          style={{
            ...MONO,
            color: "#FFFFFF",
            fontSize: "0.75rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
          }}
        >
          BLOCKED USERS
        </span>
        <span
          style={{
            ...MONO,
            color: "#555555",
            fontSize: "0.6875rem",
            letterSpacing: "0.06em",
          }}
        >
          {blockedCount} BLOCKED
        </span>
      </div>
      <p
        style={{
          color: "#777777",
          fontSize: "0.8125rem",
          lineHeight: 1.5,
          marginBottom: "16px",
        }}
      >
        Blocked users are anonymous — their posts and comments are hidden from your feed.
      </p>
      {blockedCount > 0 ? (
        <button
          onClick={unblockAll}
          style={{
            ...MONO,
            background: "transparent",
            color: "#C0C0C0",
            border: "1px solid #333333",
            padding: "8px 18px",
            fontSize: "0.625rem",
            fontWeight: 700,
            letterSpacing: "0.1em",
            cursor: "pointer",
            transition: "all 150ms",
          }}
          className="hover:border-white hover:text-white"
        >
          UNBLOCK ALL
        </button>
      ) : (
        <p
          style={{
            ...MONO,
            color: "#333333",
            fontSize: "0.625rem",
            letterSpacing: "0.08em",
          }}
        >
          NO BLOCKED USERS
        </p>
      )}
    </div>
  );
}
