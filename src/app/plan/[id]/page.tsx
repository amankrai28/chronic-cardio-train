import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import PlanDisplayClient, { type PlanForDisplay } from "@/components/PlanDisplayClient";

export const dynamic = "force-dynamic";

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
      "id, race_name, race_distance, race_date, terrain, goal_type, previous_time_seconds, target_time_seconds, peak_volume_km, weekly_plan, daily_plan, plan_metadata",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .single<PlanForDisplay>();

  if (!plan || !plan.weekly_plan || !plan.daily_plan) {
    notFound();
  }

  return <PlanDisplayClient plan={plan} />;
}
