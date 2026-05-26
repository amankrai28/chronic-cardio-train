import type { StravaActivity } from "@/lib/strava";
import type { User } from "@/lib/supabase";

// All algorithms here are deterministic translations of the pseudocode in
// docs/strava-data-intelligence.md. No Strava data is ever sent to an LLM.

// --- Constants -----------------------------------------------------------

const MS_PER_DAY = 86_400_000;

const INJURY_KEYWORDS = [
  "injury", "injured", "hurt", "pain", "broken", "fracture",
  "tibia", "calf", "knee", "ankle", "shin", "stress",
  "recovery", "rehab", "busted", "sore", "physio", "PT",
  "doctor", "rest", "off", "DNF", "dropped",
];

const RACE_KEYWORDS = [
  "race", "marathon", "ultra", "challenge", "event",
  "100 miler", "100k", "50k", "50 mile", "half marathon",
  "HM", "10K", "TCS", "Ladakh", "hell race", "border",
  "miler", "trail race",
];

// (km, label) — matched with ±5% tolerance.
const STANDARD_DISTANCES: Array<[number, string]> = [
  [5, "5K"], [10, "10K"], [21.1, "Half Marathon"],
  [42.2, "Marathon"], [50, "50K"], [80.5, "50 Mile"],
  [100, "100K"], [160.9, "100 Mile"],
];

export type RaceDistance = "50K" | "50Mi" | "100K" | "100Mi" | "200Mi";
export type GoalType = "finish" | "beat_time" | "compete";

const PEAKS: Record<RaceDistance, Record<GoalType, number>> = {
  "50K": { finish: 70, beat_time: 85, compete: 95 },
  "50Mi": { finish: 85, beat_time: 105, compete: 115 },
  "100K": { finish: 95, beat_time: 115, compete: 130 },
  "100Mi": { finish: 100, beat_time: 120, compete: 140 },
  "200Mi": { finish: 120, beat_time: 140, compete: 160 },
};

// --- Small helpers -------------------------------------------------------

const km = (meters: number) => meters / 1000;
const round = (n: number) => Math.round(n);
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const roundTo5 = (n: number) => Math.round(n / 5) * 5;

function isRun(a: StravaActivity): boolean {
  return a.type === "Run";
}

function parseDate(iso: string): Date {
  return new Date(iso);
}

function runsSortedByDate(activities: StravaActivity[]): StravaActivity[] {
  return activities
    .filter(isRun)
    .slice()
    .sort((a, b) => parseDate(a.start_date).getTime() - parseDate(b.start_date).getTime());
}

