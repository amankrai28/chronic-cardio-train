import type { Phase } from "@/lib/plan-builder";

// Phase chips stay within the brand palette (ink / newsprint / accent + grays).
// Each phase is distinguished by fill/outline treatment, not a new hue, so we
// never break the "Signal Orange is the only accent" rule.
const PHASE_STYLE: Record<Phase, React.CSSProperties> = {
  BASE: {
    background: "var(--newsprint)",
    color: "var(--ink)",
    border: "3px solid var(--ink)",
  },
  BUILD: {
    background: "var(--light-gray)",
    color: "var(--ink)",
    border: "3px solid var(--ink)",
  },
  PEAK: {
    background: "var(--ink)",
    color: "var(--newsprint)",
    border: "3px solid var(--ink)",
  },
  TAPER: {
    background: "var(--newsprint)",
    color: "var(--accent)",
    border: "3px solid var(--accent)",
  },
};

type PhaseIndicatorProps = {
  phase: Phase;
  weeks?: string;
  focus?: string;
};

export default function PhaseIndicator({ phase, weeks, focus }: PhaseIndicatorProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: 2,
        padding: "6px 12px",
        fontFamily: "var(--font-mono), monospace",
        fontSize: 11,
        letterSpacing: 2,
        textTransform: "uppercase",
        ...PHASE_STYLE[phase],
      }}
    >
      <span style={{ fontWeight: 700, letterSpacing: 3 }}>
        {phase}
        {weeks ? ` · WK ${weeks}` : ""}
      </span>
      {focus ? (
        <span style={{ fontSize: 10, letterSpacing: 1, opacity: 0.85 }}>{focus}</span>
      ) : null}
    </span>
  );
}
