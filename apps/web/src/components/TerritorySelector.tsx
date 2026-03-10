"use client";

import { useState, useEffect, useRef } from "react";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

export interface CityOption {
  name: string;
  lat: number;
  lng: number;
}

export type TerritorySelection =
  | { type: "near_me" }
  | { type: "city"; city: CityOption };

export const CITIES: CityOption[] = [
  { name: "ATLANTA", lat: 33.749, lng: -84.388 },
  { name: "AUSTIN", lat: 30.2672, lng: -97.7431 },
  { name: "BOSTON", lat: 42.3601, lng: -71.0589 },
  { name: "CHARLOTTE", lat: 35.2271, lng: -80.8431 },
  { name: "CHICAGO", lat: 41.8781, lng: -87.6298 },
  { name: "DALLAS", lat: 32.7767, lng: -96.797 },
  { name: "DC METRO", lat: 38.9072, lng: -77.0369 },
  { name: "DENVER", lat: 39.7392, lng: -104.9903 },
  { name: "DETROIT", lat: 42.3314, lng: -83.0458 },
  { name: "HOUSTON", lat: 29.7604, lng: -95.3698 },
  { name: "LOS ANGELES", lat: 34.0522, lng: -118.2437 },
  { name: "MIAMI", lat: 25.7617, lng: -80.1918 },
  { name: "MINNEAPOLIS", lat: 44.9778, lng: -93.265 },
  { name: "NASHVILLE", lat: 36.1627, lng: -86.7816 },
  { name: "NEW YORK", lat: 40.7128, lng: -74.006 },
  { name: "PHILADELPHIA", lat: 39.9526, lng: -75.1652 },
  { name: "PHOENIX", lat: 33.4484, lng: -112.074 },
  { name: "PORTLAND", lat: 45.5051, lng: -122.675 },
  { name: "SAN FRANCISCO", lat: 37.7749, lng: -122.4194 },
  { name: "SEATTLE", lat: 47.6062, lng: -122.3321 },
];

const CITY_SELECTION_KEY = "jawwing_city_selection";

interface TerritorySelectorProps {
  userLat?: number;
  userLng?: number;
  selected: TerritorySelection;
  onChange: (selection: TerritorySelection) => void;
}

export default function TerritorySelector({
  selected,
  onChange,
}: TerritorySelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

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

  // Focus search when dropdown opens
  useEffect(() => {
    if (open) {
      setTimeout(() => searchRef.current?.focus(), 50);
      setSearch("");
    }
  }, [open]);

  const currentLabel =
    selected.type === "near_me"
      ? "NEAR ME"
      : selected.city.name;

  const filteredCities = search.trim()
    ? CITIES.filter((c) => c.name.includes(search.toUpperCase().trim()))
    : CITIES;

  const selectNearMe = () => {
    onChange({ type: "near_me" });
    try { localStorage.removeItem(CITY_SELECTION_KEY); } catch { /* noop */ }
    setOpen(false);
  };

  const selectCity = (city: CityOption) => {
    onChange({ type: "city", city });
    try { localStorage.setItem(CITY_SELECTION_KEY, JSON.stringify(city)); } catch { /* noop */ }
    setOpen(false);
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative" }}>
      {/* Trigger */}
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
          color: open ? "#FFFFFF" : "#777777",
          fontSize: "0.6875rem",
          letterSpacing: "0.06em",
          transition: "color 150ms",
        }}
        aria-label="Select city"
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
            left: "50%",
            transform: "translateX(-50%)",
            background: "#000000",
            border: "1px solid #333333",
            minWidth: "240px",
            maxWidth: "calc(100vw - 32px)",
            zIndex: 50,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Search */}
          <div style={{ padding: "8px 10px", borderBottom: "1px solid #1F1F1F" }}>
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="SEARCH CITIES"
              style={{
                ...MONO,
                width: "100%",
                background: "#000000",
                color: "#FFFFFF",
                border: "1px solid #333333",
                padding: "6px 8px",
                fontSize: "0.6875rem",
                letterSpacing: "0.06em",
                outline: "none",
                borderRadius: 0,
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Scrollable list */}
          <div style={{ maxHeight: "280px", overflowY: "auto" }}>
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
                background: selected.type === "near_me" ? "#1F1F1F" : "transparent",
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
              {selected.type === "near_me" && (
                <span style={{ color: "#FFFFFF", fontSize: "0.75rem" }}>✓</span>
              )}
            </button>

            {/* City list */}
            {filteredCities.length === 0 ? (
              <div
                style={{
                  ...MONO,
                  padding: "12px 14px",
                  color: "#555555",
                  fontSize: "0.6875rem",
                  letterSpacing: "0.06em",
                }}
              >
                NO RESULTS
              </div>
            ) : (
              filteredCities.map((city) => {
                const isSelected =
                  selected.type === "city" && selected.city.name === city.name;
                return (
                  <button
                    key={city.name}
                    onClick={() => selectCity(city)}
                    style={{
                      ...MONO,
                      width: "100%",
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: isSelected ? "#1F1F1F" : "transparent",
                      border: "none",
                      borderBottom: "1px solid #111111",
                      cursor: "pointer",
                      color: "#FFFFFF",
                      fontSize: "0.75rem",
                      letterSpacing: "0.06em",
                      textAlign: "left",
                    }}
                    className="hover:bg-[#141414]"
                  >
                    <span>{city.name}</span>
                    {isSelected && (
                      <span style={{ color: "#FFFFFF", fontSize: "0.75rem" }}>✓</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
