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
  { name: "ATLANTA",       lat: 33.7490,  lng: -84.3880  },
  { name: "AUSTIN",        lat: 30.2672,  lng: -97.7431  },
  { name: "BALTIMORE",     lat: 39.2904,  lng: -76.6122  },
  { name: "BOSTON",        lat: 42.3601,  lng: -71.0589  },
  { name: "CHARLOTTE",     lat: 35.2271,  lng: -80.8431  },
  { name: "CHICAGO",       lat: 41.8781,  lng: -87.6298  },
  { name: "CINCINNATI",    lat: 39.1031,  lng: -84.5120  },
  { name: "CLEVELAND",     lat: 41.4993,  lng: -81.6944  },
  { name: "COLUMBUS",      lat: 39.9612,  lng: -82.9988  },
  { name: "DALLAS",        lat: 32.7767,  lng: -96.7970  },
  { name: "DC METRO",      lat: 38.9072,  lng: -77.0369  },
  { name: "DENVER",        lat: 39.7392,  lng: -104.9903 },
  { name: "DETROIT",       lat: 42.3314,  lng: -83.0458  },
  { name: "HONOLULU",      lat: 21.3069,  lng: -157.8583 },
  { name: "HOUSTON",       lat: 29.7604,  lng: -95.3698  },
  { name: "INDIANAPOLIS",  lat: 39.7684,  lng: -86.1581  },
  { name: "JACKSONVILLE",  lat: 30.3322,  lng: -81.6557  },
  { name: "KANSAS CITY",   lat: 39.0997,  lng: -94.5786  },
  { name: "LAS VEGAS",     lat: 36.1699,  lng: -115.1398 },
  { name: "LOS ANGELES",   lat: 34.0522,  lng: -118.2437 },
  { name: "MEMPHIS",       lat: 35.1495,  lng: -90.0490  },
  { name: "MIAMI",         lat: 25.7617,  lng: -80.1918  },
  { name: "MILWAUKEE",     lat: 43.0389,  lng: -87.9065  },
  { name: "MINNEAPOLIS",   lat: 44.9778,  lng: -93.2650  },
  { name: "NASHVILLE",     lat: 36.1627,  lng: -86.7816  },
  { name: "NEW ORLEANS",   lat: 29.9511,  lng: -90.0715  },
  { name: "NEW YORK",      lat: 40.7128,  lng: -74.0060  },
  { name: "NORFOLK",       lat: 36.8508,  lng: -76.2859  },
  { name: "OKLAHOMA CITY", lat: 35.4676,  lng: -97.5164  },
  { name: "ORLANDO",       lat: 28.5384,  lng: -81.3789  },
  { name: "PHILADELPHIA",  lat: 39.9526,  lng: -75.1652  },
  { name: "PHOENIX",       lat: 33.4484,  lng: -112.0740 },
  { name: "PITTSBURGH",    lat: 40.4406,  lng: -79.9959  },
  { name: "PORTLAND",      lat: 45.5051,  lng: -122.6750 },
  { name: "RALEIGH",       lat: 35.7796,  lng: -78.6382  },
  { name: "RICHMOND",      lat: 37.5407,  lng: -77.4360  },
  { name: "SACRAMENTO",    lat: 38.5816,  lng: -121.4944 },
  { name: "SALT LAKE CITY",lat: 40.7608,  lng: -111.8910 },
  { name: "SAN ANTONIO",   lat: 29.4241,  lng: -98.4936  },
  { name: "SAN DIEGO",     lat: 32.7157,  lng: -117.1611 },
  { name: "SAN FRANCISCO", lat: 37.7749,  lng: -122.4194 },
  { name: "SEATTLE",       lat: 47.6062,  lng: -122.3321 },
  { name: "ST. LOUIS",     lat: 38.6270,  lng: -90.1994  },
  { name: "TAMPA",         lat: 27.9506,  lng: -82.4572  },
  { name: "TUCSON",        lat: 32.2226,  lng: -110.9747 },
  { name: "WASHINGTON DC", lat: 38.9072,  lng: -77.0369  },
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
