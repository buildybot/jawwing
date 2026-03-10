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
  /** Pass user info when authenticated */
  user?: { displayName: string; territory?: string } | null;
}

export default function Header({
  location = "LOCATING...",
  userLat,
  userLng,
  selectedTerritory,
  onTerritoryChange,
  user,
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
      }}
    >
      <div
        style={{ maxWidth: "640px" }}
        className="mx-auto flex items-center justify-between px-4 py-3"
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
          }}
        >
          JAWWING
        </Link>

        {/* Right side */}
        <div className="flex items-center gap-4">
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

          {user ? (
            /* Authenticated: show display name + territory */
            <Link
              href="/profile"
              style={{
                ...MONO,
                color: "#C0C0C0",
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
                textDecoration: "none",
              }}
              className="hover:text-white transition-colors hidden sm:inline"
            >
              {user.displayName.toUpperCase()}
              {user.territory ? ` · ${user.territory.toUpperCase()}` : ""}
            </Link>
          ) : (
            /* Unauthenticated: show LOGIN button */
            <Link
              href="/login"
              style={{
                ...MONO,
                letterSpacing: "0.08em",
                fontSize: "0.6875rem",
                fontWeight: 600,
                color: "#FFFFFF",
                background: "transparent",
                border: "1px solid #FFFFFF",
                padding: "5px 14px",
                textDecoration: "none",
              }}
              className="hover:bg-white hover:text-black transition-colors"
            >
              LOGIN
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
