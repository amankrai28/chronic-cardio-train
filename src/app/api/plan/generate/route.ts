import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import type { GoalType, RaceDistance } from "@/lib/metrics";

export const dynamic = "force-dynamic";

const RACE_DISTANCES: RaceDistance[] = ["50K", "50Mi", "100K", "100Mi", "200Mi"];
const GOAL_TYPES: GoalType[] = ["finish", "beat_time", "compete"];
const TERRAINS = ["road", "trail", "mountain"];

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

function asPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

// Session 4 stub: persists the confirmed plan parameters so the flow has a real
// plan id to redirect to. The deterministic plan builder (weekly/daily_plan) is
// Session 5 — for now weekly_plan is an empty placeholder.
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
  const planWeeks = Math.max(1, Math.round((raceDate.getTime() - Date.now()) / MS_PER_WEEK));

  const raceName =
    typeof body.race_name === "string" && body.race_name.trim() ? body.race_name.trim() : null;
  const validTerrain =
    typeof terrain === "string" && TERRAINS.includes(terrain) ? terrain : null;
  const previousTime = asPositiveNumber(body.previous_time_seconds);
  const targetTime = asPositiveNumber(body.target_time_seconds);
  const injuryConservative = body.injury_conservative === true;

  const { data, error } = await supabaseAdmin
    .from("plans")
    .insert({
      user_id: userId,
      race_name: raceName,
      race_distance: raceDistance,
      race_date: raceDate.toISOString().slice(0, 10),
      terrain: validTerrain,
      goal_type: goalType,
      previous_time_seconds: previousTime,
      target_time_seconds: targetTime,
      start_volume_km: startVolumeKm,
      peak_volume_km: peakVolumeKm,
      training_days_per_week: trainingDays,
      injury_conservative: injuryConservative,
      plan_weeks: planWeeks,
      weekly_plan: [],
      daily_plan: null,
      plan_metadata: { status: "placeholder", generated_by: "session-4-stub" },
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
