import type { AthleteMetricsRow, GoalType, RaceDistance } from "@/lib/metrics";
import { formatPace } from "@/lib/utils";
import type { UnitSystem } from "@/lib/units";

// Deterministic ultramarathon plan generator. Implements the rules in
// docs/training-principles.md (§3-§10). No AI is used here — every decision is
// coded, so Strava data never reaches a model (Strava agreement §2.14.4).

// --- Types ---------------------------------------------------------------

export type Phase = "BASE" | "BUILD" | "PEAK" | "TAPER";
export type DayType = "rest" | "easy" | "recovery" | "quality" | "long" | "b2b";

export type DailyPlanDay = {
  day: string;
  date: string;
  type: DayType;
  description: string;
  distance_km: number;
  time_minutes: number;
  intensity: string | null;
  workout_details: string | null;
  strength: string | null;
  notes: string | null;
  // Z3+ ("hard") kilometres in this session — only set for quality days, else
  // null. Long/easy/recovery/B2B are aerobic and count as easy for the 80/20 rule.
  hard_km: number | null;
};

export type WeeklyPlanWeek = {
  week: number;
  phase: Phase;
  date_start: string;
  total_volume_km: number;
  long_run_km: number;
  b2b_km: number | null;
  quality_summary: string;
  strength_sessions: number;
  notes: string;
  is_cutback: boolean;
};

export type PlanPhaseSummary = { name: Phase; weeks: string; focus: string };

export type PlanSummary = {
  total_weeks: number;
  phases: PlanPhaseSummary[];
  key_change: string;
};

export type WeeklyPlan = {
  plan_summary: PlanSummary;
  weeks: WeeklyPlanWeek[];
};

export type DailyPlanWeek = {
  week: number;
  phase: Phase;
  date_start: string;
  days: DailyPlanDay[];
};

export type DailyPlan = {
  weeks: DailyPlanWeek[];
};

export type PlanMetadata = {
  key_change: string;
  phases: PlanPhaseSummary[];
  principles_applied: string[];
  warnings: string[];
  // Display-only: which units the plan should render in. The plan itself is
  // always stored in metric — this just records the athlete's preference.
  unit_system: UnitSystem;
};

export type PlanBuilderParams = {
  race_name: string | null;
  race_distance: RaceDistance;
  race_date: string; // ISO date (YYYY-MM-DD)
  terrain: string | null;
  goal_type: GoalType;
  previous_time_seconds: number | null;
  target_time_seconds: number | null;
  start_volume_km: number;
  peak_volume_km: number;
  training_days_per_week: number;
  injury_conservative: boolean;
  unit_system: UnitSystem;
};

export type BuiltPlan = {
  plan_weeks: number;
  weekly_plan: WeeklyPlan;
  daily_plan: DailyPlan;
  plan_metadata: PlanMetadata;
};

// --- Constants -----------------------------------------------------------

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

const DAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday",
];

// Hard upper bound for a single long run, by race distance (§5).
const LONG_RUN_CAP: Record<RaceDistance, number> = {
  "50K": 35,
  "50Mi": 42,
  "100K": 45,
  "100Mi": 50,
  "200Mi": 55,
};

const PHASE_FOCUS: Record<Phase, string> = {
  BASE: "Z2 discipline + speed stimulus",
  BUILD: "Volume ramp + back-to-backs",
  PEAK: "Race-specific endurance",
  TAPER: "Freshness + sharpening",
};

const NUTRITION_NOTE: Record<Phase, string> = {
  BASE: "Start thinking about your race nutrition plan.",
  BUILD: "Practice 200-250 cal/hr on every long run. Same food you'll race with.",
  PEAK: "Nutrition plan must be LOCKED by now. If it's not working, fix it this week.",
  TAPER: "You know what works. Trust it. Don't experiment.",
};

const INJURY_NON_NEGOTIABLE =
  "If pain returns → instant cutback week. No exceptions. Missing one week of " +
  "training is nothing. Missing the race is everything.";

