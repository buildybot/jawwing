"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const MONO: React.CSSProperties = {
  fontFamily: "var(--font-mono), 'JetBrains Mono', monospace",
};

const NAV_LINKS = [
  { href: "/", label: "FEED" },
  { href: "/constitution", label: "CONSTITUTION" },
  { href: "/transparency", label: "TRANSPARENCY" },
  { href: "/terms", label: "TERMS" },
  { href: "/privacy", label: "PRIVACY" },
];

/**
 * Persistent nav shell rendered on every page.
 * The feed page still renders its own Header with territory selector —
 * this shell handles the top bar for ALL other pages + the secondary nav everywhere.
 */
export default function NavShell() {
  const pathname = usePathname();
  const isFeed = pathname === "/";
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(document.cookie.includes("jw_account_ok=1"));
  }, []);

  // On the feed page, the Header component is rendered by page.tsx with territory props.
  // We only render the top bar on non-feed pages.
  if (isFeed) return null;

  return (
    <header
      style={{
        background: "#000000",
        borderBottom: "1px solid #333333",
        position: "sticky",
        top: 0,
        zIndex: 40,
        width: "100%",
      }}
    >
      {/* Main row */}
      <div
        style={{ maxWidth: 680, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            ...MONO,
            letterSpacing: "0.14em",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "0.875rem",
            textDecoration: "none",
            flexShrink: 0,
          }}
        >
          JAWWING
        </Link>

        {/* Center: current page label */}
        <span
          style={{
            ...MONO,
            color: "#AAAAAA",
            fontSize: "0.6875rem",
            letterSpacing: "0.08em",
            fontWeight: 600,
          }}
        >
          {getPageLabel(pathname)}
        </span>

        {/* Right side */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          {isLoggedIn ? (
            <>
              <Link
                href="/settings"
                style={{
                  ...MONO,
                  color: pathname === "/settings" ? "#FFFFFF" : "#AAAAAA",
                  fontSize: "0.6875rem",
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
              >
                MY POSTS
              </Link>
              <Link
                href="/settings"
                style={{ ...MONO, color: "#FFFFFF", fontSize: "0.9rem", textDecoration: "none", lineHeight: 1 }}
              >
                ⚙
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/signin"
                style={{
                  ...MONO,
                  color: "#FFFFFF",
                  fontSize: "0.6875rem",
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                  fontWeight: 600,
                  border: "1px solid #444444",
                  padding: "5px 12px",
                }}
              >
                SIGN IN
              </Link>
              <Link
                href="/settings"
                style={{ ...MONO, color: "#AAAAAA", fontSize: "0.9rem", textDecoration: "none", lineHeight: 1 }}
              >
                ⚙
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Secondary nav */}
      <div
        style={{
          maxWidth: 680,
          margin: "0 auto",
          padding: "6px 16px",
          borderTop: "1px solid #1A1A1A",
          display: "flex",
          alignItems: "center",
          gap: 20,
          overflowX: "auto",
        }}
      >
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              style={{
                ...MONO,
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
                color: active ? "#FFFFFF" : "#888888",
                textDecoration: "none",
                fontWeight: active ? 700 : 500,
                whiteSpace: "nowrap",
                borderBottom: active ? "1px solid #FFFFFF" : "1px solid transparent",
                paddingBottom: 2,
              }}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}

function getPageLabel(pathname: string): string {
  const map: Record<string, string> = {
    "/constitution": "CONSTITUTION",
    "/transparency": "TRANSPARENCY",
    "/terms": "TERMS OF SERVICE",
    "/privacy": "PRIVACY POLICY",
    "/settings": "SETTINGS",
    "/signin": "SIGN IN",
    "/admin": "ADMIN",
  };
  if (pathname.startsWith("/post/")) return "POST";
  return map[pathname] ?? "";
}
