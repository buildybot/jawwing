"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getConstitution, type ConstitutionRule } from "@/lib/api";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

interface Section {
  id: string;
  heading: string;
  items: ConstitutionRule[];
}

// Group flat rules into sections by their section field
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

// Hardcoded fallback (same as before) used when API unavailable
const FALLBACK_SECTIONS: Section[] = [
  {
    id: "I",
    heading: "CORE PRINCIPLES",
    items: [
      { id: "I.1", section: "I", heading: "CORE PRINCIPLES", tag: "I.1", text: "Anonymity is sacred. No action may be taken to identify, expose, or infer the identity of any user." },
      { id: "I.2", section: "I", heading: "CORE PRINCIPLES", tag: "I.2", text: "Speech is presumed valid. Content is allowed unless it violates a specific rule. Ambiguity resolves in favor of the poster." },
      { id: "I.3", section: "I", heading: "CORE PRINCIPLES", tag: "I.3", text: "Transparency is mandatory. Every moderation action is logged publicly with the rule cited and the AI agent's reasoning." },
      { id: "I.4", section: "I", heading: "CORE PRINCIPLES", tag: "I.4", text: "No human override. Human employees may not override AI moderation decisions. They may only propose constitutional amendments." },
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
      { id: "IV.1", section: "IV", heading: "MODERATION PROCESS", tag: "IV.1", text: "Automated review. Every post is reviewed by AI agents within seconds of submission." },
      { id: "IV.2", section: "IV", heading: "MODERATION PROCESS", tag: "IV.2", text: "Confidence threshold. Actions require 85%+ confidence. Below this, the post remains live and is flagged for community review." },
      { id: "IV.3", section: "IV", heading: "MODERATION PROCESS", tag: "IV.3", text: "Appeals. Any user may appeal a moderation decision. Appeals are reviewed by a different AI agent instance." },
      { id: "IV.4", section: "IV", heading: "MODERATION PROCESS", tag: "IV.4", text: "Community override. If 500+ unique users flag a post, it triggers a mandatory re-review." },
    ],
  },
  {
    id: "V",
    heading: "AMENDMENTS",
    items: [
      { id: "V.1", section: "V", heading: "AMENDMENTS", tag: "V.1", text: "Any user may propose an amendment by submitting it through the app." },
      { id: "V.2", section: "V", heading: "AMENDMENTS", tag: "V.2", text: "Amendments require 60% approval from active users (min. 1,000 votes) over 7 days." },
      { id: "V.3", section: "V", heading: "AMENDMENTS", tag: "V.3", text: "No amendment may reduce transparency requirements or grant humans moderation authority." },
    ],
  },
];

export default function ConstitutionPage() {
  const [sections, setSections] = useState<Section[]>(FALLBACK_SECTIONS);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState("V1.0 · MARCH 2026");

  useEffect(() => {
    getConstitution()
      .then((data) => {
        if (data.constitution && data.constitution.length > 0) {
          setSections(groupRules(data.constitution));
        }
        // If API returns version metadata
        if ((data as Record<string, unknown>).version) {
          setVersion(String((data as Record<string, unknown>).version));
        }
      })
      .catch(() => {
        // Silently fall back to hardcoded constitution
      })
      .finally(() => setLoading(false));
  }, []);

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
        {/* Header */}
        <div style={{ marginBottom: "48px" }}>
          <div
            style={{
              ...MONO,
              color: "#777777",
              fontSize: "0.6875rem",
              letterSpacing: "0.08em",
              border: "1px solid #1F1F1F",
              display: "inline-block",
              padding: "4px 12px",
              marginBottom: "20px",
            }}
          >
            GOVERNING DOCUMENT · {version}
            {loading && <span style={{ marginLeft: "8px", color: "#333333" }}>LOADING...</span>}
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
            Moderation Constitution
          </h1>
          <p style={{ color: "#C0C0C0", fontSize: "0.875rem", lineHeight: 1.6 }}>
            This document governs all moderation on Jawwing. It is public, versioned, and
            subject to community amendment. Every AI moderation action is logged against
            these rules.
          </p>
        </div>

        {/* Preamble */}
        <div
          style={{
            borderLeft: "2px solid #1F1F1F",
            paddingLeft: "20px",
            marginBottom: "48px",
          }}
        >
          <p style={{ color: "#C0C0C0", fontSize: "0.9375rem", lineHeight: 1.7, fontStyle: "italic" }}>
            Jawwing exists to give people a voice in their communities, free from
            identity-based suppression or human moderator bias. These rules are public,
            versioned, and yours to change.
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
                    <span
                      style={{
                        ...MONO,
                        color: "#777777",
                        fontSize: "0.75rem",
                        letterSpacing: "0.04em",
                        minWidth: "44px",
                        paddingTop: "2px",
                      }}
                    >
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

        {/* CTA */}
        <div
          style={{
            borderTop: "1px solid #1F1F1F",
            marginTop: "16px",
            paddingTop: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "16px",
          }}
        >
          <p style={{ color: "#777777", fontSize: "0.875rem" }}>
            Want to propose an amendment?
          </p>
          <Link
            href="/"
            style={{
              ...MONO,
              background: "#FFFFFF",
              color: "#000000",
              border: "1px solid #FFFFFF",
              padding: "8px 20px",
              fontSize: "0.75rem",
              letterSpacing: "0.06em",
              fontWeight: 500,
              textDecoration: "none",
              transition: "background 150ms, color 150ms",
            }}
            className="hover:bg-transparent hover:text-white"
          >
            JOIN WAITLIST
          </Link>
        </div>

        <p
          style={{
            ...MONO,
            color: "#333333",
            fontSize: "0.6875rem",
            letterSpacing: "0.04em",
            marginTop: "40px",
            paddingTop: "20px",
            borderTop: "1px solid #1F1F1F",
          }}
        >
          constitution@jawwing.com
        </p>
      </main>
    </div>
  );
}
