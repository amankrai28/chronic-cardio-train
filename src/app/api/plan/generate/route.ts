import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import type { AthleteMetricsRow, GoalType, RaceDistance } from "@/lib/metrics";
import { buildPlan } from "@/lib/plan-builder";
import { getUnitSystem } from "@/lib/units";

export const dynamic = "force-dynamic";

const RACE_DISTANCES: RaceDistance[] = ["50K", "50Mi", "100K", "100Mi", "200Mi"];
const GOAL_TYPES: GoalType[] = ["finish", "beat_time", "compete"];
const TERRAINS = ["road", "trail", "mountain"];

function asPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

// Validates the confirmed plan parameters, runs the deterministic plan builder
// against the athlete's computed metrics, and persists the full weekly/daily plan.
export async function POST(request: NextRequest) {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const raceDistance = body.race_distance;
  const goalType = body.goal_type;
  const terrain = body.terrain;
  const startVolumeKm = asPositiveNumber(body.start_volume_km);
  const peakVolumeKm = asPositiveNumber(body.peak_volume_km);
  const trainingDaysRaw = asPositiveNumber(body.training_days_per_week);

  if (
    typeof raceDistance !== "string" ||
    !(RACE_DISTANCES as string[]).includes(raceDistance) ||
    typeof goalType !== "string" ||
    !(GOAL_TYPES as string[]).includes(goalType) ||
    startVolumeKm === null ||
    peakVolumeKm === null ||
    trainingDaysRaw === null
  ) {
    return NextResponse.json({ error: "invalid_parameters" }, { status: 400 });
  }

  const raceDateRaw = typeof body.race_date === "string" ? body.race_date : "";
  const raceDate = new Date(raceDateRaw);
  if (Number.isNaN(raceDate.getTime())) {
    return NextResponse.json({ error: "invalid_race_date" }, { status: 400 });
  }

  const trainingDays = Math.min(6, Math.max(4, Math.round(trainingDaysRaw)));

  const raceName =
    typeof body.race_name === "string" && body.race_name.trim() ? body.race_name.trim() : null;
  const validTerrain =
    typeof terrain === "string" && TERRAINS.includes(terrain) ? terrain : null;
  const previousTime = asPositiveNumber(body.previous_time_seconds);
  const targetTime = asPositiveNumber(body.target_time_seconds);
  const injuryConservative = body.injury_conservative === true;
  const raceDateIso = raceDate.toISOString().slice(0, 10);

  // The plan builder needs the athlete's computed metrics. These are written by
  // the Strava sync; without them we can't derive paces or HR targets.
  const { data: metrics } = await supabaseAdmin
    .from("athlete_metrics")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<AthleteMetricsRow>();

  if (!metrics) {
    return NextResponse.json({ error: "no_metrics" }, { status: 400 });
  }

  // The plan is always built in metric; we only record the athlete's display
  // preference in plan_metadata so the view/export layers know how to render it.
  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("measurement_preference")
    .eq("id", userId)
    .maybeSingle<{ measurement_preference: string | null }>();
  const unitSystem = getUnitSystem(userRow?.measurement_preference ?? null);

  const built = buildPlan(
    {
      race_name: raceName,
      race_distance: raceDistance as RaceDistance,
      race_date: raceDateIso,
      terrain: validTerrain,
      goal_type: goalType as GoalType,
      previous_time_seconds: previousTime,
      target_time_seconds: targetTime,
      start_volume_km: startVolumeKm,
      peak_volume_km: peakVolumeKm,
      training_days_per_week: trainingDays,
      injury_conservative: injuryConservative,
      unit_system: unitSystem,
    },
    metrics,
  );

  const { data, error } = await supabaseAdmin
    .from("plans")
    .insert({
      user_id: userId,
      race_name: raceName,
      race_distance: raceDistance,
      race_date: raceDateIso,
      terrain: validTerrain,
      goal_type: goalType,
      previous_time_seconds: previousTime,
      target_time_seconds: targetTime,
      start_volume_km: startVolumeKm,
      peak_volume_km: peakVolumeKm,
      training_days_per_week: trainingDays,
      injury_conservative: injuryConservative,
      plan_weeks: built.plan_weeks,
      weekly_plan: built.weekly_plan,
      daily_plan: built.daily_plan,
      plan_metadata: built.plan_metadata,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
