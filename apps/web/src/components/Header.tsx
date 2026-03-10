"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TerritorySelector, { type TerritorySelection } from "./TerritorySelector";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

interface HeaderProps {
  location?: string;
  userLat?: number;
  userLng?: number;
  selectedTerritory?: TerritorySelection;
  onTerritoryChange?: (selection: TerritorySelection) => void;
}

export default function Header({
  location = "LOCATING...",
  userLat,
  userLng,
  selectedTerritory,
  onTerritoryChange,
}: HeaderProps) {
  const showSelector = selectedTerritory !== undefined && onTerritoryChange !== undefined;

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    setIsLoggedIn(document.cookie.includes("jw_account_ok=1"));
  }, []);

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
      <div className="feed-container mx-auto flex items-center justify-between px-4 py-3">
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

        {/* Center: location / territory selector */}
        <div className="flex-1 flex justify-center px-4">
          {showSelector ? (
            <TerritorySelector
              userLat={userLat}
              userLng={userLng}
              selected={selectedTerritory!}
              onChange={onTerritoryChange!}
            />
          ) : (
            <span
              style={{
                ...MONO,
                color: "#AAAAAA",
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
              }}
            >
              {location.toUpperCase()}
            </span>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4" style={{ flexShrink: 0 }}>
          {isLoggedIn ? (
            <>
              <Link
                href="/my-posts"
                title="Your posts"
                style={{
                  ...MONO,
                  color: "#FFFFFF",
                  fontSize: "0.6875rem",
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                  fontWeight: 600,
                }}
                className="hover:text-[#CCCCCC] transition-colors"
              >
                MY POSTS
              </Link>
              <Link
                href="/settings"
                title="Settings"
                style={{
                  ...MONO,
                  color: "#FFFFFF",
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  lineHeight: 1,
                }}
                className="hover:text-[#CCCCCC] transition-colors"
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
                className="hover:bg-[#FFFFFF] hover:text-[#000000] transition-all"
              >
                SIGN IN
              </Link>
              <Link
                href="/settings"
                title="Settings"
                style={{
                  ...MONO,
                  color: "#AAAAAA",
                  fontSize: "0.9rem",
                  textDecoration: "none",
                  lineHeight: 1,
                }}
                className="hover:text-[#FFFFFF] transition-colors"
              >
                ⚙
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Secondary nav — legible links */}
      <div
        className="feed-container mx-auto flex items-center gap-5 px-4"
        style={{
          borderTop: "1px solid #1A1A1A",
          paddingTop: "6px",
          paddingBottom: "6px",
        }}
      >
        {[
          { href: "/constitution", label: "CONSTITUTION" },
          { href: "/transparency", label: "TRANSPARENCY" },
          { href: "/terms", label: "TERMS" },
          { href: "/privacy", label: "PRIVACY" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              ...MONO,
              fontSize: "0.6875rem",
              letterSpacing: "0.06em",
              color: "#AAAAAA",
              textDecoration: "none",
              fontWeight: 500,
            }}
            className="hover:text-[#FFFFFF] transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
