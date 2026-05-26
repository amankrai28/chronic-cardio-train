import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { supabaseAdmin, type User } from "@/lib/supabase";
import LoadingBar from "@/components/LoadingBar";

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

  return (
    <section
      style={{
        padding: "var(--space-20) 30px",
        maxWidth: 720,
        margin: "0 auto",
        textAlign: "center",
      }}
    >
      <p className="caption" style={{ color: "var(--accent)" }}>
        STRAVA CONNECTED
      </p>
      <h1
        style={{
          fontSize: "clamp(32px, 6vw, 56px)",
          letterSpacing: "-1px",
          margin: "var(--space-4) 0 var(--space-8)",
        }}
      >
        Welcome, {name}.
      </h1>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-8)" }}>
        <LoadingBar />
      </div>

      <p
        style={{
          fontFamily: "var(--font-sans), sans-serif",
          fontSize: 18,
          color: "var(--mid-gray)",
          lineHeight: 1.7,
        }}
      >
        Pulling your runs… Your full running profile — fitness, ceiling,
        consistency, and detected concerns — lands here next.
      </p>
    </section>
  );
}
