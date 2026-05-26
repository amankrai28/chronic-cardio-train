import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import type { StravaActivity } from "@/lib/strava";
import {
  analyzeHRZones,
  computeCeiling,
  detectRaces,
  detectTrainingGaps,
  inferPeakVolume,
  inferStartingVolume,
  inferTrainingDays,
  type GoalType,
  type RaceDistance,
} from "@/lib/metrics";

export const dynamic = "force-dynamic";

const RACE_DISTANCES: RaceDistance[] = ["50K", "50Mi", "100K", "100Mi", "200Mi"];
const GOAL_TYPES: GoalType[] = ["finish", "beat_time", "compete"];

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Smart-default cards for the plan setup screen. peak_volume depends on the
// race the user picks; on first load we fall back to 100K/finish and Session 4
// re-calls with the user's real selections (inference is pure, so safe to re-run).
export async function GET(request: NextRequest) {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const params = request.nextUrl.searchParams;
  const raceParam = params.get("race_distance");
  const goalParam = params.get("goal_type");
  const raceDistance: RaceDistance =
    raceParam && (RACE_DISTANCES as string[]).includes(raceParam)
      ? (raceParam as RaceDistance)
      : "100K";
  const goalType: GoalType =
    goalParam && (GOAL_TYPES as string[]).includes(goalParam)
      ? (goalParam as GoalType)
      : "finish";

  const { data: activities, error } = await supabaseAdmin
    .from("activities")
    .select(
      "id, name, type, start_date, distance, moving_time, elapsed_time, total_elevation_gain, average_heartrate, max_heartrate, suffer_score",
    )
    .eq("user_id", userId)
    .returns<StravaActivity[]>();

  if (error) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const acts = activities ?? [];
  const now = new Date();

  const startingVolume = inferStartingVolume(acts, now);
  const peakVolume = inferPeakVolume(acts, raceDistance, goalType);
  const trainingDays = inferTrainingDays(acts, now);
  const gaps = detectTrainingGaps(acts);
  const hrZones = analyzeHRZones(acts);
  const ceiling = computeCeiling(acts, now);
  const races = detectRaces(acts);

  type Card = {
    key: string;
    title: string;
    value: string | number;
    rationale: string;
    adjustable: boolean;
  };
  const cards: Card[] = [];

  cards.push({
    key: "starting_volume",
    title: "Starting Volume",
    value: `${startingVolume.suggested_km} km/week`,
    rationale: startingVolume.rationale,
    adjustable: true,
  });
  cards.push({
    key: "peak_volume",
    title: "Peak Volume",
    value: `${peakVolume.suggested_km} km/week`,
    rationale: peakVolume.rationale,
    adjustable: true,
  });
  cards.push({
    key: "training_days",
    title: "Training Days",
    value: trainingDays.suggested,
    rationale: trainingDays.rationale,
    adjustable: true,
  });

  // Card 4: only if a gap was detected in the last 12 months.
  const recentGaps = gaps.filter((g) => now.getTime() - new Date(g.end).getTime() <= ONE_YEAR_MS);
  const injuryGaps = recentGaps.filter((g) => g.is_likely_injury);
  if (recentGaps.length > 0) {
    const flagged = injuryGaps.length > 0 ? injuryGaps : recentGaps;
    const ctx = flagged.find((g) => g.context)?.context ?? [];
    const longest = flagged.reduce((a, b) => (b.days > a.days ? b : a));
    cards.push({
      key: "injury_conservative",
      title: "Injury Management",
      value: injuryGaps.length > 0 ? "Active" : "Review",
      rationale:
        `Detected a ${longest.days}-day training gap` +
        (ctx.length ? ` (${ctx.join(", ")})` : "") +
        `. Base phase extended, volume capped at 7%/week.`,
      adjustable: true,
    });
  }

  // Card 5: only if HR distribution skews hard (>50% Z3-Z5).
  if (hrZones.has_data && hrZones.warning) {
    cards.push({
      key: "hr_zone_fix",
      title: "HR Zone Fix",
      value: `Easy HR < ${hrZones.warning.target_hr} bpm`,
      rationale: hrZones.warning.message,
      adjustable: false,
    });
  }

  // Cards 6-7: read-only context.
  cards.push({
    key: "longest_recent_run",
    title: "Longest Recent Run",
    value: `${ceiling.longest_recent_run_km} km`,
    rationale: "Your longest run in the last 6 months. Shown for context.",
    adjustable: false,
  });
  cards.push({
    key: "race_experience",
    title: "Race Experience",
    value: `${races.length} detected`,
    rationale: races.length
      ? `Longest: ${races[0].name ?? races[0].race_type ?? "race"} (${races[0].distance_km} km).`
      : "No races auto-detected from your activity history.",
    adjustable: false,
  });

  return NextResponse.json({ race_distance: raceDistance, goal_type: goalType, cards });
}
