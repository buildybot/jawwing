"use client";

import { useState, useEffect, useRef } from "react";
import { getTerritories, type Territory } from "@/lib/api";
import { formatDistance } from "@/lib/api";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

export type TerritorySelection =
  | { type: "near_me"; territory?: undefined }
  | { type: "territory"; territory: Territory };

interface TerritorySelectorProps {
  userLat?: number;
  userLng?: number;
  selected: TerritorySelection;
  onChange: (selection: TerritorySelection) => void;
}

export default function TerritorySelector({
  userLat,
  userLng,
  selected,
  onChange,
}: TerritorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch territories on mount
  useEffect(() => {
    setLoading(true);
    getTerritories()
      .then((res) => setTerritories(res.territories))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const currentLabel =
    selected.type === "near_me"
      ? "NEAR ME"
      : selected.territory.name.toUpperCase();

  const selectNearMe = () => {
    onChange({ type: "near_me" });
    setOpen(false);
  };

  const selectTerritory = (t: Territory) => {
    onChange({ type: "territory", territory: t });
    setOpen(false);
  };

  // Compute distance to territory centroid (first h3 center)
  const getTerritoryDistance = (t: Territory): string | undefined => {
    if (userLat == null || userLng == null) return undefined;
    if (!t.h3_indexes || t.h3_indexes.length === 0) return undefined;
    // Use the h3ToLatLng from geo package — but we're client-side, so
    // approximate with a rough center. We skip this if no h3_indexes or
    // compute on server. For now omit distance if not available.
    return undefined;
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          ...MONO,
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "4px 0",
          color: open ? "#FFFFFF" : "#555555",
          fontSize: "0.6875rem",
          letterSpacing: "0.06em",
          transition: "color 150ms",
        }}
        aria-label="Select territory"
        aria-expanded={open}
      >
        <span>{currentLabel}</span>
        <span style={{ color: "#333333", fontSize: "0.625rem" }}>
          {open ? "▲" : "▼"}
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            background: "#000000",
            border: "1px solid #333333",
            minWidth: "220px",
            zIndex: 50,
          }}
        >
          {/* NEAR ME option */}
          <button
            onClick={selectNearMe}
            style={{
              ...MONO,
              width: "100%",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background:
                selected.type === "near_me" ? "#1F1F1F" : "transparent",
              border: "none",
              borderBottom: "1px solid #1F1F1F",
              cursor: "pointer",
              color: "#FFFFFF",
              fontSize: "0.75rem",
              letterSpacing: "0.06em",
              textAlign: "left",
            }}
            className="hover:bg-[#141414]"
          >
            <span>NEAR ME</span>
            <span style={{ color: "#333333", fontSize: "0.625rem" }}>
              GPS
            </span>
          </button>

          {/* Territory list */}
          {loading ? (
            <div
              style={{
                ...MONO,
                padding: "12px 14px",
                color: "#555555",
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
              }}
            >
              LOADING...
            </div>
          ) : territories.length === 0 ? (
            <div
              style={{
                ...MONO,
                padding: "12px 14px",
                color: "#555555",
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
              }}
            >
              NO TERRITORIES
            </div>
          ) : (
            territories.map((t) => {
              const dist = getTerritoryDistance(t);
              const isSelected =
                selected.type === "territory" && selected.territory.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => selectTerritory(t)}
                  style={{
                    ...MONO,
                    width: "100%",
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: isSelected ? "#1F1F1F" : "transparent",
                    border: "none",
                    borderBottom: "1px solid #1F1F1F",
                    cursor: "pointer",
                    color: "#FFFFFF",
                    fontSize: "0.75rem",
                    letterSpacing: "0.06em",
                    textAlign: "left",
                    gap: "12px",
                  }}
                  className="hover:bg-[#141414]"
                >
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.name.toUpperCase()}
                  </span>
                  <span
                    style={{
                      color: "#555555",
                      fontSize: "0.625rem",
                      flexShrink: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: "2px",
                    }}
                  >
                    {dist && <span>{dist.toUpperCase()}</span>}
                    <span>{t.post_count} POSTS</span>
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
