export default function FeedLoading() {
  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      {/* Skeleton header */}
      <div style={{ borderBottom: "1px solid #1F1F1F", padding: "0 16px", height: "48px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div className="animate-pulse" style={{ background: "#141414", width: "80px", height: "12px" }} />
        <div className="animate-pulse" style={{ background: "#141414", width: "100px", height: "12px" }} />
      </div>

      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        {/* Skeleton tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1F1F1F", padding: "0 16px" }}>
          {["60px", "50px", "50px"].map((w, i) => (
            <div key={i} style={{ padding: "12px 16px 12px 0" }}>
              <div className="animate-pulse" style={{ background: "#141414", width: w, height: "10px" }} />
            </div>
          ))}
        </div>

        {/* Skeleton post cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "2px", paddingTop: "2px" }}>
          {[85, 75, 90, 70, 80].map((firstLineWidth, i) => (
            <div
              key={i}
              style={{
                background: "#0A0A0A",
                border: "1px solid #1F1F1F",
                padding: "16px",
              }}
            >
              <div className="animate-pulse" style={{ background: "#141414", height: "14px", marginBottom: "8px", width: `${firstLineWidth}%` }} />
              <div className="animate-pulse" style={{ background: "#141414", height: "14px", marginBottom: "8px", width: "95%" }} />
              {i % 2 === 0 && (
                <div className="animate-pulse" style={{ background: "#141414", height: "14px", marginBottom: "8px", width: "70%" }} />
              )}
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "16px" }}>
                <div className="animate-pulse" style={{ background: "#141414", height: "10px", width: "60px" }} />
                <div className="animate-pulse" style={{ background: "#141414", height: "10px", width: "80px" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
