"use client";

export type SortTab = "hot" | "new" | "top";
export type TopRange = "24h" | "week" | "month" | "all";

interface FeedTabsProps {
  active: SortTab;
  onChange: (tab: SortTab) => void;
  topRange: TopRange;
  onTopRangeChange: (range: TopRange) => void;
}

const TABS: { id: SortTab; label: string }[] = [
  { id: "hot", label: "HOT" },
  { id: "new", label: "NEW" },
  { id: "top", label: "TOP" },
];

const TOP_RANGES: { id: TopRange; label: string }[] = [
  { id: "24h", label: "24H" },
  { id: "week", label: "WEEK" },
  { id: "month", label: "MONTH" },
  { id: "all", label: "ALL TIME" },
];

export default function FeedTabs({ active, onChange, topRange, onTopRangeChange }: FeedTabsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div
        style={{
          display: "flex",
          gap: "0",
          borderBottom: "1px solid #1F1F1F",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            style={{
              fontFamily: "var(--font-mono), monospace",
              letterSpacing: "0.08em",
              fontSize: "0.5625rem",
              fontWeight: active === tab.id ? 700 : 400,
              color: active === tab.id ? "#FFFFFF" : "#555555",
              background: "transparent",
              border: "none",
              borderBottom: active === tab.id ? "1px solid #FFFFFF" : "1px solid transparent",
              padding: "8px 16px",
              cursor: "pointer",
              transition: "color 150ms",
              marginBottom: "-1px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Time range sub-filter — always rendered with fixed height to prevent layout shift */}
      <div
        style={{
          display: "flex",
          gap: "0",
          height: "28px",
          overflow: "hidden",
          opacity: active === "top" ? 1 : 0,
          pointerEvents: active === "top" ? "auto" : "none",
          transition: "opacity 150ms",
          borderBottom: active === "top" ? "1px solid #1A1A1A" : "none",
        }}
      >
        {TOP_RANGES.map((range) => (
          <button
            key={range.id}
            onClick={() => onTopRangeChange(range.id)}
            tabIndex={active === "top" ? 0 : -1}
            style={{
              fontFamily: "var(--font-mono), monospace",
              letterSpacing: "0.06em",
              fontSize: "0.5rem",
              fontWeight: topRange === range.id ? 700 : 400,
              color: topRange === range.id ? "#FFFFFF" : "#444444",
              background: topRange === range.id ? "#1A1A1A" : "transparent",
              border: "none",
              padding: "6px 12px",
              cursor: "pointer",
              transition: "color 150ms, background 150ms",
            }}
          >
            {range.label}
          </button>
        ))}
      </div>
    </div>
  );
}