// --- Small helpers -------------------------------------------------------

const round1 = (n: number) => Math.round(n * 10) / 10;
const round = (n: number) => Math.round(n);
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

function mondayOf(d: Date): Date {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = date.getUTCDay(); // 0=Sun..6=Sat
  const offset = dow === 0 ? -6 : 1 - dow; // shift back to Monday
  date.setUTCDate(date.getUTCDate() + offset);
  return date;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// --- Phase allocation (§3) ----------------------------------------------

type PhaseAllocation = { base: number; build: number; peak: number; taper: number };

export function allocatePhases(totalWeeks: number, injuryConservative: boolean): PhaseAllocation {
  const N = Math.max(1, totalWeeks);

  // Degenerate short plans: collapse toward taper/peak but stay valid.
  if (N <= 4) {
    const taper = Math.min(2, N);
    const remaining = N - taper;
    const peak = Math.max(0, Math.min(remaining, Math.ceil(remaining / 2)));
    const build = Math.max(0, remaining - peak);
    return { base: 0, build, peak, taper };
  }

  // Taper: 10-15% of plan, min 2 weeks, leave ≥1 week each for base/build/peak.
  let taper = clamp(round(N * 0.13), 2, N - 3);
  let base = round(N * 0.28);
  if (injuryConservative) base += 2; // §9: extend base when injury history present
  let build = round(N * 0.32);
  let peak = N - taper - base - build;

  // Reconcile: every phase ≥1, sum === N. Pull excess from the largest phase.
  const enforceMin = () => {
    base = Math.max(1, base);
    build = Math.max(1, build);
    peak = Math.max(1, peak);
    taper = Math.max(2, taper);
  };
  enforceMin();

  let sum = base + build + peak + taper;
  // Trim or grow BUILD/PEAK to hit N exactly without violating minimums.
  while (sum > N) {
    if (build > 1) build--;
    else if (peak > 1) peak--;
    else if (base > 1) base--;
    else if (taper > 2) taper--;
    else break;
    sum = base + build + peak + taper;
  }
  while (sum < N) {
    build++;
    sum = base + build + peak + taper;
  }

  return { base, build, peak, taper };
}

function phaseForWeek(weekIdx: number, alloc: PhaseAllocation): Phase {
  // weekIdx is 0-based.
  if (weekIdx < alloc.base) return "BASE";
  if (weekIdx < alloc.base + alloc.build) return "BUILD";
  if (weekIdx < alloc.base + alloc.build + alloc.peak) return "PEAK";
  return "TAPER";
}

// --- Volume curve (§4) ---------------------------------------------------

type WeekVolume = { volume: number; isCutback: boolean };

const TAPER_MULTIPLIERS: Record<number, number[]> = {
  1: [0.5],
  2: [0.5, 0.35],
  3: [0.5, 0.35, 0.25],
  4: [0.55, 0.45, 0.35, 0.25],
};

function taperMultipliers(count: number): number[] {
  if (TAPER_MULTIPLIERS[count]) return TAPER_MULTIPLIERS[count];
  // For longer tapers, interpolate from 0.55 down to 0.25.
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(round1(0.55 - (0.3 * i) / Math.max(1, count - 1)));
  }
  return out;
}

