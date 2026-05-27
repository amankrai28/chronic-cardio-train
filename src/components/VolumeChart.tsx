import type { WeeklyPlanWeek } from "@/lib/plan-builder";

type VolumeChartProps = {
  weeks: WeeklyPlanWeek[];
  peak: number;
};

// Hand-built SVG bar chart — sharp rectangles, no gradients/shadows, on-brand.
// Signal Orange bars; cutback weeks are hollow (outlined) to read as distinct;
// a dashed ink line marks the peak-volume target.
export default function VolumeChart({ weeks, peak }: VolumeChartProps) {
  const slot = 34;
  const padLeft = 12;
  const padRight = 12;
  const padTop = 24;
  const plotH = 220;
  const labelH = 30;

  const width = padLeft + padRight + weeks.length * slot;
  const height = padTop + plotH + labelH;
  const baselineY = padTop + plotH;

  const maxVol = weeks.reduce((m, w) => Math.max(m, w.total_volume_km), 0);
  const scaleMax = Math.max(maxVol, peak) * 1.08 || 1;
  const y = (v: number) => baselineY - (v / scaleMax) * plotH;
  const peakY = y(peak);

  const barW = slot * 0.62;
  const barGap = (slot - barW) / 2;

  // Thin x-axis labels when the plan is long, so they never overlap.
  const labelEvery = weeks.length > 22 ? 4 : weeks.length > 14 ? 2 : 1;

  const monoLabel = {
    fontFamily: "var(--font-mono), monospace",
    fontSize: "10px",
    letterSpacing: "1px",
  } as const;

  return (
    <div style={{ border: "3px solid var(--ink)", background: "var(--newsprint)", padding: "var(--space-6)" }}>
      <span className="caption" style={{ display: "block", marginBottom: "var(--space-4)" }}>
        Volume Progression (km / week)
      </span>
      <div style={{ overflowX: "auto" }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          width="100%"
          style={{ minWidth: Math.min(width, 320), display: "block" }}
          role="img"
          aria-label={`Weekly volume across ${weeks.length} weeks, peaking near ${peak} km`}
        >
          {/* peak reference line */}
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={peakY}
            y2={peakY}
            stroke="var(--ink)"
            strokeWidth={2}
            strokeDasharray="6 5"
          />
          <text x={padLeft + 2} y={peakY - 5} fill="var(--ink)" fontWeight={700} style={monoLabel}>
            PEAK {peak}
          </text>

          {weeks.map((w, i) => {
            const x = padLeft + i * slot + barGap;
            const topY = y(w.total_volume_km);
            const barH = baselineY - topY;
            return (
              <g key={w.week}>
                <rect
                  x={x}
                  y={topY}
                  width={barW}
                  height={Math.max(barH, 0)}
                  fill={w.is_cutback ? "var(--newsprint)" : "var(--accent)"}
                  stroke="var(--accent)"
                  strokeWidth={w.is_cutback ? 3 : 0}
                />
                {i % labelEvery === 0 ? (
                  <text
                    x={x + barW / 2}
                    y={baselineY + 16}
                    textAnchor="middle"
                    fill="var(--mid-gray)"
                    style={monoLabel}
                  >
                    {w.week}
                  </text>
                ) : null}
              </g>
            );
          })}

          {/* baseline / x-axis */}
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={baselineY}
            y2={baselineY}
            stroke="var(--ink)"
            strokeWidth={3}
          />
        </svg>
      </div>
      <div style={{ display: "flex", gap: "var(--space-6)", marginTop: "var(--space-4)", flexWrap: "wrap" }}>
        <LegendSwatch fill="var(--accent)" label="Build week" />
        <LegendSwatch fill="var(--newsprint)" border label="Cutback week" />
      </div>
    </div>
  );
}

function LegendSwatch({ fill, border, label }: { fill: string; border?: boolean; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span
        style={{
          width: 14,
          height: 14,
          background: fill,
          border: border ? "3px solid var(--accent)" : "none",
          display: "inline-block",
        }}
      />
      <span className="caption" style={{ letterSpacing: 1 }}>{label}</span>
    </span>
  );
}
