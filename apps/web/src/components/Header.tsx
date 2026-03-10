"use client";

import Link from "next/link";
import TerritorySelector, { type TerritorySelection } from "./TerritorySelector";

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
      }}
    >
      <div
        style={{ maxWidth: "480px" }}
        className="mx-auto flex items-center justify-between px-4 py-3"
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-mono), monospace",
            letterSpacing: "0.12em",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          JAWWING
        </Link>

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
              fontFamily: "var(--font-mono), monospace",
              color: "#555555",
              fontSize: "0.6875rem",
              letterSpacing: "0.06em",
            }}
          >
            {location.toUpperCase()}
          </span>
        )}
      </div>
    </header>
  );
}
