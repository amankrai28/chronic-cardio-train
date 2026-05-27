"use client";

import { useState } from "react";
import type { DailyPlanDay, WeeklyPlanWeek } from "@/lib/plan-builder";
import { formatDateRange } from "@/lib/utils";
import { formatDistanceWithUnit, localizeText, type UnitSystem } from "@/lib/units";
import PhaseIndicator from "@/components/PhaseIndicator";
import DayRow from "@/components/DayRow";

type WeekCardProps = {
  week: WeeklyPlanWeek;
  days: DailyPlanDay[];
  defaultExpanded?: boolean;
  system?: UnitSystem;
};

const metaLabel: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  fontSize: 10,
  letterSpacing: 2,
  textTransform: "uppercase",
  color: "var(--mid-gray)",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", gap: 2 }}>
      <span style={metaLabel}>{label}</span>
      <span style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 16, fontWeight: 600 }}>
        {value}
      </span>
    </span>
  );
}

export default function WeekCard({ week, days, defaultExpanded = false, system = "metric" }: WeekCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div
      style={{
        border: "3px solid var(--ink)",
        background: "var(--newsprint)",
        outline: week.is_cutback ? "3px solid var(--accent)" : undefined,
        outlineOffset: week.is_cutback ? "-9px" : undefined,
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => setExpanded((v) => !v)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded((v) => !v);
          }
        }}
        aria-expanded={expanded}
        style={{
          minHeight: 44,
          cursor: "pointer",
          padding: "var(--space-4) var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--space-4)", flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "var(--font-display), monospace", fontWeight: 700, fontSize: 22 }}>
              WK {week.week}
            </span>
            <PhaseIndicator phase={week.phase} />
            <span style={metaLabel}>{formatDateRange(week.date_start)}</span>
            {week.is_cutback ? (
              <span
                style={{
                  fontFamily: "var(--font-mono), monospace",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 2,
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  border: "2px solid var(--accent)",
                  padding: "3px 8px",
                }}
              >
                Cutback
              </span>
            ) : null}
          </div>
          <span aria-hidden="true" style={{ fontFamily: "var(--font-display), monospace", fontWeight: 700, fontSize: 20 }}>
            {expanded ? "–" : "+"}
          </span>
        </div>

        <div style={{ display: "flex", gap: "var(--space-8)", flexWrap: "wrap" }}>
          <Stat label="Volume" value={formatDistanceWithUnit(week.total_volume_km, system)} />
          <Stat label="Long run" value={formatDistanceWithUnit(week.long_run_km, system)} />
          {week.b2b_km ? <Stat label="B2B" value={formatDistanceWithUnit(week.b2b_km, system)} /> : null}
          <Stat label="Quality" value={localizeText(week.quality_summary || "—", system)} />
          <Stat label="Strength" value={`${week.strength_sessions}×`} />
        </div>

        {week.notes ? (
          <p style={{ margin: 0, fontFamily: "var(--font-sans), sans-serif", fontSize: 14, color: "var(--mid-gray)", lineHeight: 1.5 }}>
            {localizeText(week.notes, system)}
          </p>
        ) : null}
      </div>

      {expanded ? (
        <div style={{ borderTop: "3px solid var(--ink)" }}>
          {days.map((d) => (
            <DayRow key={d.day} day={d} system={system} />
          ))}
        </div>
      ) : null}
    </div>
  );
}
