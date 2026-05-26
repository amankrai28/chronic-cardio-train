import Link from "next/link";

export default function Header() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "18px 30px",
        background: "var(--newsprint)",
        borderBottom: "3px solid var(--ink)",
      }}
    >
      <Link href="/" className="wordmark" style={{ fontSize: 16, textDecoration: "none" }}>
        CHRONIC CARD<span className="accent-i">I</span>O
      </Link>
      <span className="caption" style={{ fontSize: 11 }}>
        TRAINING PLANS
      </span>
    </header>
  );
}
