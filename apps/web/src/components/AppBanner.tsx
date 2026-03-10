"use client";

import { useState, useEffect } from "react";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;
const DISMISS_KEY = "jawwing_app_banner_dismissed";

// Toggle this to true once the app is live on the App Store
const APP_STORE_LIVE = false;

export default function AppBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show only on mobile screens; hide if dismissed
    const isMobile = window.innerWidth < 768;
    let dismissed = false;
    try { dismissed = !!localStorage.getItem(DISMISS_KEY); } catch { /* noop */ }
    setVisible(isMobile && !dismissed);
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* noop */ }
  };

  if (!visible || !APP_STORE_LIVE) return null;

  return (
    <div
      style={{
        background: "#0A0A0A",
        borderBottom: "1px solid #1F1F1F",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 16px",
        gap: "12px",
      }}
    >
      <a
        href="https://jawwing.com"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          ...MONO,
          color: "#FFFFFF",
          fontSize: "0.6875rem",
          letterSpacing: "0.1em",
          fontWeight: 700,
          textDecoration: "none",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flex: 1,
        }}
      >
        <span style={{ fontSize: "1rem" }}>📲</span>
        <span>GET THE APP</span>
        <span style={{ color: "#555555", fontWeight: 400 }}>→ jawwing.com</span>
      </a>
      <button
        onClick={dismiss}
        style={{
          background: "none",
          border: "none",
          color: "#555555",
          cursor: "pointer",
          fontSize: "0.875rem",
          padding: "2px 4px",
          lineHeight: 1,
          flexShrink: 0,
        }}
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
