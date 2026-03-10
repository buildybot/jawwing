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
        borderBottom: "1px solid #1F1F1F",
        position: "sticky",
        top: 0,
        zIndex: 40,
        width: "100%",
      }}
    >
      {/* Single row — wordmark left, city center, icons right */}
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
                color: "#888888",
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
              }}
            >
              {location.toUpperCase()}
            </span>
          )}
        </div>

        {/* Right: settings gear + account */}
        <div className="flex items-center gap-3" style={{ flexShrink: 0 }}>
          {isLoggedIn ? (
            <Link
              href="/my-posts"
              title="Your posts"
              style={{
                ...MONO,
                color: "#888888",
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
                textDecoration: "none",
              }}
              className="hover:text-[#AAAAAA] transition-colors"
            >
              •
            </Link>
          ) : (
            <Link
              href="/signin"
              style={{
                ...MONO,
                color: "#888888",
                fontSize: "0.5625rem",
                letterSpacing: "0.08em",
                textDecoration: "none",
              }}
              className="hover:text-[#AAAAAA] transition-colors"
            >
              SIGN IN
            </Link>
          )}
          <Link
            href="/settings"
            title="Settings"
            style={{
              ...MONO,
              color: "#888888",
              fontSize: "0.875rem",
              textDecoration: "none",
              lineHeight: 1,
            }}
            className="hover:text-[#AAAAAA] transition-colors"
          >
            ⚙
          </Link>
        </div>
      </div>
    </header>
  );
}