export function buildVolumeCurve(
  start: number,
  peak: number,
  alloc: PhaseAllocation,
  injuryConservative: boolean,
): WeekVolume[] {
  const N = alloc.base + alloc.build + alloc.peak + alloc.taper;
  const growth = injuryConservative ? 1.07 : 1.10;
  const cadence = injuryConservative ? 3 : 4; // cutback every N weeks
  const rampWeeks = alloc.base + alloc.build + alloc.peak;

  const curve: WeekVolume[] = [];

  // BASE → BUILD → PEAK is ONE continuous ramp toward peak with periodic
  // cutbacks. Growth is capped per week (the safety cap wins over "reach peak"),
  // so volume plateaus at peak once reached and holds through the peak phase —
  // never a >cap jump at a phase boundary.
  let baseVol = Math.min(start, peak);
  let sinceCutback = 0;
  for (let i = 0; i < rampWeeks; i++) {
    const isFirst = i === 0;
    const isLastRamp = i === rampWeeks - 1;
    sinceCutback++;
    // Cutback every `cadence` weeks, but never on week 1 or the final ramp week
    // (so the taper begins from a solid week, not a dip).
    const wantCutback = sinceCutback >= cadence && !isFirst && !isLastRamp;
    if (wantCutback) {
      curve.push({ volume: round(baseVol * 0.65), isCutback: true });
      sinceCutback = 0;
      continue;
    }
    if (!isFirst) baseVol = Math.min(peak, baseVol * growth); // §4: resume pre-cutback then add
    // baseVol compounds unrounded so growth is exactly ≤ the cap; we round only
    // for the prescribed weekly number (±0.5 km presentation noise).
    curve.push({ volume: round(baseVol), isCutback: false });
  }

  // TAPER: progressive reduction off the achieved peak (the last ramp week),
  // so there's never an upward jump into the taper.
  const taperBase = curve.length ? curve[curve.length - 1].volume : peak;
  const mult = taperMultipliers(alloc.taper);
  for (let i = 0; i < alloc.taper; i++) {
    curve.push({ volume: round(taperBase * mult[i]), isCutback: false });
  }

  return curve.slice(0, N);
}

// --- Pace derivation (§6 / quality) -------------------------------------

type Paces = {
  easy: number; // min/km
  tempo: number;
  interval: number;
  progressionStart: number;
  progressionEnd: number;
};

const DEFAULT_EASY_PACE = 6.0;

function derivePaces(metrics: AthleteMetricsRow): { paces: Paces; warnings: string[] } {
  const warnings: string[] = [];
  const easy = metrics.current_avg_pace && metrics.current_avg_pace > 0
    ? metrics.current_avg_pace
    : DEFAULT_EASY_PACE;

  let tempo: number;
  let interval: number;
  if (metrics.fastest_10k_time_seconds && metrics.fastest_10k_time_seconds > 0) {
    // 10K-anchored, ratio-based.
    const tenKPace = metrics.fastest_10k_time_seconds / 60 / 10;
    tempo = round1(tenKPace * 1.10);
    interval = round1(tenKPace * 0.97);
  } else {
    // Fall back to fixed offsets from easy pace only when no 10K data exists.
    tempo = round1(easy - 0.6);
    interval = round1(easy - 1.3);
  }

  // Sanity flags: implausibly fast, or quality not differentiated from easy.
  if (interval < 4.5) {
    warnings.push(
      `Computed interval pace (${formatPace(interval)}/km) is faster than 4:30/km. ` +
      `Treat prescribed paces as a ceiling, not a target — run by effort.`,
    );
  }
  if (interval >= easy * 0.9) {
    warnings.push(
      `Quality pace (${formatPace(interval)}/km) is close to your easy pace ` +
      `(${formatPace(easy)}/km). Limited speed data — run quality sessions by ` +
      `feel (comfortably hard) rather than chasing the number.`,
    );
  }

  return {
    paces: {
      easy,
      tempo,
      interval,
      progressionStart: easy,
      progressionEnd: round1(easy - 0.4),
    },
    warnings,
  };
}

// --- Quality workout (§6) ------------------------------------------------

type Quality = { summary: string; details: string; hardKm: number };

// Base-phase speed rotation. hardKm = the Z3+ portion (excludes WU/CD).
function baseQuality(weekIdx: number, paces: Paces): Quality {
  const variant = weekIdx % 3;
  const p = formatPace(paces.interval);
  if (variant === 0) {
    return {
      summary: `6x800m @ ${p}/km`,
      details: `2 km WU Z2 → 6x800m @ ${p}/km with 400m jog recovery → 2 km CD`,
      hardKm: 4.8,
    };
  }
  if (variant === 1) {
    return {
      summary: "8-10x hill strides",
      details: "2 km WU Z2 → 8-10x 60-90s uphill hard (jog-down recovery) → 2 km CD",
      hardKm: 3,
    };
  }
  return {
    summary: "8x strides + short reps",
    details: `2 km WU Z2 → 8x100m strides → 5x400m @ ${p}/km (200m jog) → 2 km CD`,
    hardKm: 2,
  };
}

