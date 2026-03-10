"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getConstitution,
  getConstitutionVersions,
  getConstitutionVersion,
  getConstitutionAmendments,
  submitConstitutionAmendment,
  formatTimeAgo,
  type ConstitutionRule,
  type ConstitutionVersionSummary,
  type ConstitutionAmendment,
} from "@/lib/api";
import { CONSTITUTION_RULES } from "@jawwing/mod/engine";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

const SECTIONS_ORDER = ["prohibited", "restricted", "principles"];
const SECTION_LABELS: Record<string, string> = {
  prohibited: "PROHIBITED",
  restricted: "RESTRICTED",
  principles: "CORE PRINCIPLES",
  process: "MODERATION PROCESS",
  amendments: "AMENDMENTS",
  other: "OTHER",
};

interface Section {
  id: string;
  heading: string;
  items: ConstitutionRule[];
}

function groupRules(rules: ConstitutionRule[]): Section[] {
  const map = new Map<string, Section>();
  for (const rule of rules) {
    const key = rule.section ?? rule.tag?.split(".")[0] ?? "?";
    if (!map.has(key)) {
      map.set(key, { id: key, heading: rule.heading ?? key, items: [] });
    }
    map.get(key)!.items.push(rule);
  }
  return Array.from(map.values());
}

const FALLBACK_SECTIONS: Section[] = [
  {
    id: "I",
    heading: "CORE PRINCIPLES",
    items: [
      { id: "I.1", section: "I", heading: "CORE PRINCIPLES", tag: "I.1", text: "Anonymity is sacred. No action may be taken to identify, expose, or infer the identity of any user." },
      { id: "I.2", section: "I", heading: "CORE PRINCIPLES", tag: "I.2", text: "Speech is presumed valid. Content is allowed unless it violates a specific rule. Ambiguity resolves in favor of the poster." },
      { id: "I.3", section: "I", heading: "CORE PRINCIPLES", tag: "I.3", text: "Transparency is mandatory. Every moderation action is logged publicly with the rule cited and the AI agent's reasoning." },
      { id: "I.4", section: "I", heading: "CORE PRINCIPLES", tag: "I.4", text: "No human override. Human employees may not override AI moderation decisions. They may only propose constitutional amendments." },
      { id: "I.5", section: "I", heading: "CORE PRINCIPLES", tag: "I.5", text: "Open algorithm. The ranking algorithm is public. No shadow bans, no secret suppression, no hidden boosts. Every factor is documented in this constitution." },
    ],
  },
  {
    id: "II",
    heading: "PROHIBITED CONTENT",
    items: [
      { id: "II.1", section: "II", heading: "PROHIBITED CONTENT", tag: "II.1", text: "Direct threats. Content that directly threatens physical harm to a specific, identifiable person or group." },
      { id: "II.2", section: "II", heading: "PROHIBITED CONTENT", tag: "II.2", text: "Non-consensual intimate content. Explicit content involving real people without consent." },
      { id: "II.3", section: "II", heading: "PROHIBITED CONTENT", tag: "II.3", text: "CSAM. Any sexualized content involving minors. Zero tolerance. Immediate removal and report to NCMEC." },
      { id: "II.4", section: "II", heading: "PROHIBITED CONTENT", tag: "II.4", text: "Doxxing. Posting private identifying information (home address, phone, workplace) without consent." },
      { id: "II.5", section: "II", heading: "PROHIBITED CONTENT", tag: "II.5", text: "Spam. Automated or repetitive content designed to flood the feed or manipulate vote counts." },
      { id: "II.6", section: "II", heading: "PROHIBITED CONTENT", tag: "II.6", text: "Sexually explicit content. Nudity, pornography, sexual solicitation, and graphic sexual descriptions. This platform is not for adult content." },
    ],
  },
  {
    id: "III",
    heading: "PERMITTED CONTENT",
    items: [
      { id: "III.A", section: "III", heading: "PERMITTED CONTENT", tag: "III.A", text: "Political speech, including criticism of governments, parties, or officials." },
      { id: "III.B", section: "III", heading: "PERMITTED CONTENT", tag: "III.B", text: "Satire and parody, clearly or arguably so." },
      { id: "III.C", section: "III", heading: "PERMITTED CONTENT", tag: "III.C", text: "Profanity and crude humor." },
      { id: "III.D", section: "III", heading: "PERMITTED CONTENT", tag: "III.D", text: "Unpopular opinions and minority viewpoints." },
      { id: "III.E", section: "III", heading: "PERMITTED CONTENT", tag: "III.E", text: "Criticism of Jawwing itself." },
    ],
  },
  {
    id: "IV",
    heading: "MODERATION PROCESS",
    items: [
      { id: "IV.1", section: "IV", heading: "MODERATION PROCESS", tag: "IV.1", text: "Automated review. Every post is reviewed by AI within seconds of submission. The AI evaluates content against all Prohibited and Restricted rules and returns a decision (approve, flag, warn, or remove) with a confidence score from 0% to 100%." },
      { id: "IV.2", section: "IV", heading: "MODERATION PROCESS", tag: "IV.2", text: "Confidence threshold. Removals require 70%+ AI confidence. Below this threshold, the post remains live and is downgraded to a flag for secondary review. The AI confidence score is displayed on every post for full transparency." },
      { id: "IV.3", section: "IV", heading: "MODERATION PROCESS", tag: "IV.3", text: "Appeals. Any user may appeal a moderation decision. Appeals are reviewed by a separate, independent AI agent instance that re-evaluates the content fresh against the same constitution." },
      { id: "IV.4", section: "IV", heading: "MODERATION PROCESS", tag: "IV.4", text: "Community override. If 500+ unique users flag a post, it triggers a mandatory re-review regardless of the original AI decision." },
      { id: "IV.5", section: "IV", heading: "MODERATION PROCESS", tag: "IV.5", text: "Image moderation. Posts with images are evaluated multimodally. The AI reviews both the text and the image together for NSFW content, violence, personally identifying information, CSAM, and other violations." },
      { id: "IV.6", section: "IV", heading: "MODERATION PROCESS", tag: "IV.6", text: "Spam detection. Duplicate content is detected via content hashing. Identical posts within a 10-minute window are flagged as spam (R-2). Rate limits cap posting at 20 posts per hour per identity." },
    ],
  },
  {
    id: "V",
    heading: "FEED ALGORITHM",
    items: [
      { id: "V.1", section: "V", heading: "FEED ALGORITHM", tag: "V.1", text: "Three sort modes. HOT (default) ranks posts by a combination of quality, engagement, and freshness. NEW shows posts in reverse chronological order. TOP ranks by total engagement volume." },
      { id: "V.2", section: "V", heading: "FEED ALGORITHM", tag: "V.2", text: "HOT ranking formula. Each post's HOT score is calculated as: (Wilson Score + 0.3 * log(1 + total_votes) + 0.2 * controversy_ratio) / (age_hours + 2)^1.2. Wilson Score is a statistical lower-bound on the true upvote ratio, penalizing posts with few total votes. This means a post with 5 upvotes and 0 downvotes ranks lower than one with 100 upvotes and 10 downvotes." },
      { id: "V.3", section: "V", heading: "FEED ALGORITHM", tag: "V.3", text: "Controversy bonus. Posts with high engagement on BOTH sides get a boost, not a penalty. A post with 1000 upvotes and 999 downvotes is treated as highly engaging content, not buried at score 1. The controversy ratio (min(ups, downs) / max(ups, downs)) rewards posts that spark genuine debate." },
      { id: "V.4", section: "V", heading: "FEED ALGORITHM", tag: "V.4", text: "Time decay. All posts lose ranking over time via gravity factor (age_hours + 2)^1.2. A post that was hot 12 hours ago will naturally fall as newer content arrives. Posts expire entirely after 24 hours." },
      { id: "V.5", section: "V", heading: "FEED ALGORITHM", tag: "V.5", text: "Distance weighting. In HOT mode, closer posts rank higher at equal engagement. The distance boost formula is: 1 / sqrt(1 + distance_km / scale). The scale varies by scope: LOCAL uses scale=2 (strongly favors nearby), METRO uses scale=10, COUNTRY uses scale=100. A post 1km away gets roughly 1.4x the boost of a post 5km away in LOCAL scope." },
      { id: "V.6", section: "V", heading: "FEED ALGORITHM", tag: "V.6", text: "Three scope levels. LOCAL (5km radius from your location) shows your immediate neighborhood. METRO shows your entire metro area. COUNTRY shows posts from everywhere. The feed auto-expands from local to metro to country until at least 10 posts are found, so you never see an empty feed." },
      { id: "V.7", section: "V", heading: "FEED ALGORITHM", tag: "V.7", text: "No suppression. The algorithm has no concept of shadow bans, reach reduction, or content suppression. If a post is not removed by moderation, it competes equally in the ranking. There is no boost for accounts, no penalty for new users, no advertiser influence. The only inputs are: votes, time, distance, and engagement." },
      { id: "V.8", section: "V", heading: "FEED ALGORITHM", tag: "V.8", text: "TOP ranking. TOP sort ranks posts by total engagement: upvotes + downvotes. This surfaces the most-discussed content regardless of whether sentiment is positive or negative." },
    ],
  },
  {
    id: "VI",
    heading: "LOCATION AND PRIVACY",
    items: [
      { id: "VI.1", section: "VI", heading: "LOCATION AND PRIVACY", tag: "VI.1", text: "GPS required to post. You can browse, vote, and comment from anywhere, but creating a post requires GPS to confirm you are physically in that area. This is the core identity of Jawwing: local voices, not remote trolls." },
      { id: "VI.2", section: "VI", heading: "LOCATION AND PRIVACY", tag: "VI.2", text: "Coordinate fuzzing. Exact GPS coordinates are never stored. All locations are fuzzed to approximately a 1-mile radius before being saved to the database. The API returns rounded coordinates only. This prevents anyone from pinpointing where a post was made." },
      { id: "VI.3", section: "VI", heading: "LOCATION AND PRIVACY", tag: "VI.3", text: "Distance ranges. Distances shown on posts use vague ranges (NEARBY, <5MI, <10MI) rather than exact values. This prevents triangulation of a poster's location from multiple reference points." },
      { id: "VI.4", section: "VI", heading: "LOCATION AND PRIVACY", tag: "VI.4", text: "IP hashing. Your IP address is immediately passed through a one-way cryptographic hash (HMAC-SHA256). The raw IP is never stored. The hash cannot be reversed, even by us. It is used only for rate limiting and vote deduplication." },
      { id: "VI.5", section: "VI", heading: "LOCATION AND PRIVACY", tag: "VI.5", text: "Anti-spoofing. Location spoofing is detected via null island checks (0,0 coordinates) and teleportation detection (impossible movement speed between consecutive posts from the same identity)." },
    ],
  },
  {
    id: "VII",
    heading: "AI TECHNOLOGY",
    items: [
      { id: "VII.1", section: "VII", heading: "AI TECHNOLOGY", tag: "VII.1", text: "Current model: Claude Haiku 4.5 by Anthropic. Selected for speed, safety-first design, vision capability (image moderation), strong instruction following, and published safety documentation. Anthropic is an AI safety company — their models are designed to be helpful, harmless, and honest." },
      { id: "VII.2", section: "VII", heading: "AI TECHNOLOGY", tag: "VII.2", text: "Model requirements. Any moderation AI must: (1) process posts within 2 seconds, (2) maintain >95% agreement with human reviewers on test sets, (3) cost under $0.001 per decision at scale, (4) have published safety documentation from its provider, (5) not create single-provider lock-in." },
      { id: "VII.3", section: "VII", heading: "AI TECHNOLOGY", tag: "VII.3", text: "Model changes. Any change to the moderation model requires 7 days public notice before deployment. Old and new model test results must be published side-by-side for community review." },
      { id: "VII.4", section: "VII", heading: "AI TECHNOLOGY", tag: "VII.4", text: "Audit commitment. Monthly publication of moderation accuracy statistics: false positive rate, false negative rate, and appeal overturn rate. Available on the transparency page." },
    ],
  },
  {
    id: "VIII",
    heading: "AMENDMENTS",
    items: [
      { id: "VIII.1", section: "VIII", heading: "AMENDMENTS", tag: "VIII.1", text: "Any user may propose an amendment by submitting it through the app." },
      { id: "VIII.2", section: "VIII", heading: "AMENDMENTS", tag: "VIII.2", text: "Amendments require 60% approval from active users (min. 1,000 votes) over 7 days." },
      { id: "VIII.3", section: "VIII", heading: "AMENDMENTS", tag: "VIII.3", text: "No amendment may reduce transparency requirements or grant humans moderation authority." },
      { id: "VIII.4", section: "VIII", heading: "AMENDMENTS", tag: "VIII.4", text: "The feed algorithm (Article V) is subject to amendment like any other article. If the community votes to change the ranking formula, it changes." },
    ],
  },
];

