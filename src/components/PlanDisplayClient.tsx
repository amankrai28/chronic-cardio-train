"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { DailyPlan, PlanMetadata, WeeklyPlan } from "@/lib/plan-builder";
import { formatTime } from "@/lib/metrics";
import VolumeChart from "@/components/VolumeChart";
import WeekCard from "@/components/WeekCard";
import PhaseIndicator from "@/components/PhaseIndicator";

export type PlanForDisplay = {
  id: string;
  race_name: string | null;
  race_distance: string;
  race_date: string;
  terrain: string | null;
  goal_type: string;
  previous_time_seconds: number | null;
  target_time_seconds: number | null;
  peak_volume_km: number;
  weekly_plan: WeeklyPlan;
  daily_plan: DailyPlan;
  plan_metadata: PlanMetadata;
};

const DISTANCE_LABELS: Record<string, string> = {
  "50K": "50K",
  "50Mi": "50 Mile",
  "100K": "100K",
  "100Mi": "100 Mile",
  "200Mi": "200 Mile+",
};

const GOAL_LABELS: Record<string, string> = {
  finish: "Just finish",
  beat_time: "Beat my last time",
  compete: "Compete for placement",
};

const TERRAIN_LABELS: Record<string, string> = {
  road: "Road / Flat",
  trail: "Trail / Rolling",
  mountain: "Mountain / Technical",
};

const MS_PER_WEEK = 7 * 86_400_000;

// Index of the week whose Monday→Sunday span contains today; clamps to the
// first/last week when today is before the plan starts or after it ends.
function currentWeekIndex(weekStarts: string[]): number {
  if (weekStarts.length === 0) return -1;
  const now = Date.now();
  const firstStart = new Date(weekStarts[0]).getTime();
  if (now < firstStart) return 0;
  for (let i = 0; i < weekStarts.length; i++) {
    const start = new Date(weekStarts[i]).getTime();
    if (now >= start && now < start + MS_PER_WEEK) return i;
  }
  return weekStarts.length - 1;
}

export default function PlanDisplayClient({ plan }: { plan: PlanForDisplay }) {
  const { weeks } = plan.weekly_plan;
  const summary = plan.weekly_plan.plan_summary;
  const distanceLabel = DISTANCE_LABELS[plan.race_distance] ?? plan.race_distance;

  // Match each weekly summary with its daily breakdown by week number.
  const dailyByWeek = useMemo(() => {
    const map = new Map<number, DailyPlan["weeks"][number]>();
    for (const dw of plan.daily_plan.weeks) map.set(dw.week, dw);
    return map;
  }, [plan.daily_plan]);

  const currentIdx = useMemo(
    () => currentWeekIndex(weeks.map((w) => w.date_start)),
    [weeks],
  );

  const keyChange = plan.plan_metadata?.key_change ?? summary.key_change;
  const warnings = plan.plan_metadata?.warnings ?? [];

  return (
    <section
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "var(--space-12) 30px var(--space-20)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-8)",
      }}
    >
      {/* --- Summary header --- */}
      <div>
        <p className="caption" style={{ color: "var(--accent)" }}>
          YOUR TRAINING PLAN
        </p>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", margin: "var(--space-4) 0 var(--space-3)" }}>
          {plan.race_name || `${distanceLabel} Plan`}
        </h1>
        <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, letterSpacing: 1, color: "var(--mid-gray)" }}>
          {distanceLabel} · {plan.race_date}
          {plan.terrain ? ` · ${TERRAIN_LABELS[plan.terrain] ?? plan.terrain}` : ""}
          {` · ${GOAL_LABELS[plan.goal_type] ?? plan.goal_type}`}
          {plan.previous_time_seconds ? ` · PR ${formatTime(plan.previous_time_seconds)}` : ""}
          {plan.target_time_seconds ? ` · Target ${formatTime(plan.target_time_seconds)}` : ""}
        </p>
      </div>

      {/* --- The #1 coaching insight --- */}
      {keyChange ? (
        <div style={{ background: "var(--ink)", color: "var(--newsprint)", padding: "var(--space-8)", border: "3px solid var(--ink)" }}>
          <span className="caption" style={{ color: "var(--accent)" }}>
            THE #1 THING TO CHANGE
          </span>
          <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 19, lineHeight: 1.5, margin: "var(--space-3) 0 0" }}>
            {keyChange}
          </p>
        </div>
      ) : null}

      {/* --- Phase breakdown --- */}
      <div>
        <span className="caption" style={{ display: "block", marginBottom: "var(--space-4)" }}>
          {summary.total_weeks}-Week Periodization
        </span>
        <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap" }}>
          {summary.phases.map((p) => (
            <PhaseIndicator key={p.name} phase={p.name} weeks={p.weeks} focus={p.focus} />
          ))}
        </div>
      </div>

      {/* --- Warnings --- */}
      {warnings.length > 0 ? (
        <div style={{ border: "3px solid var(--accent)", padding: "var(--space-4) var(--space-6)" }}>
          <span className="caption" style={{ color: "var(--accent)", display: "block", marginBottom: "var(--space-2)" }}>
            Heads up
          </span>
          <ul style={{ margin: 0, paddingLeft: "var(--space-6)", fontFamily: "var(--font-sans), sans-serif", fontSize: 15, lineHeight: 1.6 }}>
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* --- Export --- */}
      <div style={{ display: "flex", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <a href={`/plan/${plan.id}/export?format=pdf`} target="_blank" rel="noopener noreferrer" className="btn-primary">
          Export PDF
        </a>
        <a href={`/plan/${plan.id}/export?format=ics`} className="btn-orange">
          Add to Calendar (iCal)
        </a>
      </div>

      {/* --- Volume chart --- */}
      <VolumeChart weeks={weeks} peak={plan.peak_volume_km} />

      {/* --- Weekly cards --- */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        {weeks.map((w, i) => (
          <WeekCard
            key={w.week}
            week={w}
            days={dailyByWeek.get(w.week)?.days ?? []}
            defaultExpanded={i === currentIdx}
          />
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-4)" }}>
        <Link href="/plan/setup" className="btn-primary">
          ← Adjust parameters
        </Link>
      </div>
    </section>
  );
}
