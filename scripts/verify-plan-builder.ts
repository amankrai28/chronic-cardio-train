/*
 * Standalone verification harness for the deterministic plan builder.
 *
 * Runs buildPlan() across many race / goal / length / injury / HR combinations
 * and asserts every hard constraint from docs/training-principles.md per week.
 * Pure: no Next.js, no Supabase, no network. Run with:
 *
 *   node --import ./scripts/register-alias.mjs scripts/verify-plan-builder.ts
 *
 * Exits non-zero if any constraint fails.
 */
import { buildPlan } from "@/lib/plan-builder";
import type { BuiltPlan, Phase } from "@/lib/plan-builder";
import type { AthleteMetricsRow, GoalType, RaceDistance } from "@/lib/metrics";

const LONG_RUN_CAP: Record<RaceDistance, number> = {
  "50K": 35, "50Mi": 42, "100K": 45, "100Mi": 50, "200Mi": 55,
};

const PEAK_BY: Record<string, Record<GoalType, number>> = {
  "50K": { finish: 70, beat_time: 85, compete: 95 },
  "100K": { finish: 95, beat_time: 115, compete: 130 },
  "100Mi": { finish: 100, beat_time: 120, compete: 140 },
};

const DAY = 86_400_000;

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function makeMetrics(opts: { hr: boolean; tenK: boolean }): AthleteMetricsRow {
  const hrZones = opts.hr
    ? {
        has_data: true as const,
        max_hr: 185,
        zone_distribution: { Z1: 5, Z2: 30, Z3: 35, Z4: 20, Z5: 5 },
        zone_percentages: { Z1: 5, Z2: 31, Z3: 36, Z4: 21, Z5: 5 },
        pct_easy: 36,
        pct_hard: 64,
        warning: {
          severity: "high",
          message: "64% of your runs are in Z3-Z5. For ultra training, 80% should be Z1-Z2.",
          target_hr: 139,
          instruction: "Easy runs: keep HR below 139 bpm.",
        },
        z2_hr_cap: 139,
      }
    : { has_data: false as const, message: "Insufficient HR data for zone analysis." };

  return {
    user_id: "test-user",
    total_runs: 300,
    total_distance_km: 4000,
    total_time_hours: 400,
    years_running: 5,
    current_weekly_avg_km: 45,
    current_runs_per_week: 5,
    current_avg_pace: 5.6,
    current_avg_hr: opts.hr ? 150 : null,
    max_recorded_hr: opts.hr ? 185 : null,
    peak_weekly_volume_km: 90,
    peak_monthly_volume_km: 320,
    longest_single_run_km: 45,
    longest_recent_run_km: 38,
    fastest_10k_time_seconds: opts.tenK ? 2700 : null,
    hr_zone_distribution: hrZones,
    strength_sessions_count: 20,
    strength_frequency_per_week: 1,
    detected_gaps: [],
    detected_races: [],
    seasonal_pattern: { best_month: null, worst_month: null, by_month: {} },
    cross_training: { weight_training_count: 20, strength_frequency_per_week: 1, other_types: [], by_type: {} },
    computed_at: new Date().toISOString(),
  };
}

// --- Assertion plumbing --------------------------------------------------

let totalChecks = 0;
let totalFailures = 0;
const failureMsgs: string[] = [];

function check(label: string, cond: boolean, detail: string) {
  totalChecks++;
  if (!cond) {
    totalFailures++;
    failureMsgs.push(`[FAIL] ${label}: ${detail}`);
  }
}

function parseRange(s: string): number {
  const m = s.split("-");
  if (m.length === 1) return 1;
  return Number(m[1]) - Number(m[0]) + 1;
}

// --- Per-plan verification ----------------------------------------------