// Build-phase tempo/threshold rotation.
function buildQuality(weekIdx: number, paces: Paces): Quality {
  const variant = weekIdx % 2;
  if (variant === 0) {
    const t = formatPace(paces.tempo);
    return {
      summary: `20-25min tempo @ ${t}/km`,
      details: `2 km WU Z2 → 20-25min continuous @ ${t}/km (Z3) → 2 km CD`,
      hardKm: 4.5,
    };
  }
  const s = formatPace(paces.progressionStart);
  const e = formatPace(paces.progressionEnd);
  return {
    summary: `Progression run ${s}→${e}/km`,
    details: `Progression run: start easy @ ${s}/km, finish last third @ ${e}/km (Z3)`,
    hardKm: 4,
  };
}

// --- Strength (§7) -------------------------------------------------------

const STRENGTH_A =
  "Session A (lower-body compound): 3x8 squats, 3x8 single-leg RDL, " +
  "3x12 eccentric calf raises, 3x30s plank.";
const STRENGTH_B =
  "Session B (running-specific): 3x10/side step-ups, 3x12 single-leg calf raises, " +
  "3x10 lunges, pallof press + dead bugs.";
const STRENGTH_MAINT =
  "Maintenance: single-leg focus + core. Reduce load, keep movement patterns. 25-35min.";
const STRENGTH_PEAK = "Bodyweight only: core maintenance + mobility. Keep it light.";

function strengthSessionsFor(
  phase: Phase,
  weekIdx: number,
  totalWeeks: number,
  isCutback: boolean,
): number {
  if (phase === "TAPER") return 0;
  if (phase === "PEAK") {
    // Drop entirely 3-4 weeks before the race.
    const weeksToRace = totalWeeks - 1 - weekIdx;
    return weeksToRace <= 3 ? 0 : 1;
  }
  if (phase === "BUILD") return 1;
  // BASE: 2x/week, but a cutback week eases to 1 maintenance session.
  return isCutback ? 1 : 2;
}

// --- Daily layout (§6) ---------------------------------------------------

type WeekContext = {
  weekIdx: number;
  totalWeeks: number;
  phase: Phase;
  weekStart: Date;
  volume: number;
  isCutback: boolean;
  trainingDays: number;
  longRun: number;
  b2b: number | null;
  paces: Paces;
  z2Label: string;
  quality: Quality | null;
  strengthSessions: number;
  raceDistance: RaceDistance;
};

function easyTime(distanceKm: number, easyPace: number): number {
  return round(distanceKm * easyPace);
}

// Choose which weekdays are run days for a given training-days count.
// Always: Mon rest, Sat long, Sun B2B/recovery, Wed quality slot.
function runDaySet(trainingDays: number): Set<number> {
  // indices into DAY_NAMES (0=Mon .. 6=Sun)
  // Saturday(5) + Sunday(6) always run. Then Tue(1), Wed(2), Thu(3), Fri(4).
  const order = [1, 2, 3, 4]; // Tue, Wed, Thu, Fri added as needed
  const days = new Set<number>([5, 6]);
  const extra = clamp(trainingDays, 4, 6) - 2;
  for (let i = 0; i < extra; i++) days.add(order[i]);
  return days;
}

