import type { DailyPlanDay, DayType } from "@/lib/plan-builder";
import { formatShortDate } from "@/lib/utils";
import { formatDistanceWithUnit, localizeText, type UnitSystem } from "@/lib/units";

// Run-type accents stay within ink / newsprint / Signal Orange + grays.
// The left border + chip treatment encodes type without introducing new hues.
const TYPE_META: Record<DayType, { label: string; border: string; chip: React.CSSProperties }> = {
  rest: {
    label: "REST",
    border: "var(--light-gray)",
    chip: { background: "var(--light-gray)", color: "var(--mid-gray)" },
  },
  easy: {
    label: "EASY",
    border: "var(--ink)",
    chip: { background: "var(--newsprint)", color: "var(--ink)", border: "2px solid var(--ink)" },
  },
  recovery: {
    label: "RECOVERY",
    border: "var(--mid-gray)",
    chip: { background: "var(--newsprint)", color: "var(--mid-gray)", border: "2px solid var(--mid-gray)" },
  },
  quality: {
    label: "QUALITY",
    border: "var(--accent)",
    chip: { background: "var(--accent)", color: "var(--newsprint)" },
  },
  long: {
    label: "LONG",
    border: "var(--ink)",
    chip: { background: "var(--ink)", color: "var(--newsprint)" },
  },
  b2b: {
    label: "B2B",
    border: "var(--accent)",
    chip: { background: "var(--newsprint)", color: "var(--accent)", border: "2px solid var(--accent)" },
  },
};

function formatMinutes(min: number): string {
  if (!min || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

const chipBase: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 2,
  textTransform: "uppercase",
  padding: "3px 8px",
  whiteSpace: "nowrap",
};

const labelStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono), monospace",
  fontSize: 11,
  letterSpacing: 1,
  color: "var(--mid-gray)",
  textTransform: "uppercase",
};

export default function DayRow({ day, system = "metric" }: { day: DailyPlanDay; system?: UnitSystem }) {
  const meta = TYPE_META[day.type];
  const isRest = day.type === "rest";

  return (
    <div
      style={{
        borderLeft: `6px solid ${meta.border}`,
        borderBottom: "1px solid var(--light-gray)",
        padding: "var(--space-3) var(--space-4)",
        display: "flex",
        flexDirection: "column",
        gap: isRest ? 0 : 6,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)", flexWrap: "wrap" }}>
        <span style={{ ...labelStyle, minWidth: 96, color: "var(--ink)", fontWeight: 700 }}>
          {day.day}
        </span>
        <span style={labelStyle}>{formatShortDate(day.date)}</span>
        <span style={{ ...chipBase, ...meta.chip }}>{meta.label}</span>
        {!isRest ? (
          <span style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 15, fontWeight: 600 }}>
            {day.distance_km > 0 ? formatDistanceWithUnit(day.distance_km, system) : ""}
            {day.time_minutes > 0 ? ` · ${formatMinutes(day.time_minutes)}` : ""}
            {day.intensity ? ` · ${localizeText(day.intensity, system)}` : ""}
          </span>
        ) : (
          <span style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 15, color: "var(--mid-gray)" }}>
            {localizeText(day.description || "Full rest", system)}
          </span>
        )}
      </div>

      {!isRest && day.description ? (
        <p style={{ margin: 0, fontFamily: "var(--font-sans), sans-serif", fontSize: 15 }}>
          {localizeText(day.description, system)}
        </p>
      ) : null}

      {day.workout_details ? (
        <p
          style={{
            margin: 0,
            fontFamily: "var(--font-mono), monospace",
            fontSize: 13,
            color: "var(--ink)",
            background: "var(--light-gray)",
            padding: "8px 10px",
            lineHeight: 1.5,
          }}
        >
          {localizeText(day.workout_details, system)}
        </p>
      ) : null}

      {day.strength ? (
        <p style={{ margin: 0, fontFamily: "var(--font-sans), sans-serif", fontSize: 14 }}>
          <span style={{ ...labelStyle, color: "var(--accent)" }}>Strength · </span>
          {localizeText(day.strength, system)}
        </p>
      ) : null}

      {day.notes ? (
        <p style={{ margin: 0, fontFamily: "var(--font-sans), sans-serif", fontSize: 14, color: "var(--mid-gray)", fontStyle: "italic" }}>
          {localizeText(day.notes, system)}
        </p>
      ) : null}
    </div>
  );
}
