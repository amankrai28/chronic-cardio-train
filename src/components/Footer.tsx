export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "3px solid var(--ink)",
        padding: "var(--space-12) 30px var(--space-8)",
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--space-8)",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <span className="wordmark" style={{ fontSize: 14 }}>
          CHRONIC CARD<span className="accent-i">I</span>O
        </span>
        <span className="caption" style={{ fontSize: 11 }}>
          OPEN SOURCE ENDURANCE · MIT LICENSED
        </span>
      </div>

      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--space-8)",
          alignItems: "center",
        }}
      >
        <a
          href="https://chroniccardio.com"
          className="caption"
          style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
        >
          ← CHRONICCARDIO.COM
        </a>
        <a
          href="https://github.com/amankrai28/chronic-cardio-train/tree/main/docs"
          className="caption"
          style={{ minHeight: 44, display: "inline-flex", alignItems: "center" }}
        >
          METHODOLOGY
        </a>
        {/* Strava attribution required by their brand guidelines. Replace with the
            official "Powered by Strava" logo asset before production launch. */}
        <a
          href="https://www.strava.com"
          target="_blank"
          rel="noopener noreferrer"
          className="caption"
          style={{
            minHeight: 44,
            display: "inline-flex",
            alignItems: "center",
            color: "var(--accent)",
          }}
        >
          POWERED BY STRAVA
        </a>
      </nav>
    </footer>
  );
}