function layoutWeek(ctx: WeekContext): DailyPlanDay[] {
  const runDays = runDaySet(ctx.trainingDays);
  const { paces, z2Label } = ctx;

  // Fixed allocations.
  const longKm = round1(ctx.longRun);
  const b2bKm = ctx.b2b != null ? round1(ctx.b2b) : null;
  // Nominal session length (WU + work + CD), capped so it can't dominate a light week.
  const qualityKm = ctx.quality ? round1(Math.min(10, ctx.volume * 0.25)) : 0;

  // Wednesday quality only when a quality session exists this week.
  const hasQuality = ctx.quality != null && runDays.has(2);

  // Remaining volume spread across the non-long, non-b2b, non-quality run days.
  let allocated = longKm + (b2bKm ?? 0) + (hasQuality ? qualityKm : 0);
  const easyDayIdxs: number[] = [];
  for (const d of [1, 2, 3, 4]) {
    if (!runDays.has(d)) continue;
    if (d === 2 && hasQuality) continue; // Wed is quality
    easyDayIdxs.push(d);
  }
  // Sunday is B2B when b2b set; otherwise an easy recovery run.
  const sundayIsB2B = b2bKm != null;
  if (!sundayIsB2B && runDays.has(6)) easyDayIdxs.push(6);

  const remaining = Math.max(0, ctx.volume - allocated);
  const perEasy = easyDayIdxs.length ? remaining / easyDayIdxs.length : 0;
  const easyKm: Record<number, number> = {};
  for (const d of easyDayIdxs) easyKm[d] = round1(perEasy);

  // Fix rounding drift so the daily total equals the weekly volume.
  const days: DailyPlanDay[] = [];
  const buildDay = (idx: number): DailyPlanDay => {
    const date = new Date(ctx.weekStart.getTime() + idx * MS_PER_DAY);
    const base: DailyPlanDay = {
      day: DAY_NAMES[idx],
      date: isoDate(date),
      type: "rest",
      description: "Full rest day",
      distance_km: 0,
      time_minutes: 0,
      intensity: null,
      workout_details: null,
      strength: null,
      notes: null,
      hard_km: null,
    };

    if (!runDays.has(idx)) {
      // Friday can be an optional shakeout in higher-volume builds.
      return base;
    }

    if (idx === 5) {
      // Saturday — long run.
      const nutrition = NUTRITION_NOTE[ctx.phase];
      return {
        ...base,
        type: "long",
        description: ctx.phase === "PEAK" ? "Long run (race-specific)" : "Long run",
        distance_km: longKm,
        time_minutes: easyTime(longKm, paces.easy),
        intensity: z2Label,
        workout_details:
          ctx.phase === "PEAK"
            ? "Rehearse race gear, nutrition, and (if applicable) a night section."
            : null,
        strength: null,
        notes: nutrition,
      };
    }

    if (idx === 6 && sundayIsB2B) {
      // Sunday — back-to-back run.
      const desc =
        ctx.phase === "PEAK"
          ? "B2B sustained run"
          : ctx.phase === "BUILD"
            ? "B2B moderate run"
            : "B2B easy recovery";
      return {
        ...base,
        type: "b2b",
        description: desc,
        distance_km: b2bKm as number,
        time_minutes: easyTime(b2bKm as number, paces.easy),
        intensity: z2Label,
        workout_details: null,
        strength: null,
        notes: "First 3 km Z1-Z2 regardless of how you feel. Run on tired legs.",
      };
    }

    if (idx === 2 && hasQuality && ctx.quality) {
      return {
        ...base,
        type: "quality",
        description: ctx.phase === "BUILD" ? "Tempo / threshold" : "Speed session",
        distance_km: round1(qualityKm),
        time_minutes: easyTime(qualityKm, paces.easy),
        intensity:
          ctx.phase === "BUILD"
            ? "Z2 WU/CD, Z3 work"
            : "Z2 WU/CD, Z4 intervals",
        workout_details: ctx.quality.details,
        strength: null,
        notes:
          ctx.phase === "BASE"
            ? "Koop principle: speed stimulus early, far from race demands."
            : null,
        hard_km: ctx.quality.hardKm,
      };
    }

    // Easy / recovery day.
    const dist = easyKm[idx] ?? 0;
    const isPeakStrides = ctx.phase === "PEAK" && idx === 2;
    const isTaperStrides = ctx.phase === "TAPER" && (idx === 2 || idx === 3);
    return {
      ...base,
      type: "easy",
      description: isPeakStrides || isTaperStrides ? "Easy + strides" : "Easy Z2 run",
      distance_km: dist,
      time_minutes: easyTime(dist, paces.easy),
      intensity: z2Label,
      workout_details:
        isPeakStrides || isTaperStrides ? "Include 6-8x 20s strides after the run." : null,
      strength: null,
      notes: null,
    };
  };

  for (let idx = 0; idx < 7; idx++) days.push(buildDay(idx));

  // Correct rounding drift against the weekly target using the first easy day.
  const total = days.reduce((s, d) => s + d.distance_km, 0);
  const drift = round1(ctx.volume - total);
  if (Math.abs(drift) >= 0.1 && easyDayIdxs.length) {
    const fixIdx = easyDayIdxs[0];
    const day = days[fixIdx];
    day.distance_km = Math.max(0, round1(day.distance_km + drift));
    day.time_minutes = easyTime(day.distance_km, paces.easy);
  }

  // Distribute strength sessions. Priority: weekday easy runs → Sunday easy →
  // rest days (a no-run gym day is fine and keeps the prescribed count
  // deliverable even on 4-day weeks where the easy slots are scarce).
  if (ctx.strengthSessions > 0) {
    const weekdayEasyHosts = easyDayIdxs.filter((d) => d !== 6);
    const sundayEasyHost = !sundayIsB2B && runDays.has(6) ? [6] : [];
    const restHosts = [0, 1, 2, 3, 4, 5, 6].filter((d) => !runDays.has(d));
    const hosts = [...weekdayEasyHosts, ...sundayEasyHost, ...restHosts];

    const labels =
      ctx.phase === "BASE"
        ? [STRENGTH_A, STRENGTH_B]
        : ctx.phase === "BUILD"
          ? [STRENGTH_MAINT]
          : [STRENGTH_PEAK];
    for (let i = 0; i < ctx.strengthSessions && i < hosts.length; i++) {
      const d = hosts[i];
      days[d].strength = labels[Math.min(i, labels.length - 1)];
      if (days[d].type === "rest") {
        days[d].description = "Rest from running — strength session";
      }
    }
  }

  return days;
}