function verify(label: string, plan: BuiltPlan, opts: {
  N: number;
  raceDistance: RaceDistance;
  peak: number;
  trainingDays: number;
  injury: boolean;
}) {
  const { N, raceDistance, peak, trainingDays, injury } = opts;
  const wk = plan.weekly_plan.weeks;
  const daily = plan.daily_plan.weeks;
  const cap = LONG_RUN_CAP[raceDistance];
  const growth = injury ? 1.07 : 1.10;

  check(label, plan.plan_weeks === N, `plan_weeks ${plan.plan_weeks} !== ${N}`);
  check(label, wk.length === N, `weekly weeks ${wk.length} !== ${N}`);
  check(label, daily.length === N, `daily weeks ${daily.length} !== ${N}`);

  // Phases sum to N, taper >= 2.
  const phases = plan.weekly_plan.plan_summary.phases;
  const phaseSum = phases.reduce((s, p) => s + parseRange(p.weeks), 0);
  check(label, phaseSum === N, `phase weeks sum ${phaseSum} !== ${N}`);
  const taper = phases.find((p) => p.name === "TAPER");
  if (N >= 5) {
    check(label, taper != null && parseRange(taper.weeks) >= 2, `taper < 2 weeks`);
  }

  // Ramp cap + cutbacks + taper shape.
  let lastNonCutback = -1;
  let cutbackCount = 0;
  let maxVol = 0;
  let lastRampVol = 0;
  const taperVols: number[] = [];

  for (let i = 0; i < wk.length; i++) {
    const w = wk[i];
    maxVol = Math.max(maxVol, w.total_volume_km);

    if (w.phase !== "TAPER") {
      lastRampVol = w.total_volume_km;
      if (w.is_cutback) {
        cutbackCount++;
        if (lastNonCutback > 0) {
          const ratio = w.total_volume_km / lastNonCutback;
          check(label, ratio >= 0.58 && ratio <= 0.72,
            `wk${w.week} cutback ratio ${ratio.toFixed(2)} outside 30-40% reduction`);
        }
      } else {
        if (lastNonCutback > 0) {
          check(label, w.total_volume_km <= Math.ceil(lastNonCutback * growth) + 1,
            `wk${w.week} ramp ${lastNonCutback}→${w.total_volume_km} exceeds ${(growth * 100 - 100).toFixed(0)}% cap`);
        }
        lastNonCutback = w.total_volume_km;
      }
    } else {
      taperVols.push(w.total_volume_km);
    }

    // Long-run cap (every week).
    check(label, w.long_run_km <= cap + 0.01,
      `wk${w.week} long run ${w.long_run_km} > cap ${cap}`);

    // B2B weekend <= 75% of volume; B2B never in taper / cutback.
    if (w.b2b_km != null) {
      check(label, w.phase !== "TAPER" && !w.is_cutback,
        `wk${w.week} B2B present in taper/cutback`);
      check(label, w.long_run_km + w.b2b_km <= 0.75 * w.total_volume_km + 0.5,
        `wk${w.week} weekend ${w.long_run_km}+${w.b2b_km} > 75% of ${w.total_volume_km}`);
    }

    // Strength session count by phase.
    if (w.phase === "TAPER") check(label, w.strength_sessions === 0, `wk${w.week} taper strength != 0`);
    else if (w.phase === "BUILD") check(label, w.strength_sessions === 1, `wk${w.week} build strength != 1`);
    else if (w.phase === "BASE") check(label, w.strength_sessions === (w.is_cutback ? 1 : 2), `wk${w.week} base strength ${w.strength_sessions}`);
    else check(label, w.strength_sessions === 0 || w.strength_sessions === 1, `wk${w.week} peak strength ${w.strength_sessions}`);
  }

  // Taper descends from achieved peak.
  if (taperVols.length >= 2) {
    for (let i = 1; i < taperVols.length; i++) {
      check(label, taperVols[i] <= taperVols[i - 1] + 0.01,
        `taper not non-increasing: ${taperVols.join(",")}`);
    }
    check(label, taperVols[0] <= 0.62 * lastRampVol + 0.5,
      `first taper ${taperVols[0]} not ~50% of ${lastRampVol}`);
    check(label, taperVols[taperVols.length - 1] <= 0.42 * lastRampVol + 0.5,
      `last taper ${taperVols[taperVols.length - 1]} not ~25% of ${lastRampVol}`);
  }

  // Cutbacks present for plans long enough to need them.
  const rampLen = wk.filter((w) => w.phase !== "TAPER").length;
  const cadence = injury ? 3 : 4;
  if (rampLen >= cadence + 2) {
    check(label, cutbackCount >= 1, `no cutback in ${rampLen} ramp weeks`);
  }

  // Peak reached, or a warning explains why not.
  const peakReached = maxVol >= peak - 1;
  const hasPeakWarning = plan.plan_metadata.warnings.some((w) => w.includes("safely possible"));
  check(label, peakReached || hasPeakWarning,
    `peak ${peak} not reached (max ${maxVol}) and no warning`);

  // Daily-level checks.
  for (let i = 0; i < daily.length; i++) {
    const dw = daily[i];
    const w = wk[i];
    const runDays = dw.days.filter((d) => d.type !== "rest");
    check(label, runDays.length === trainingDays,
      `wk${w.week} run days ${runDays.length} !== ${trainingDays}`);

    const sumKm = dw.days.reduce((s, d) => s + d.distance_km, 0);
    check(label, Math.abs(sumKm - w.total_volume_km) <= 0.6,
      `wk${w.week} daily sum ${sumKm.toFixed(1)} !== volume ${w.total_volume_km}`);

    const hardKm = dw.days.reduce((s, d) => s + (d.hard_km ?? 0), 0);
    check(label, hardKm <= 0.20 * w.total_volume_km + 0.01,
      `wk${w.week} hard ${hardKm.toFixed(1)} > 20% of ${w.total_volume_km}`);

    const strengthDays = dw.days.filter((d) => d.strength != null).length;
    check(label, strengthDays === w.strength_sessions,
      `wk${w.week} daily strength ${strengthDays} !== weekly ${w.strength_sessions}`);

    // No hard quality in PEAK / TAPER (only strides allowed).
    if (dw.phase === "PEAK" || dw.phase === "TAPER") {
      const hardQuality = dw.days.some((d) => d.type === "quality" && (d.hard_km ?? 0) > 2.5);
      check(label, !hardQuality, `wk${w.week} hard quality in ${dw.phase}`);
    }
  }
}

