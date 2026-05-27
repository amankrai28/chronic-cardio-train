import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin, type User } from "@/lib/supabase";
import DashboardClient from "@/components/DashboardClient";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const userId = await getSession();
  if (!userId) {
    redirect("/");
  }

  const { data: user } = await supabaseAdmin
    .from("users")
    .select("firstname")
    .eq("id", userId)
    .single<Pick<User, "firstname">>();

  const name = user?.firstname ?? "athlete";

  return <DashboardClient firstName={name} />;
}
