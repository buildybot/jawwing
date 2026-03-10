"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";

const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

function LoadingSkeleton() {
  return (
    <div style={{ background: "#000000", minHeight: "100vh", padding: "24px" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            style={{
              background: "#0A0A0A",
              border: "1px solid #1F1F1F",
              padding: "16px",
              marginBottom: "2px",
              height: "100px",
            }}
          >
            <div style={{ background: "#1A1A1A", height: "12px", marginBottom: "8px", width: `${65 + i * 7}%` }} />
            <div style={{ background: "#1A1A1A", height: "12px", marginBottom: "8px", width: "90%" }} />
            <div style={{ background: "#1A1A1A", height: "12px", width: "50%" }} />
          </div>
        ))}
        <p style={{ ...MONO, color: "#333333", fontSize: "0.625rem", letterSpacing: "0.1em", textAlign: "center", marginTop: "24px" }}>
          CHECKING AUTH...
        </p>
      </div>
    </div>
  );
}

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  if (isLoading) return <LoadingSkeleton />;
  if (!isAuthenticated) return <LoadingSkeleton />; // briefly shows while redirect fires

  return <>{children}</>;
}