// ─── Amendment form ────────────────────────────────────────────────────────────

interface AmendmentFormState {
  title: string;
  section: string;
  description: string;
  proposed_text: string;
}

const EMPTY_FORM: AmendmentFormState = {
  title: "",
  section: "prohibited",
  description: "",
  proposed_text: "",
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ConstitutionPage() {
  const [sections, setSections] = useState<Section[]>(FALLBACK_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [activeVersion, setActiveVersion] = useState<ConstitutionVersionSummary | null>(null);
  const [versions, setVersions] = useState<ConstitutionVersionSummary[]>([]);
  const [viewingVersion, setViewingVersion] = useState<ConstitutionVersionSummary | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [amendments, setAmendments] = useState<ConstitutionAmendment[]>([]);
  const [showAmendments, setShowAmendments] = useState(false);
  const [showAmendForm, setShowAmendForm] = useState(false);
  const [form, setForm] = useState<AmendmentFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  useEffect(() => {
    // Load active constitution + versions in parallel
    Promise.all([
      getConstitution().catch(() => null),
      getConstitutionVersions().catch(() => null),
      getConstitutionAmendments("under_vote").catch(() => null),
    ]).then(([constitutionData, versionsData, amendmentsData]) => {
      if (constitutionData?.constitution && constitutionData.constitution.length > 0) {
        setSections(groupRules(constitutionData.constitution));
      }
      if (versionsData?.versions) {
        setVersions(versionsData.versions);
        const active = versionsData.versions.find((v) => v.status === "active");
        if (active) setActiveVersion(active);
      }
      if (amendmentsData?.amendments) {
        setAmendments(amendmentsData.amendments);
      }
    }).finally(() => setLoading(false));
  }, []);

  // Load a specific historical version's content
  async function loadVersion(v: ConstitutionVersionSummary) {
    if (v.status === "active") {
      setViewingVersion(null);
      setSections(FALLBACK_SECTIONS);
      return;
    }
    try {
      const data = await getConstitutionVersion(v.id);
      const content = data.version.content as Record<string, unknown> | null;
      if (content && typeof content === "object") {
        // Convert raw rules object back into Section[] for display
        const built: Section[] = [];
        for (const [key, rules] of Object.entries(content)) {
          if (!Array.isArray(rules)) continue;
          const label = SECTION_LABELS[key] ?? key.toUpperCase();
          built.push({
            id: key,
            heading: label,
            items: rules.map((r: Record<string, unknown>, i: number) => ({
              id: String(r.id ?? `${key}-${i}`),
              section: key,
              heading: label,
              tag: String(r.id ?? `${key}.${i + 1}`),
              text: typeof r === "string" ? r : `${r.name}: ${r.description}`,
            })),
          });
        }
        setSections(built.length > 0 ? built : FALLBACK_SECTIONS);
      }
      setViewingVersion(v);
    } catch {
      // fallback
    }
  }

  async function handleAmendSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    setFormSubmitting(true);
    try {
      await submitConstitutionAmendment(form);
      setFormSuccess(true);
      setForm(EMPTY_FORM);
      setTimeout(() => { setShowAmendForm(false); setFormSuccess(false); }, 3000);
      // Refresh amendments
      getConstitutionAmendments("under_vote").then((d) => {
        if (d?.amendments) setAmendments(d.amendments);
      }).catch(() => {});
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setFormSubmitting(false);
    }
  }

  const displayVersion = viewingVersion ?? activeVersion;
  const versionLabel = displayVersion
    ? `VERSION ${displayVersion.version} · ${new Date(displayVersion.created_at * 1000).toLocaleDateString("en-US", { month: "long", year: "numeric" }).toUpperCase()}`
    : "V1.0 · MARCH 2026";
  const isViewingArchive = viewingVersion !== null;

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
        <span style={{ ...MONO, color: "#777777", fontSize: "0.75rem", letterSpacing: "0.06em" }}>CONSTITUTION</span>
      </nav>

      <main style={{ maxWidth: "640px" }} className="mx-auto px-6 py-16">

        {/* Archive banner */}
        {isViewingArchive && (
          <div style={{
            background: "#111",
            border: "1px solid #F59E0B",
            padding: "10px 16px",
            marginBottom: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span style={{
                ...MONO,
                background: "#F59E0B",
                color: "#000",
                fontSize: "0.625rem",
                letterSpacing: "0.08em",
                padding: "2px 8px",
                fontWeight: 700,
              }}>ARCHIVED</span>
              <span style={{ ...MONO, color: "#F59E0B", fontSize: "0.75rem", letterSpacing: "0.06em" }}>
                VIEWING VERSION {viewingVersion.version}
              </span>
            </div>
            <button
              onClick={() => { setViewingVersion(null); setSections(FALLBACK_SECTIONS); }}
              style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.04em" }}
            >
              VIEW CURRENT ↗
            </button>
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "20px",
          }}>
            <div style={{
              ...MONO,
              color: "#777777",
              fontSize: "0.6875rem",
              letterSpacing: "0.08em",
              border: "1px solid #1F1F1F",
              display: "inline-block",
              padding: "4px 12px",
            }}>
              GOVERNING DOCUMENT · {versionLabel}
              {loading && <span style={{ marginLeft: "8px", color: "#333333" }}>LOADING...</span>}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {versions.length > 1 && (
                <button
                  onClick={() => setShowVersions(!showVersions)}
                  style={{
                    ...MONO,
                    color: showVersions ? "#FFFFFF" : "#777777",
                    fontSize: "0.625rem",
                    letterSpacing: "0.08em",
                    background: "none",
                    border: `1px solid ${showVersions ? "#333" : "#1F1F1F"}`,
                    padding: "4px 10px",
                    cursor: "pointer",
                  }}
                >
                  {showVersions ? "HIDE VERSIONS" : "VIEW PREVIOUS VERSIONS"}
                </button>
              )}
              {amendments.length > 0 && (
                <button
                  onClick={() => setShowAmendments(!showAmendments)}
                  style={{
                    ...MONO,
                    color: showAmendments ? "#FFFFFF" : "#777777",
                    fontSize: "0.625rem",
                    letterSpacing: "0.08em",
                    background: "none",
                    border: `1px solid ${showAmendments ? "#333" : "#1F1F1F"}`,
                    padding: "4px 10px",
                    cursor: "pointer",
                  }}
                >
                  OPEN VOTES ({amendments.length})
                </button>
              )}
            </div>
          </div>

          {/* Version history dropdown */}
          {showVersions && versions.length > 0 && (
            <div style={{
              border: "1px solid #1F1F1F",
              marginBottom: "24px",
              background: "#080808",
            }}>
              {versions.map((v) => (
                <button
                  key={v.id}
                  onClick={() => loadVersion(v)}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "10px 16px",
                    background: viewingVersion?.id === v.id ? "#111" : "transparent",
                    border: "none",
                    borderBottom: "1px solid #1F1F1F",
                    cursor: "pointer",
                    gap: "12px",
                    textAlign: "left",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ ...MONO, color: "#FFFFFF", fontSize: "0.75rem", letterSpacing: "0.06em", minWidth: "40px" }}>
                      v{v.version}
                    </span>
                    <span style={{ color: "#777777", fontSize: "0.8125rem", lineHeight: 1.4, maxWidth: "360px" }}>
                      {v.summary.slice(0, 80)}{v.summary.length > 80 ? "…" : ""}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                    {v.status === "active" && (
                      <span style={{ ...MONO, color: "#22C55E", fontSize: "0.5625rem", letterSpacing: "0.08em", border: "1px solid #22C55E", padding: "1px 6px" }}>
                        ACTIVE
                      </span>
                    )}
                    {v.status === "archived" && (
                      <span style={{ ...MONO, color: "#F59E0B", fontSize: "0.5625rem", letterSpacing: "0.08em", border: "1px solid #F59E0B", padding: "1px 6px" }}>
                        ARCHIVED
                      </span>
                    )}
                    <span style={{ ...MONO, color: "#333333", fontSize: "0.625rem" }}>
                      {formatTimeAgo(v.created_at)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Open votes */}
          {showAmendments && amendments.length > 0 && (
            <div style={{ border: "1px solid #1F1F1F", marginBottom: "24px", background: "#080808" }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid #1F1F1F" }}>
                <span style={{ ...MONO, color: "#777777", fontSize: "0.6875rem", letterSpacing: "0.08em" }}>
                  AMENDMENTS UNDER COMMUNITY VOTE
                </span>
              </div>
              {amendments.map((a) => (
                <div key={a.id} style={{ padding: "14px 16px", borderBottom: "1px solid #1F1F1F" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", gap: "12px" }}>
                    <span style={{ color: "#FFFFFF", fontSize: "0.875rem", fontWeight: 500 }}>{a.title}</span>
                    <span style={{ ...MONO, color: "#777777", fontSize: "0.625rem", letterSpacing: "0.06em", flexShrink: 0 }}>
                      {a.section.toUpperCase()}
                    </span>
                  </div>
                  <p style={{ color: "#777777", fontSize: "0.8125rem", lineHeight: 1.5, marginBottom: "8px" }}>
                    {a.description.slice(0, 140)}{a.description.length > 140 ? "…" : ""}
                  </p>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span style={{ ...MONO, color: "#22C55E", fontSize: "0.6875rem" }}>↑ {a.votes_for}</span>
                    <span style={{ ...MONO, color: "#EF4444", fontSize: "0.6875rem" }}>↓ {a.votes_against}</span>
                    {a.vote_deadline && (
                      <span style={{ ...MONO, color: "#333333", fontSize: "0.625rem" }}>
                        CLOSES {formatTimeAgo(a.vote_deadline)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <h1 style={{ fontSize: "2rem", fontWeight: 700, letterSpacing: "-0.02em", color: "#FFFFFF", marginBottom: "12px" }}>
            Moderation Constitution
          </h1>
          <p style={{ color: "#C0C0C0", fontSize: "0.875rem", lineHeight: 1.6 }}>
            This document governs everything about how Jawwing works: what content is allowed,
            how posts are ranked in your feed, how your location data is protected, and what
            AI technology makes decisions. It is public, versioned, and subject to community
            amendment. No hidden algorithms. No secret rules.
          </p>
        </div>

        {/* Preamble */}
        <div style={{ borderLeft: "2px solid #1F1F1F", paddingLeft: "20px", marginBottom: "48px" }}>
          <p style={{ color: "#C0C0C0", fontSize: "0.9375rem", lineHeight: 1.7, fontStyle: "italic" }}>
            Jawwing exists to give people a voice in their communities, free from
            identity-based suppression, human moderator bias, or opaque algorithms.
            The feed ranking, moderation rules, privacy protections, and AI technology
            are all documented here. These rules are public, versioned, and yours to change.
          </p>
        </div>

        {/* Sections */}
        <div className="flex flex-col">
          {sections.map((section) => (
            <div
              key={section.id}
              style={{ borderTop: "1px solid #1F1F1F", paddingTop: "32px", paddingBottom: "32px" }}
            >
              <div className="flex items-baseline gap-4 mb-6">
                <span style={{ ...MONO, color: "#333333", fontSize: "0.75rem", letterSpacing: "0.08em", minWidth: "28px" }}>
                  {section.id}
                </span>
                <span style={{ ...MONO, color: "#FFFFFF", fontSize: "0.8125rem", letterSpacing: "0.08em", fontWeight: 600 }}>
                  {section.heading}
                </span>
              </div>
              <div className="flex flex-col" style={{ gap: "16px" }}>
                {section.items.map((item) => (
                  <div key={item.id ?? item.tag} className="flex gap-6">
                    <span style={{ ...MONO, color: "#777777", fontSize: "0.75rem", letterSpacing: "0.04em", minWidth: "44px", paddingTop: "2px" }}>
                      {item.tag}
                    </span>
                    <p style={{ color: "#C0C0C0", fontSize: "0.9375rem", lineHeight: 1.65 }}>
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Allowed Video Sources */}
        <div style={{ borderTop: "1px solid #1F1F1F", paddingTop: "32px", paddingBottom: "32px" }}>
          <div className="flex items-baseline gap-4 mb-6">
            <span style={{ ...MONO, color: "#333333", fontSize: "0.75rem", letterSpacing: "0.08em", minWidth: "28px" }}>
              AV
            </span>
            <span style={{ ...MONO, color: "#FFFFFF", fontSize: "0.8125rem", letterSpacing: "0.08em", fontWeight: 600 }}>
              ALLOWED VIDEO SOURCES
            </span>
          </div>
          <p style={{ color: "#C0C0C0", fontSize: "0.875rem", lineHeight: 1.65, marginBottom: "20px" }}>
            {CONSTITUTION_RULES.allowedVideoSources.description}
          </p>
          {/* Domain table */}
          <div style={{ border: "1px solid #1F1F1F", marginBottom: "20px" }}>
            {/* Header row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 2fr",
              padding: "8px 16px",
              borderBottom: "1px solid #1F1F1F",
              background: "#080808",
            }}>
              <span style={{ ...MONO, color: "#555555", fontSize: "0.625rem", letterSpacing: "0.08em" }}>DOMAIN</span>
              <span style={{ ...MONO, color: "#555555", fontSize: "0.625rem", letterSpacing: "0.08em" }}>PLATFORM</span>
              <span style={{ ...MONO, color: "#555555", fontSize: "0.625rem", letterSpacing: "0.08em" }}>REASON</span>
            </div>
            {CONSTITUTION_RULES.allowedVideoSources.allowedDomains.map((d) => (
              <div
                key={d.domain}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 2fr",
                  padding: "10px 16px",
                  borderBottom: "1px solid #111111",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                <span style={{ ...MONO, color: "#FFFFFF", fontSize: "0.75rem", letterSpacing: "0.02em" }}>
                  {d.domain}
                </span>
                <span style={{ color: "#C0C0C0", fontSize: "0.8125rem" }}>{d.name}</span>
                <span style={{ color: "#777777", fontSize: "0.75rem", lineHeight: 1.4 }}>{d.reason}</span>
              </div>
            ))}
          </div>
          <p style={{ color: "#555555", fontSize: "0.8125rem", lineHeight: 1.6 }}>
            <span style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.06em", marginRight: "8px" }}>AV-1</span>
            {CONSTITUTION_RULES.allowedVideoSources.policy}
          </p>
        </div>

        {/* CTA / Footer */}
        <div style={{
          borderTop: "1px solid #1F1F1F",
          marginTop: "16px",
          paddingTop: "32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "16px",
        }}>
          <p style={{ color: "#777777", fontSize: "0.875rem" }}>
            Want to propose an amendment?
          </p>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => setShowAmendForm(!showAmendForm)}
              style={{
                ...MONO,
                background: showAmendForm ? "#111" : "#FFFFFF",
                color: showAmendForm ? "#FFFFFF" : "#000000",
                border: "1px solid #FFFFFF",
                padding: "8px 20px",
                fontSize: "0.75rem",
                letterSpacing: "0.06em",
                fontWeight: 500,
                cursor: "pointer",
                transition: "background 150ms, color 150ms",
              }}
            >
              {showAmendForm ? "CANCEL" : "PROPOSE AMENDMENT"}
            </button>
          </div>
        </div>

        {/* Amendment form */}
        {showAmendForm && (
          <div style={{ border: "1px solid #1F1F1F", marginTop: "24px", padding: "24px", background: "#080808" }}>
            <div style={{ ...MONO, color: "#FFFFFF", fontSize: "0.75rem", letterSpacing: "0.08em", marginBottom: "20px" }}>
              PROPOSE AN AMENDMENT
            </div>
            {formSuccess ? (
              <div style={{ color: "#22C55E", fontSize: "0.875rem" }}>
                ✓ Amendment submitted. An AI will review it shortly. If approved, it goes to community vote for 7 days.
              </div>
            ) : (
              <form onSubmit={handleAmendSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ ...MONO, color: "#777777", fontSize: "0.625rem", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                    TITLE
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Short title for your amendment"
                    style={{ width: "100%", background: "#0A0A0A", border: "1px solid #1F1F1F", color: "#FFFFFF", padding: "8px 12px", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                    required
                    maxLength={200}
                  />
                </div>
                <div>
                  <label style={{ ...MONO, color: "#777777", fontSize: "0.625rem", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                    SECTION
                  </label>
                  <select
                    value={form.section}
                    onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                    style={{ width: "100%", background: "#0A0A0A", border: "1px solid #1F1F1F", color: "#FFFFFF", padding: "8px 12px", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                  >
                    <option value="prohibited">Prohibited Content</option>
                    <option value="restricted">Restricted Content</option>
                    <option value="principles">Core Principles</option>
                    <option value="process">Moderation Process</option>
                    <option value="amendments">Amendments</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label style={{ ...MONO, color: "#777777", fontSize: "0.625rem", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                    DESCRIPTION
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Describe why this change is needed and what problem it solves"
                    rows={3}
                    style={{ width: "100%", background: "#0A0A0A", border: "1px solid #1F1F1F", color: "#FFFFFF", padding: "8px 12px", fontSize: "0.875rem", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                    required
                  />
                </div>
                <div>
                  <label style={{ ...MONO, color: "#777777", fontSize: "0.625rem", letterSpacing: "0.08em", display: "block", marginBottom: "6px" }}>
                    PROPOSED TEXT
                  </label>
                  <textarea
                    value={form.proposed_text}
                    onChange={(e) => setForm((f) => ({ ...f, proposed_text: e.target.value }))}
                    placeholder="The exact text you'd like to add or change"
                    rows={4}
                    style={{ width: "100%", background: "#0A0A0A", border: "1px solid #1F1F1F", color: "#FFFFFF", padding: "8px 12px", fontSize: "0.875rem", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                    required
                  />
                </div>
                {formError && (
                  <p style={{ color: "#EF4444", fontSize: "0.8125rem" }}>{formError}</p>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}>
                  <p style={{ color: "#333333", fontSize: "0.75rem" }}>
                    AI-reviewed before going to community vote
                  </p>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    style={{
                      ...MONO,
                      background: "#FFFFFF",
                      color: "#000000",
                      border: "none",
                      padding: "8px 20px",
                      fontSize: "0.75rem",
                      letterSpacing: "0.06em",
                      fontWeight: 500,
                      cursor: formSubmitting ? "not-allowed" : "pointer",
                      opacity: formSubmitting ? 0.6 : 1,
                    }}
                  >
                    {formSubmitting ? "SUBMITTING..." : "SUBMIT"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        <p style={{ ...MONO, color: "#333333", fontSize: "0.6875rem", letterSpacing: "0.04em", marginTop: "40px", paddingTop: "20px", borderTop: "1px solid #1F1F1F" }}>
          constitution@jawwing.com
        </p>
      </main>
    </div>
  );
}
