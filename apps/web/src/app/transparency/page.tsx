import Link from "next/link";

interface ModerationAction {
  id: string;
  postExcerpt: string;
  action: "approved" | "removed" | "flagged";
  ruleCited: string;
  agentReasoning: string;
  timestamp: string;
  confidence: number;
}

const MOCK_ACTIONS: ModerationAction[] = [
  {
    id: "1",
    postExcerpt: "I know where [name] lives and they better watch out...",
    action: "removed",
    ruleCited: "II.1 — Direct Threats",
    agentReasoning: "Post contains a direct, credible threat referencing a specific person's location. Confidence exceeds 95% threshold.",
    timestamp: "2026-03-10 13:42:07",
    confidence: 97,
  },
  {
    id: "2",
    postExcerpt: "The mayor is corrupt and should be thrown out of office.",
    action: "approved",
    ruleCited: "III — Permitted Content",
    agentReasoning: "Political criticism of a public official. Explicitly permitted under Article III. No threats detected.",
    timestamp: "2026-03-10 13:38:12",
    confidence: 99,
  },
  {
    id: "3",
    postExcerpt: "Buy cheap RX meds no prescription needed click here...",
    action: "removed",
    ruleCited: "II.5 — Spam",
    agentReasoning: "Pattern matches pharmaceutical spam template. Identical content detected across 14 accounts in past hour.",
    timestamp: "2026-03-10 13:15:44",
    confidence: 99,
  },
  {
    id: "4",
    postExcerpt: "This restaurant gave me food poisoning twice. Never again.",
    action: "approved",
    ruleCited: "III — Permitted Content",
    agentReasoning: "Negative review of a business. Protected speech under Article III. No doxxing or threats detected.",
    timestamp: "2026-03-10 12:55:03",
    confidence: 98,
  },
  {
    id: "5",
    postExcerpt: "Anyone else think the new park design is hideous? Who approved this?",
    action: "approved",
    ruleCited: "III — Permitted Content",
    agentReasoning: "Opinion about public infrastructure. Clearly permitted speech.",
    timestamp: "2026-03-10 12:30:21",
    confidence: 99,
  },
  {
    id: "6",
    postExcerpt: "[Name]'s home address is [address], phone is [number]...",
    action: "removed",
    ruleCited: "II.4 — Doxxing",
    agentReasoning: "Post contains what appears to be a private individual's home address and phone number without consent indicators.",
    timestamp: "2026-03-10 11:44:58",
    confidence: 96,
  },
  {
    id: "7",
    postExcerpt: "This whole platform is a joke and the founders are idiots.",
    action: "approved",
    ruleCited: "III — Permitted Content",
    agentReasoning: "Criticism of the platform and its founders. Explicitly permitted under Article III.",
    timestamp: "2026-03-10 11:20:09",
    confidence: 99,
  },
  {
    id: "8",
    postExcerpt: "Not sure if this counts as a threat but it made me uncomfortable...",
    action: "flagged",
    ruleCited: "IV.2 — Below Confidence Threshold",
    agentReasoning: "Content is ambiguous. Threat probability at 72%, below the 85% action threshold. Post remains live pending community review.",
    timestamp: "2026-03-10 10:58:33",
    confidence: 72,
  },
];

const ACTION_COLOR = {
  approved: "#FFFFFF",
  removed: "#FF3333",
  flagged: "#A0A0A0",
} as const;

const ACTION_LABEL = {
  approved: "APPROVED",
  removed: "REMOVED",
  flagged: "FLAGGED",
} as const;

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