// --- Long run & B2B (§5) -------------------------------------------------

function longRunFor(
  volume: number,
  phase: Phase,
  cap: number,
  isCutback: boolean,
): number {
  let frac: number;
  switch (phase) {
    case "BASE": frac = 0.30; break;
    case "BUILD": frac = 0.34; break;
    case "PEAK": frac = 0.38; break;
    default: frac = 0.25; break; // TAPER — keep a short long run
  }
  if (isCutback) frac -= 0.06;
  return Math.min(cap, round1(volume * frac));
}

// Returns the Sunday B2B distance, or null when B2B doesn't apply this week.
function b2bFor(
  weekIdx: number,
  phase: Phase,
  alloc: PhaseAllocation,
  volume: number,
  longRun: number,
  isCutback: boolean,
): number | null {
  if (phase === "TAPER") return null;
  if (isCutback) return null;
  // Introduce in the last base week onward.
  const lateBaseStart = Math.max(0, alloc.base - 1);
  if (weekIdx < lateBaseStart) return null;

  // Sunday is easier/shorter than Saturday and the weekend stays ≤ 70% of volume.
  let frac: number;
  switch (phase) {
    case "BASE": frac = 0.50; break;
    case "BUILD": frac = 0.55; break;
    default: frac = 0.60; break; // PEAK
  }
  let b2b = longRun * frac;
  const weekendCap = 0.70 * volume; // within the 65-75% rule
  if (longRun + b2b > weekendCap) b2b = Math.max(0, weekendCap - longRun);
  return round1(b2b);
}