// --- Run the matrix ------------------------------------------------------

const NOW = new Date("2026-06-01T00:00:00Z");
const distances: RaceDistance[] = ["50K", "100K", "100Mi"];
const goals: GoalType[] = ["finish", "beat_time", "compete"];
const lengths = [12, 20, 26, 32];
const injuryOpts = [false, true];

let sample: BuiltPlan | null = null;

for (const dist of distances) {
  for (const goal of goals) {
    const peak = PEAK_BY[dist][goal];
    const start = Math.max(40, Math.min(peak - 10, Math.round((peak * 0.45) / 5) * 5));
    for (const N of lengths) {
      for (const injury of injuryOpts) {
        for (const hr of [true, false]) {
          const metrics = makeMetrics({ hr, tenK: hr });
          const raceDate = isoDate(addDays(NOW, N * 7));
          const plan = buildPlan(
            {
              race_name: `${dist} test`,
              race_distance: dist,
              race_date: raceDate,
              terrain: "trail",
              goal_type: goal,
              previous_time_seconds: null,
              target_time_seconds: null,
              start_volume_km: start,
              peak_volume_km: peak,
              training_days_per_week: 5,
              injury_conservative: injury,
              unit_system: "metric",
            },
            metrics,
            NOW,
          );
          const label = `${dist}/${goal}/N${N}/${injury ? "inj" : "std"}/${hr ? "hr" : "nohr"}`;
          verify(label, plan, { N, raceDistance: dist, peak, trainingDays: 5, injury });
          if (dist === "100K" && goal === "finish" && N === 26 && !injury && hr) sample = plan;
        }
      }
    }
  }
}

// Also exercise training-days 4 and 6 (host/strength edge cases).
for (const td of [4, 6]) {
  const metrics = makeMetrics({ hr: true, tenK: true });
  const plan = buildPlan(
    {
      race_name: "td test",
      race_distance: "100K",
      race_date: isoDate(addDays(NOW, 26 * 7)),
      terrain: "trail",
      goal_type: "finish",
      previous_time_seconds: null,
      target_time_seconds: null,
      start_volume_km: 50,
      peak_volume_km: 95,
      training_days_per_week: td,
      injury_conservative: false,
      unit_system: "metric",
    },
    metrics,
    NOW,
  );
  verify(`100K/finish/N26/td${td}`, plan, { N: 26, raceDistance: "100K", peak: 95, trainingDays: td, injury: false });
}

// --- Report --------------------------------------------------------------

console.log(`\nRan ${totalChecks} checks across the matrix.`);
if (totalFailures === 0) {
  console.log("✅ ALL CONSTRAINTS PASS\n");
} else {
  console.log(`❌ ${totalFailures} FAILURES:\n`);
  for (const m of failureMsgs.slice(0, 40)) console.log("  " + m);
  if (failureMsgs.length > 40) console.log(`  ...and ${failureMsgs.length - 40} more`);
  console.log("");
}

// --- Print a sample plan for eyeballing ----------------------------------

if (sample) {
  console.log("=== SAMPLE: 100K / finish / 26 weeks ===");
  console.log("Phases:", sample.weekly_plan.plan_summary.phases.map((p) => `${p.name} ${p.weeks}`).join(" | "));
  console.log("Key change:", sample.weekly_plan.plan_summary.key_change);
  console.log("Warnings:", sample.plan_metadata.warnings.length ? sample.plan_metadata.warnings : "(none)");
  console.log("\nWeekly volume / long / b2b / quality / strength / cutback:");
  for (const w of sample.weekly_plan.weeks) {
    console.log(
      `  W${String(w.week).padStart(2)} ${w.phase.padEnd(5)} ${String(w.total_volume_km).padStart(3)}km ` +
      `long ${String(w.long_run_km).padStart(4)} b2b ${String(w.b2b_km ?? "-").padStart(4)} ` +
      `S${w.strength_sessions} ${w.is_cutback ? "CUT" : "   "} | ${w.quality_summary}`,
    );
  }
  console.log("\nSample daily — Week 9 (build):");
  const w9 = sample.daily_plan.weeks.find((w) => w.week === 9);
  if (w9) {
    for (const d of w9.days) {
      console.log(
        `  ${d.day.padEnd(9)} ${d.type.padEnd(8)} ${String(d.distance_km).padStart(5)}km ` +
        `${(d.intensity ?? "").padEnd(20)} ${d.workout_details ? "| " + d.workout_details : d.strength ? "| " + d.strength : ""}`,
      );
    }
  }
}

process.exit(totalFailures === 0 ? 0 : 1);
