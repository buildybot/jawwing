"use client";

export type SortTab = "hot" | "new" | "top";

interface FeedTabsProps {
  active: SortTab;
  onChange: (tab: SortTab) => void;
}

const TABS: { id: SortTab; label: string }[] = [
  { id: "hot", label: "HOT" },
  { id: "new", label: "NEW" },
  { id: "top", label: "TOP" },
];

export default function FeedTabs({ active, onChange }: FeedTabsProps) {
  return (
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
  );
}
