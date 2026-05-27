import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import type { DetectedRace } from "@/lib/metrics";
import PlanSetupClient from "@/components/PlanSetupClient";

export const dynamic = "force-dynamic";

export default async function PlanSetup() {
  const userId = await getSession();
  if (!userId) {
    redirect("/");
  }

  const { data: metrics } = await supabaseAdmin
    .from("athlete_metrics")
    .select("detected_races")
    .eq("user_id", userId)
    .single<{ detected_races: DetectedRace[] | null }>();

  const detectedRaces = metrics?.detected_races ?? [];

  return <PlanSetupClient detectedRaces={detectedRaces} />;
}
