const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

interface EmptyStateProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ title, subtitle, action }: EmptyStateProps) {
  return (
    <div style={{ padding: "60px 16px", textAlign: "center" }}>
      <p
        style={{
          ...MONO,
          color: "#333333",
          fontSize: "0.75rem",
          letterSpacing: "0.1em",
          marginBottom: subtitle ? "8px" : action ? "20px" : "0",
          textTransform: "uppercase",
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          style={{
            color: "#555555",
            fontSize: "0.875rem",
            lineHeight: 1.6,
            marginBottom: action ? "20px" : "0",
          }}
        >
          {subtitle}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            ...MONO,
            background: "transparent",
            color: "#A0A0A0",
            border: "1px solid #333333",
            padding: "8px 20px",
            fontSize: "0.75rem",
            letterSpacing: "0.06em",
            cursor: "pointer",
            transition: "border-color 150ms, color 150ms",
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