// --- key_change + injury safeguards (§9) --------------------------------

function deriveKeyChange(metrics: AthleteMetricsRow): string {
  const hr = metrics.hr_zone_distribution;
  if (hr && hr.has_data && hr.warning) return hr.warning.message;
  if (hr && hr.has_data) {
    return (
      `Keep 80% of your weekly volume easy (Z1-Z2, HR < ${hr.z2_hr_cap}). ` +
      `Aerobic base is the engine — discipline on easy days is the whole game.`
    );
  }
  return (
    "Keep 80% of your weekly volume conversational (Z1-Z2). The most common " +
    "mistake is running easy days too hard."
  );
}

function injuryWarnings(params: PlanBuilderParams, metrics: AthleteMetricsRow): string[] {
  const out: string[] = [];
  const recentGap = (metrics.detected_gaps ?? []).some(
    (g) => g.is_likely_injury && Date.now() - new Date(g.end).getTime() <= 365 * MS_PER_DAY,
  );
  if (params.injury_conservative || recentGap) {
    out.push(INJURY_NON_NEGOTIABLE);
    out.push("Base phase extended and weekly increases capped at 7% (injury history).");

    // Region-specific prehab from gap context keywords.
    const ctxWords = new Set<string>();
    for (const g of metrics.detected_gaps ?? []) {
      for (const c of g.context ?? []) ctxWords.add(c.toLowerCase());
    }
    if (["calf", "tibia", "shin", "stress"].some((k) => ctxWords.has(k))) {
      out.push(
        "Prehab: daily eccentric calf raises (3x12) and progress mileage slowly — " +
        "your history shows lower-leg sensitivity.",
      );
    }
  }
  return out;
}

// --- Orchestration -------------------------------------------------------

