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
      style={{ borderBottom: "1px solid #1F1F1F" }}
      className="flex"
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            fontFamily: "var(--font-mono), monospace",
            letterSpacing: "0.06em",
            fontSize: "0.8125rem",
            fontWeight: 500,
            color: active === tab.id ? "#FFFFFF" : "#555555",
            borderBottom: active === tab.id ? "2px solid #FFFFFF" : "2px solid transparent",
            marginBottom: "-1px",
            paddingBottom: "10px",
            paddingTop: "10px",
            paddingLeft: "16px",
            paddingRight: "16px",
            background: "transparent",
            cursor: "pointer",
            transition: "color 150ms",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
