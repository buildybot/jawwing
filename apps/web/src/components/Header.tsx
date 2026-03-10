"use client";

import Link from "next/link";
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
      {/* Main row — full width, content centered */}
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
                color: "#777777",
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
              }}
            >
              {location.toUpperCase()}
            </span>
          )}
        </div>

        {/* Right: info link */}
        <Link
          href="/about"
          style={{
            ...MONO,
            color: "#333333",
            fontSize: "0.6875rem",
            letterSpacing: "0.06em",
            textDecoration: "none",
            flexShrink: 0,
          }}
          className="hover:text-[#777777] transition-colors"
        >
          ?
        </Link>
      </div>

      {/* Sub-nav */}
      <div
        className="feed-container mx-auto flex items-center gap-5 px-4 py-1"
        style={{ borderTop: "1px solid #0F0F0F" }}
      >
        {[
          { href: "/about", label: "ABOUT" },
          { href: "/constitution", label: "CONSTITUTION" },
          { href: "/transparency", label: "TRANSPARENCY" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            style={{
              ...MONO,
              fontSize: "0.5625rem",
              letterSpacing: "0.08em",
              color: "#333333",
              textDecoration: "none",
            }}
            className="hover:text-[#777777] transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>
    </header>
  );
}
