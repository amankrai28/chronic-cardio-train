import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import ProfileCard from "@/components/ProfileCard";
import { formatTime } from "@/lib/metrics";

export const dynamic = "force-dynamic";

type PlanRow = {
  id: string;
  race_name: string | null;
  race_distance: string;
  race_date: string;
  terrain: string | null;
  goal_type: string;
  previous_time_seconds: number | null;
  target_time_seconds: number | null;
  start_volume_km: number;
  peak_volume_km: number;
  training_days_per_week: number;
  injury_conservative: boolean | null;
  plan_weeks: number;
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

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const userId = await getSession();
  if (!userId) {
    redirect("/");
  }

  const { id } = await params;
  // Scope to the authenticated user so one athlete can never read another's plan.
  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select(
      "id, race_name, race_distance, race_date, terrain, goal_type, previous_time_seconds, target_time_seconds, start_volume_km, peak_volume_km, training_days_per_week, injury_conservative, plan_weeks",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .single<PlanRow>();

  if (!plan) {
    notFound();
  }

  const distanceLabel = DISTANCE_LABELS[plan.race_distance] ?? plan.race_distance;

  return (
    <section
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "var(--space-12) 30px var(--space-20)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      <div>
        <p className="caption" style={{ color: "var(--accent)" }}>
          PLAN SAVED
        </p>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", margin: "var(--space-4) 0 var(--space-2)" }}>
          {plan.race_name || `${distanceLabel} Plan`}
        </h1>
        <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 18, color: "var(--mid-gray)", lineHeight: 1.6 }}>
          Your parameters are locked in. The full daily training plan is coming
          soon — we&apos;re building the plan engine next.
        </p>
      </div>

      <ProfileCard caption="WHAT WE'LL BUILD FROM">
        <StatLine label="Distance" value={distanceLabel} />
        <StatLine label="Race date" value={plan.race_date} />
        <StatLine label="Terrain" value={plan.terrain ? TERRAIN_LABELS[plan.terrain] ?? plan.terrain : "—"} />
        <StatLine label="Goal" value={GOAL_LABELS[plan.goal_type] ?? plan.goal_type} />
        {plan.previous_time_seconds ? (
          <StatLine label="Previous time" value={formatTime(plan.previous_time_seconds)} />
        ) : null}
        {plan.target_time_seconds ? (
          <StatLine label="Target time" value={formatTime(plan.target_time_seconds)} />
        ) : null}
        <StatLine label="Starting volume" value={`${plan.start_volume_km} km/week`} />
        <StatLine label="Peak volume" value={`${plan.peak_volume_km} km/week`} />
        <StatLine label="Training days" value={`${plan.training_days_per_week} days/week`} />
        <StatLine label="Plan length" value={`${plan.plan_weeks} weeks`} />
        {plan.injury_conservative ? (
          <StatLine label="Injury management" value="Conservative base phase" />
        ) : null}
      </ProfileCard>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-4)" }}>
        <Link href="/plan/setup" className="btn-primary">
          ← Adjust parameters
        </Link>
      </div>
    </section>
  );
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 17, margin: "var(--space-2) 0", lineHeight: 1.5 }}>
      <span style={{ color: "var(--mid-gray)" }}>{label}: </span>
      <strong>{value}</strong>
    </p>
  );
}