export function buildPlan(
  params: PlanBuilderParams,
  metrics: AthleteMetricsRow,
  now: Date = new Date(),
): BuiltPlan {
  const raceDate = new Date(params.race_date);
  const totalWeeks = Math.max(
    1,
    Math.round((raceDate.getTime() - now.getTime()) / MS_PER_WEEK),
  );

  const alloc = allocatePhases(totalWeeks, params.injury_conservative);
  const N = alloc.base + alloc.build + alloc.peak + alloc.taper;
  const curve = buildVolumeCurve(
    params.start_volume_km,
    params.peak_volume_km,
    alloc,
    params.injury_conservative,
  );

  const { paces, warnings: paceWarnings } = derivePaces(metrics);
  const hr = metrics.hr_zone_distribution;
  const z2Label = hr && hr.has_data ? `Z2 (HR <${hr.z2_hr_cap})` : "Z2 (conversational)";
  const cap = LONG_RUN_CAP[params.race_distance];

  const weekStart0 = mondayOf(now);

  const weeks: WeeklyPlanWeek[] = [];
  const dailyWeeks: DailyPlanWeek[] = [];
  let peakReached = false;

  for (let i = 0; i < N; i++) {
    const phase = phaseForWeek(i, alloc);
    const { volume, isCutback } = curve[i];
    const weekStart = new Date(weekStart0.getTime() + i * MS_PER_WEEK);
    const dateStart = isoDate(weekStart);

    const longRun = longRunFor(volume, phase, cap, isCutback);
    const b2b = b2bFor(i, phase, alloc, volume, longRun, isCutback);
    if (volume >= params.peak_volume_km) peakReached = true;

    // Quality session: BASE/BUILD only, never on a cutback week (§3).
    let quality: Quality | null = null;
    if (!isCutback) {
      if (phase === "BASE") quality = baseQuality(i, paces);
      else if (phase === "BUILD") quality = buildQuality(i, paces);
    }
    // Enforce 80/20: the Z3+ portion can never exceed 20% of weekly volume. On a
    // light week, downgrade to a strides session that fits the cap.
    if (quality && quality.hardKm > 0.20 * volume) {
      const cappedHard = round1(Math.min(quality.hardKm, 0.18 * volume));
      quality = {
        summary: "Strides only (volume-limited)",
        details: "Easy run with 6-8x 20s relaxed strides — volume too low for hard work this week.",
        hardKm: cappedHard,
      };
    }

    const strengthSessions = strengthSessionsFor(phase, i, N, isCutback);

    const ctx: WeekContext = {
      weekIdx: i,
      totalWeeks: N,
      phase,
      weekStart,
      volume,
      isCutback,
      trainingDays: params.training_days_per_week,
      longRun,
      b2b,
      paces,
      z2Label,
      quality,
      strengthSessions,
      raceDistance: params.race_distance,
    };

    const days = layoutWeek(ctx);

    // Weekly note: phase-specific guidance + cutback / nutrition framing.
    let note: string;
    if (isCutback) {
      note = "CUTBACK WEEK (non-negotiable). Same run count, shorter. Quality → easy + strides.";
    } else if (phase === "TAPER") {
      note = `Taper. ${NUTRITION_NOTE.TAPER} Logistics, gear, mental prep — do not add training.`;
    } else {
      note = NUTRITION_NOTE[phase];
    }

    weeks.push({
      week: i + 1,
      phase,
      date_start: dateStart,
      total_volume_km: round(volume),
      long_run_km: longRun,
      b2b_km: b2b,
      quality_summary: isCutback ? "Easy + strides (cutback)" : quality?.summary ?? "Easy + strides",
      strength_sessions: strengthSessions,
      notes: note,
      is_cutback: isCutback,
    });

    dailyWeeks.push({ week: i + 1, phase, date_start: dateStart, days });
  }

  // Phase summary ranges.
  const ranges = phaseRanges(alloc);
  const phases: PlanPhaseSummary[] = (Object.keys(ranges) as Phase[])
    .filter((p) => ranges[p] !== null)
    .map((p) => ({ name: p, weeks: ranges[p] as string, focus: PHASE_FOCUS[p] }));

  const keyChange = deriveKeyChange(metrics);

  const warnings: string[] = [...injuryWarnings(params, metrics), ...paceWarnings];
  if (!peakReached) {
    warnings.push(
      `Plan length doesn't allow reaching ${params.peak_volume_km} km/week within ` +
      `the ${params.injury_conservative ? "7" : "10"}% weekly safety cap. The plan ramps ` +
      `as high as safely possible and holds there — the cap takes priority over the target.`,
    );
  }

  const planMetadata: PlanMetadata = {
    key_change: keyChange,
    phases,
    principles_applied: [
      "80/20 intensity distribution",
      "Periodization: base → build → peak → taper",
      "Cutback weeks every 3-4 weeks",
      "Volume derived from proven ceiling, capped weekly growth",
      "Back-to-back weekends for ultra-specific fatigue",
      "Strength training tapering by phase",
      "Race-nutrition rehearsal from build phase onward",
    ],
    warnings,
    unit_system: params.unit_system,
  };

  const weeklyPlan: WeeklyPlan = {
    plan_summary: { total_weeks: N, phases, key_change: keyChange },
    weeks,
  };
  const dailyPlan: DailyPlan = { weeks: dailyWeeks };

  return {
    plan_weeks: N,
    weekly_plan: weeklyPlan,
    daily_plan: dailyPlan,
    plan_metadata: planMetadata,
  };
}

function phaseRanges(alloc: PhaseAllocation): Record<Phase, string | null> {
  const out: Record<Phase, string | null> = { BASE: null, BUILD: null, PEAK: null, TAPER: null };
  let cursor = 1;
  const assign = (p: Phase, len: number) => {
    if (len <= 0) return;
    out[p] = len === 1 ? `${cursor}` : `${cursor}-${cursor + len - 1}`;
    cursor += len;
  };
  assign("BASE", alloc.base);
  assign("BUILD", alloc.build);
  assign("PEAK", alloc.peak);
  assign("TAPER", alloc.taper);
  return out;
}