function withinLastDays(a: StravaActivity, now: Date, days: number): boolean {
  const t = parseDate(a.start_date).getTime();
  return t <= now.getTime() && now.getTime() - t <= days * MS_PER_DAY;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// Monday-anchored week index. 1969-12-29 is the Monday before the 1970 epoch.
const WEEK_EPOCH = Date.UTC(1969, 11, 29);
function weekIndex(d: Date): number {
  return Math.floor((d.getTime() - WEEK_EPOCH) / (7 * MS_PER_DAY));
}

/** Sum of run km bucketed by Monday-anchored week index. */
function weeklyVolumeMap(runs: StravaActivity[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const r of runs) {
    const w = weekIndex(parseDate(r.start_date));
    map.set(w, (map.get(w) ?? 0) + km(r.distance));
  }
  return map;
}

/** Count of runs bucketed by week index. */
function weeklyCountMap(runs: StravaActivity[]): Map<number, number> {
  const map = new Map<number, number>();
  for (const r of runs) {
    const w = weekIndex(parseDate(r.start_date));
    map.set(w, (map.get(w) ?? 0) + 1);
  }
  return map;
}

function averageWeeklyVolume(runs: StravaActivity[], weeks: number, now: Date): number {
  const cutoff = now.getTime() - weeks * 7 * MS_PER_DAY;
  const total = runs
    .filter((r) => parseDate(r.start_date).getTime() >= cutoff)
    .reduce((sum, r) => sum + km(r.distance), 0);
  return total / weeks;
}

function averageRunsPerWeek(runs: StravaActivity[], weeks: number, now: Date): number {
  const cutoff = now.getTime() - weeks * 7 * MS_PER_DAY;
  const count = runs.filter((r) => parseDate(r.start_date).getTime() >= cutoff).length;
  return count / weeks;
}

/** Best contiguous N-week average of a per-week value map within a lookback. */
function bestBlockAverage(
  perWeek: Map<number, number>,
  blockWeeks: number,
  lookbackMonths: number,
  now: Date,
): number {
  const cutoffWeek = weekIndex(new Date(now.getTime() - lookbackMonths * 30 * MS_PER_DAY));
  const nowWeek = weekIndex(now);
  let best = 0;
  for (let start = cutoffWeek; start + blockWeeks - 1 <= nowWeek; start++) {
    let sum = 0;
    for (let w = start; w < start + blockWeeks; w++) sum += perWeek.get(w) ?? 0;
    best = Math.max(best, sum / blockWeeks);
  }
  return best;
}

function maxWeeklyVolumeEver(runs: StravaActivity[]): number {
  let max = 0;
  for (const v of weeklyVolumeMap(runs).values()) max = Math.max(max, v);
  return max;
}

function maxMonthlyVolume(runs: StravaActivity[]): number {
  const map = new Map<string, number>();
  for (const r of runs) {
    const d = parseDate(r.start_date);
    const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}`;
    map.set(key, (map.get(key) ?? 0) + km(r.distance));
  }
  let max = 0;
  for (const v of map.values()) max = Math.max(max, v);
  return max;
}

export function formatTime(seconds: number): string {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${m}:${pad(sec)}`;
}

// --- Algorithm functions -------------------------------------------------

export type CurrentFitness = {
  weekly_avg_km: number;
  runs_per_week: number;
  avg_easy_pace: number; // min/km
  avg_easy_hr: number | null;
};

export function computeCurrentFitness(
  activities: StravaActivity[],
  now: Date = new Date(),
): CurrentFitness {
  const runs = activities.filter(isRun);
  const weeklyAvg = averageWeeklyVolume(runs, 4, now);
  const runsPerWeek = averageRunsPerWeek(runs, 4, now);

  // Easy = recent (last 8 weeks) non-race runs with meaningful distance.
  const raceIds = new Set(detectRaces(activities).map((r) => r.id));
  const easyRuns = runs.filter(
    (r) =>
      withinLastDays(r, now, 56) &&
      !raceIds.has(r.id) &&
      r.distance >= 1000 &&
      r.moving_time > 0,
  );

  const paces = easyRuns.map((r) => r.moving_time / 60 / km(r.distance));
  const hrs = easyRuns
    .filter((r) => r.average_heartrate && r.average_heartrate > 60)
    .map((r) => r.average_heartrate as number);

  return {
    weekly_avg_km: round(weeklyAvg),
    runs_per_week: round1(runsPerWeek),
    avg_easy_pace: paces.length ? round2(median(paces)) : 0,
    avg_easy_hr: hrs.length ? round(median(hrs)) : null,
  };
}

export type Ceiling = {
  peak_weekly_km: number;
  peak_monthly_km: number;
  longest_run_km: number;
  longest_recent_run_km: number;
  fastest_10k_seconds: number | null;
};

export function computeCeiling(
  activities: StravaActivity[],
  now: Date = new Date(),
): Ceiling {
  const runs = activities.filter(isRun);

  const longestRun = runs.reduce((max, r) => Math.max(max, km(r.distance)), 0);
  const longestRecent = runs
    .filter((r) => withinLastDays(r, now, 182))
    .reduce((max, r) => Math.max(max, km(r.distance)), 0);

  // Fastest 10K: prefer true ~10K efforts (±5%); else extrapolate from the
  // fastest pace among 5-15km runs.
  const trueTenK = runs.filter((r) => Math.abs(km(r.distance) - 10) / 10 < 0.05);
  let fastest10k: number | null = null;
  if (trueTenK.length) {
    fastest10k = Math.min(...trueTenK.map((r) => r.moving_time));
  } else {
    const candidates = runs.filter((r) => km(r.distance) >= 5 && km(r.distance) <= 15 && r.moving_time > 0);
    if (candidates.length) {
      const bestPace = Math.min(...candidates.map((r) => r.moving_time / km(r.distance)));
      fastest10k = round(bestPace * 10);
    }
  }

  return {
    peak_weekly_km: round(maxWeeklyVolumeEver(runs)),
    peak_monthly_km: round(maxMonthlyVolume(runs)),
    longest_run_km: round1(longestRun),
    longest_recent_run_km: round1(longestRecent),
    fastest_10k_seconds: fastest10k,
  };
}

export type HRZoneAnalysis =
  | { has_data: false; message: string }
  | {
      has_data: true;
      max_hr: number;
      zone_distribution: Record<string, number>;
      zone_percentages: Record<string, number>;
      pct_easy: number;
      pct_hard: number;
      warning: {
        severity: string;
        message: string;
        target_hr: number;
        instruction: string;
      } | null;
      z2_hr_cap: number;
    };

export function analyzeHRZones(activities: StravaActivity[]): HRZoneAnalysis {
  // Coaching zones apply to runs; require a real HR reading.
  const hrRuns = activities.filter(
    (a) => isRun(a) && a.average_heartrate != null && a.average_heartrate > 60,
  );

  if (hrRuns.length < 20) {
    return { has_data: false, message: "Insufficient HR data for zone analysis." };
  }

  const maxHr = Math.max(...hrRuns.filter((a) => a.max_heartrate).map((a) => a.max_heartrate as number));

  const zones: Record<string, number> = { Z1: 0, Z2: 0, Z3: 0, Z4: 0, Z5: 0 };
  for (const run of hrRuns) {
    const pct = ((run.average_heartrate as number) / maxHr) * 100;
    if (pct < 65) zones.Z1 += 1;
    else if (pct < 76) zones.Z2 += 1;
    else if (pct < 86) zones.Z3 += 1;
    else if (pct < 93) zones.Z4 += 1;
    else zones.Z5 += 1;
  }

  const total = Object.values(zones).reduce((a, b) => a + b, 0);
  const pctEasy = ((zones.Z1 + zones.Z2) / total) * 100;
  const pctHard = ((zones.Z3 + zones.Z4 + zones.Z5) / total) * 100;
  const z2Cap = round(maxHr * 0.75);

  let warning = null;
  if (pctHard > 50) {
    warning = {
      severity: "high",
      message:
        `${round(pctHard)}% of your runs are in Z3-Z5. ` +
        `For ultra training, 80% should be Z1-Z2. ` +
        `This is the single most impactful change you can make.`,
      target_hr: z2Cap,
      instruction: `Easy runs: keep HR below ${z2Cap} bpm.`,
    };
  }

  const zonePercentages: Record<string, number> = {};
  for (const [k, v] of Object.entries(zones)) zonePercentages[k] = round((v / total) * 100);

  return {
    has_data: true,
    max_hr: maxHr,
    zone_distribution: zones,
    zone_percentages: zonePercentages,
    pct_easy: round(pctEasy),
    pct_hard: round(pctHard),
    warning,
    z2_hr_cap: z2Cap,
  };
}

export type TrainingGap = {
  start: string;
  end: string;
  days: number;
  context: string[] | null;
  is_likely_injury: boolean;
};

export function detectTrainingGaps(activities: StravaActivity[]): TrainingGap[] {
  const runs = runsSortedByDate(activities);
  const gaps: TrainingGap[] = [];

  for (let i = 1; i < runs.length; i++) {
    const prev = parseDate(runs[i - 1].start_date);
    const curr = parseDate(runs[i].start_date);
    const daysBetween = Math.round((curr.getTime() - prev.getTime()) / MS_PER_DAY);
    if (daysBetween <= 14) continue;

    const nearby = activities.filter(
      (a) => Math.abs((parseDate(a.start_date).getTime() - prev.getTime()) / MS_PER_DAY) < 30,
    );
    const contextWords: string[] = [];
    for (const a of nearby) {
      if (!a.name) continue;
      const lower = a.name.toLowerCase();
      for (const kw of INJURY_KEYWORDS) {
        if (lower.includes(kw.toLowerCase())) contextWords.push(kw);
      }
    }
    const context = Array.from(new Set(contextWords));

    gaps.push({
      start: prev.toISOString(),
      end: curr.toISOString(),
      days: daysBetween,
      context: context.length ? context : null,
      is_likely_injury: context.length > 0,
    });
  }

  return gaps;
}

export type DetectedRace = {
  id: number;
  date: string;
  name: string | null;
  distance_km: number;
  time_seconds: number;
  time_formatted: string;
  pace_min_km: number;
  race_type: string | null;
  elevation_gain: number | null;
  average_hr: number | null;
};

export function detectRaces(activities: StravaActivity[]): DetectedRace[] {
  const runs = activities.filter(isRun);
  const races: DetectedRace[] = [];

  for (const run of runs) {
    let isRace = false;
    let raceType: string | null = null;

    if (run.name) {
      const lower = run.name.toLowerCase();
      for (const kw of RACE_KEYWORDS) {
        if (lower.includes(kw.toLowerCase())) {
          isRace = true;
          break;
        }
      }
    }

    const distKm = km(run.distance);
    for (const [stdDist, stdName] of STANDARD_DISTANCES) {
      if (Math.abs(distKm - stdDist) / stdDist < 0.05) {
        isRace = true;
        raceType = stdName;
        break;
      }
    }

    if (run.suffer_score && run.suffer_score > 200 && distKm > 40) {
      isRace = true;
    }

    if (isRace) {
      const pace = distKm > 0 ? run.moving_time / 60 / distKm : 0;
      races.push({
        id: run.id,
        date: run.start_date.slice(0, 10),
        name: run.name,
        distance_km: round1(distKm),
        time_seconds: run.moving_time,
        time_formatted: formatTime(run.moving_time),
        pace_min_km: round2(pace),
        race_type: raceType,
        elevation_gain: run.total_elevation_gain,
        average_hr: run.average_heartrate,
      });
    }
  }

  return races.sort((a, b) => b.distance_km - a.distance_km);
}

export type StartingVolume = {
  suggested_km: number;
  recent_avg: number;
  best_recent_block: number;
  rationale: string;
};

export function inferStartingVolume(
  activities: StravaActivity[],
  now: Date = new Date(),
): StartingVolume {
  const runs = activities.filter(isRun);
  const recentAvg = averageWeeklyVolume(runs, 4, now);
  const bestRecentBlock = bestBlockAverage(weeklyVolumeMap(runs), 4, 3, now);

  let suggested: number;
  let rationale: string;
  if (bestRecentBlock > recentAvg * 1.4) {
    suggested = (recentAvg + bestRecentBlock) / 2;
    rationale =
      `You've been averaging ${round(recentAvg)} km/week, but your best ` +
      `recent 4-week block was ${round(bestRecentBlock)} km/week. ` +
      `We'll start at ${round(suggested)} — what you can do when consistent.`;
  } else {
    suggested = recentAvg;
    rationale =
      `Your recent average is ${round(recentAvg)} km/week. ` +
      `That's your starting point.`;
  }

  return {
    suggested_km: roundTo5(suggested),
    recent_avg: round(recentAvg),
    best_recent_block: round(bestRecentBlock),
    rationale,
  };
}

export type PeakVolume = {
  suggested_km: number;
  lifetime_peak: number;
  distance_target: number;
  rationale: string;
};

export function inferPeakVolume(
  activities: StravaActivity[],
  raceDistance: RaceDistance,
  goalType: GoalType,
): PeakVolume {
  const lifetimePeak = maxWeeklyVolumeEver(activities.filter(isRun));
  const target = PEAKS[raceDistance][goalType];
  const safeMax = lifetimePeak * 1.15;

  let suggested: number;
  let rationale: string;
  if (safeMax >= target) {
    suggested = target;
    rationale =
      `Your proven peak is ${round(lifetimePeak)} km/week. ` +
      `We're targeting ${round(suggested)} km — within your proven range.`;
  } else {
    suggested = roundTo5(safeMax);
    rationale =
      `Your proven peak is ${round(lifetimePeak)} km/week. ` +
      `We're capping at ${round(suggested)} (15% above your max) ` +
      `for safety. Ideally you'd want ${round(target)} for this goal, ` +
      `but exceeding your proven ceiling by more than 15% increases injury risk.`;
  }

  return {
    suggested_km: suggested,
    lifetime_peak: round(lifetimePeak),
    distance_target: target,
    rationale,
  };
}

export type TrainingDays = {
  recent_frequency: number;
  best_frequency: number;
  suggested: number;
  rationale: string;
};

export function inferTrainingDays(
  activities: StravaActivity[],
  now: Date = new Date(),
): TrainingDays {
  const runs = activities.filter(isRun);
  const recentFreq = averageRunsPerWeek(runs, 8, now);
  const bestFreq = bestBlockAverage(weeklyCountMap(runs), 8, 12, now);

  let suggested = Math.max(round(bestFreq), round(recentFreq) + 1);
  suggested = Math.min(suggested, 6);
  suggested = Math.max(suggested, 4);

  return {
    recent_frequency: round1(recentFreq),
    best_frequency: round1(bestFreq),
    suggested,
    rationale:
      `You average ${round1(recentFreq)} runs/week recently. ` +
      `Your most consistent period was ${round1(bestFreq)}/week. ` +
      `We suggest ${suggested} days to fit the plan structure.`,
  };
}

export type SeasonalPattern = {
  best_month: { month: string; km: number } | null;
  worst_month: { month: string; km: number } | null;
  by_month: Record<string, number>;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function computeSeasonalPattern(activities: StravaActivity[]): SeasonalPattern {
  const runs = activities.filter(isRun);
  const byMonth: Record<string, number> = {};
  for (const r of runs) {
    const month = MONTH_NAMES[parseDate(r.start_date).getUTCMonth()];
    byMonth[month] = (byMonth[month] ?? 0) + km(r.distance);
  }

  const entries = Object.entries(byMonth);
  if (entries.length === 0) {
    return { best_month: null, worst_month: null, by_month: {} };
  }

  let best = entries[0];
  let worst = entries[0];
  for (const e of entries) {
    if (e[1] > best[1]) best = e;
    if (e[1] < worst[1]) worst = e;
  }

  const rounded: Record<string, number> = {};
  for (const [m, v] of entries) rounded[m] = round(v);

  return {
    best_month: { month: best[0], km: round(best[1]) },
    worst_month: { month: worst[0], km: round(worst[1]) },
    by_month: rounded,
  };
}

export type CrossTraining = {
  weight_training_count: number;
  strength_frequency_per_week: number;
  other_types: Array<{ type: string; count: number }>;
  by_type: Record<string, number>;
};

export function detectCrossTraining(
  activities: StravaActivity[],
  now: Date = new Date(),
): CrossTraining {
  const byType: Record<string, number> = {};
  for (const a of activities) byType[a.type] = (byType[a.type] ?? 0) + 1;

  const weightCount = byType.WeightTraining ?? 0;

  // Frequency across the athlete's logged span.
  let spanWeeks = 1;
  if (activities.length > 0) {
    const times = activities.map((a) => parseDate(a.start_date).getTime());
    const first = Math.min(...times);
    const last = Math.max(Math.max(...times), now.getTime());
    spanWeeks = Math.max((last - first) / (7 * MS_PER_DAY), 1);
  }

  const otherTypes = Object.entries(byType)
    .filter(([type]) => type !== "Run" && type !== "WeightTraining")
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  return {
    weight_training_count: weightCount,
    strength_frequency_per_week: round1(weightCount / spanWeeks),
    other_types: otherTypes,
    by_type: byType,
  };
}

// --- Orchestration -------------------------------------------------------

export type AthleteMetricsRow = {
  user_id: string;
  total_runs: number;
  total_distance_km: number;
  total_time_hours: number;
  years_running: number;
  current_weekly_avg_km: number;
  current_runs_per_week: number;
  current_avg_pace: number;
  current_avg_hr: number | null;
  max_recorded_hr: number | null;
  peak_weekly_volume_km: number;
  peak_monthly_volume_km: number;
  longest_single_run_km: number;
  longest_recent_run_km: number;
  fastest_10k_time_seconds: number | null;
  hr_zone_distribution: HRZoneAnalysis;
  strength_sessions_count: number;
  strength_frequency_per_week: number;
  detected_gaps: TrainingGap[];
  detected_races: DetectedRace[];
  seasonal_pattern: SeasonalPattern;
  cross_training: CrossTraining;
  computed_at: string;
};

export function computeAllMetrics(
  activities: StravaActivity[],
  user: Pick<User, "id">,
  now: Date = new Date(),
): AthleteMetricsRow {
  const runs = activities.filter(isRun);

  const fitness = computeCurrentFitness(activities, now);
  const ceiling = computeCeiling(activities, now);
  const hrZones = analyzeHRZones(activities);
  const gaps = detectTrainingGaps(activities);
  const races = detectRaces(activities);
  const seasonal = computeSeasonalPattern(activities);
  const crossTraining = detectCrossTraining(activities, now);

  const totalDistanceKm = runs.reduce((sum, r) => sum + km(r.distance), 0);
  const totalTimeHours = runs.reduce((sum, r) => sum + r.moving_time, 0) / 3600;

  let yearsRunning = 0;
  if (runs.length > 0) {
    const earliest = Math.min(...runs.map((r) => parseDate(r.start_date).getTime()));
    yearsRunning = round1((now.getTime() - earliest) / (365.25 * MS_PER_DAY));
  }

  const recordedHrs = runs
    .filter((r) => r.max_heartrate != null)
    .map((r) => r.max_heartrate as number);
  const maxRecordedHr = recordedHrs.length ? Math.max(...recordedHrs) : null;

  return {
    user_id: user.id,
    total_runs: runs.length,
    total_distance_km: round(totalDistanceKm),
    total_time_hours: round1(totalTimeHours),
    years_running: yearsRunning,
    current_weekly_avg_km: fitness.weekly_avg_km,
    current_runs_per_week: fitness.runs_per_week,
    current_avg_pace: fitness.avg_easy_pace,
    current_avg_hr: fitness.avg_easy_hr,
    max_recorded_hr: hrZones.has_data ? hrZones.max_hr : maxRecordedHr,
    peak_weekly_volume_km: ceiling.peak_weekly_km,
    peak_monthly_volume_km: ceiling.peak_monthly_km,
    longest_single_run_km: ceiling.longest_run_km,
    longest_recent_run_km: ceiling.longest_recent_run_km,
    fastest_10k_time_seconds: ceiling.fastest_10k_seconds,
    hr_zone_distribution: hrZones,
    strength_sessions_count: crossTraining.weight_training_count,
    strength_frequency_per_week: crossTraining.strength_frequency_per_week,
    detected_gaps: gaps,
    detected_races: races,
    seasonal_pattern: seasonal,
    cross_training: crossTraining,
    computed_at: now.toISOString(),
  };
}
