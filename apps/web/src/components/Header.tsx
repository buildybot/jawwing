"use client";

import Link from "next/link";

interface HeaderProps {
  location?: string;
}

export default function Header({ location = "LOCATING..." }: HeaderProps) {
  return (
    <header
      style={{
        background: "#000000",
        borderBottom: "1px solid #1F1F1F",
        position: "sticky",
        top: 0,
        zIndex: 40,
      }}
    >
      <div
        style={{ maxWidth: "480px" }}
        className="mx-auto flex items-center justify-between px-4 py-3"
      >
        <Link
          href="/"
          style={{
            fontFamily: "var(--font-mono), monospace",
            letterSpacing: "0.12em",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "0.875rem",
            textDecoration: "none",
          }}
        >
          JAWWING
        </Link>
        <span
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "#555555",
            fontSize: "0.6875rem",
            letterSpacing: "0.06em",
          }}
        >
          {location.toUpperCase()}
        </span>
      </div>
    </header>
  );
}