export default function TransparencyPage() {
  const stats = {
    total: MOCK_ACTIONS.length,
    approved: MOCK_ACTIONS.filter((a) => a.action === "approved").length,
    removed: MOCK_ACTIONS.filter((a) => a.action === "removed").length,
    flagged: MOCK_ACTIONS.filter((a) => a.action === "flagged").length,
  };

  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      {/* Nav */}
      <nav style={{ borderBottom: "1px solid #1F1F1F" }} className="px-6 py-4 flex items-center gap-3">
        <Link
          href="/"
          style={{ ...MONO, letterSpacing: "0.12em", fontWeight: 700, fontSize: "0.875rem", color: "#FFFFFF", textDecoration: "none" }}
        >
          JAWWING
        </Link>
        <span style={{ color: "#333333", ...MONO }}>/ </span>
        <span style={{ ...MONO, color: "#555555", fontSize: "0.75rem", letterSpacing: "0.06em" }}>TRANSPARENCY</span>
      </nav>

      <main style={{ maxWidth: "760px" }} className="mx-auto px-4 py-16">
        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <div
            style={{
              ...MONO,
              color: "#555555",
              fontSize: "0.6875rem",
              letterSpacing: "0.08em",
              border: "1px solid #1F1F1F",
              display: "inline-block",
              padding: "4px 12px",
              marginBottom: "20px",
            }}
          >
            MODERATION LOG · REAL-TIME
          </div>
          <h1
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#FFFFFF",
              marginBottom: "12px",
            }}
          >
            Moderation Transparency
          </h1>
          <p style={{ color: "#A0A0A0", fontSize: "0.875rem", lineHeight: 1.6 }}>
            Every moderation action logged in real time. Who made the call, what rule was cited, why.
          </p>
        </div>

        {/* Stats */}
        <div
          style={{ border: "1px solid #1F1F1F", marginBottom: "32px" }}
          className="grid grid-cols-4"
        >
          {[
            { label: "TOTAL", value: stats.total, color: "#FFFFFF" },
            { label: "APPROVED", value: stats.approved, color: "#FFFFFF" },
            { label: "REMOVED", value: stats.removed, color: "#FF3333" },
            { label: "FLAGGED", value: stats.flagged, color: "#A0A0A0" },
          ].map((stat, i) => (
            <div
              key={stat.label}
              style={{
                background: "#0A0A0A",
                borderRight: i < 3 ? "1px solid #1F1F1F" : "none",
                padding: "20px",
                textAlign: "center",
              }}
            >
              <div style={{ ...MONO, fontSize: "1.5rem", fontWeight: 700, color: stat.color, marginBottom: "4px" }}>
                {stat.value}
              </div>
              <div style={{ ...MONO, color: "#555555", fontSize: "0.625rem", letterSpacing: "0.08em" }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Column headers */}
        <div
          style={{
            ...MONO,
            display: "grid",
            gridTemplateColumns: "1fr 80px 120px 60px",
            gap: "16px",
            padding: "8px 16px",
            borderBottom: "1px solid #1F1F1F",
            fontSize: "0.625rem",
            letterSpacing: "0.08em",
            color: "#555555",
          }}
        >
          <span>POST / REASONING</span>
          <span>RULE</span>
          <span>AGENT</span>
          <span style={{ textAlign: "right" }}>CONF.</span>
        </div>

        {/* Actions */}
        <div className="flex flex-col" style={{ gap: "0" }}>
          {MOCK_ACTIONS.map((action) => (
            <div
              key={action.id}
              style={{
                background: "#0A0A0A",
                border: "1px solid #1F1F1F",
                borderTop: "none",
                padding: "16px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 80px 120px 60px",
                  gap: "16px",
                  alignItems: "start",
                }}
              >
                {/* Post excerpt + reasoning */}
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      style={{
                        ...MONO,
                        fontSize: "0.625rem",
                        letterSpacing: "0.08em",
                        color: ACTION_COLOR[action.action],
                        fontWeight: 600,
                      }}
                    >
                      {ACTION_LABEL[action.action]}
                    </span>
                  </div>
                  <p
                    style={{
                      color: "#A0A0A0",
                      fontSize: "0.875rem",
                      lineHeight: 1.5,
                      fontStyle: "italic",
                      marginBottom: "8px",
                    }}
                  >
                    &ldquo;{action.postExcerpt}&rdquo;
                  </p>
                  <p style={{ color: "#555555", fontSize: "0.8125rem", lineHeight: 1.5 }}>
                    {action.agentReasoning}
                  </p>
                </div>

                {/* Rule */}
                <div style={{ ...MONO, color: "#A0A0A0", fontSize: "0.6875rem", letterSpacing: "0.02em", lineHeight: 1.5 }}>
                  {action.ruleCited}
                </div>

                {/* Agent + timestamp */}
                <div style={{ ...MONO, color: "#555555", fontSize: "0.6875rem", lineHeight: 1.6 }}>
                  <div>jawwing-mod-v1</div>
                  <div style={{ color: "#333333" }}>{action.timestamp}</div>
                </div>

                {/* Confidence */}
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      ...MONO,
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: action.confidence >= 90 ? "#FFFFFF" : action.confidence >= 80 ? "#A0A0A0" : "#555555",
                    }}
                  >
                    {action.confidence}%
                  </div>
                  <div
                    style={{
                      height: "2px",
                      background: "#1F1F1F",
                      marginTop: "4px",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        height: "100%",
                        width: `${action.confidence}%`,
                        background: action.confidence >= 90 ? "#FFFFFF" : action.confidence >= 80 ? "#A0A0A0" : "#555555",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #1F1F1F", marginTop: "40px", paddingTop: "24px" }}>
          <Link
            href="/constitution"
            style={{
              ...MONO,
              color: "#A0A0A0",
              fontSize: "0.75rem",
              letterSpacing: "0.04em",
              textDecoration: "underline",
              textUnderlineOffset: "4px",
            }}
            className="hover:text-white transition-colors"
          >
            READ THE MODERATION CONSTITUTION →
          </Link>
        </div>
      </main>
    </div>
  );
}
