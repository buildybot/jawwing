const MONO = { fontFamily: "var(--font-mono), monospace" } as const;

export default function PostLoading() {
  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      {/* Nav skeleton */}
      <div style={{ borderBottom: "1px solid #1F1F1F", padding: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
        <div className="animate-pulse" style={{ background: "#141414", width: "50px", height: "10px" }} />
        <span style={{ color: "#1F1F1F", ...MONO }}>|</span>
        <div className="animate-pulse" style={{ background: "#141414", width: "70px", height: "12px" }} />
      </div>

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Post skeleton */}
        <div style={{ background: "#0A0A0A", border: "1px solid #1F1F1F", margin: "2px 0", padding: "20px 16px" }}>
          <div className="animate-pulse" style={{ background: "#141414", height: "14px", marginBottom: "10px", width: "90%" }} />
          <div className="animate-pulse" style={{ background: "#141414", height: "14px", marginBottom: "10px", width: "80%" }} />
          <div className="animate-pulse" style={{ background: "#141414", height: "14px", marginBottom: "20px", width: "65%" }} />
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div className="animate-pulse" style={{ background: "#141414", height: "10px", width: "80px" }} />
            <div className="animate-pulse" style={{ background: "#141414", height: "10px", width: "100px" }} />
          </div>
        </div>

        {/* Replies header skeleton */}
        <div style={{ borderBottom: "1px solid #1F1F1F", padding: "12px 16px" }}>
          <div className="animate-pulse" style={{ background: "#141414", height: "8px", width: "80px" }} />
        </div>

        {/* Reply skeletons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1px" }}>
          {[75, 60, 85].map((w, i) => (
            <div key={i} style={{ background: "#0A0A0A", borderBottom: "1px solid #1F1F1F", padding: "14px 16px" }}>
              <div className="animate-pulse" style={{ background: "#141414", height: "13px", marginBottom: "8px", width: `${w}%` }} />
              {i === 0 && <div className="animate-pulse" style={{ background: "#141414", height: "13px", marginBottom: "8px", width: "90%" }} />}
              <div className="animate-pulse" style={{ background: "#141414", height: "8px", width: "50px" }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
