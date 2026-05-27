"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LoadingBar from "@/components/LoadingBar";
import ProfileCard from "@/components/ProfileCard";
import { formatTime, type AthleteMetricsRow } from "@/lib/metrics";
import { formatPace, formatMonthYear, formatStartYear } from "@/lib/utils";

type ProfileUser = {
  firstname: string | null;
  lastname: string | null;
  city: string | null;
  country: string | null;
  profile_photo_url: string | null;
};

type Profile = { user: ProfileUser; metrics: AthleteMetricsRow | null };

type Phase = "loading" | "ready" | "insufficient" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const minDelay = (start: number, ms: number) =>
  sleep(Math.max(0, ms - (Date.now() - start)));

export default function DashboardClient({ firstName }: { firstName: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadingText, setLoadingText] = useState("Pulling your runs…");
  const [profile, setProfile] = useState<Profile | null>(null);

  async function run() {
    setPhase("loading");
    try {
      const pull = Date.now();
      setLoadingText("Pulling your runs…");
      const syncRes = await fetch("/api/strava/sync", { method: "POST" });
      if (!syncRes.ok) throw new Error("sync_failed");
      const sync = await syncRes.json();
      await minDelay(pull, 700);

      const crunch = Date.now();
      const n = typeof sync.activities_synced === "number" ? sync.activities_synced : 0;
      setLoadingText(n > 0 ? `Crunching ${n} activities…` : "Crunching your activities…");
      await minDelay(crunch, 700);

      const almost = Date.now();
      setLoadingText("Almost there…");
      const profRes = await fetch("/api/athlete/profile");
      if (!profRes.ok) throw new Error("profile_failed");
      const data = (await profRes.json()) as Profile;
      await minDelay(almost, 500);

      if (!data.metrics || data.metrics.total_runs < 50) {
        setProfile(data);
        setPhase("insufficient");
        return;
      }
      setProfile(data);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }

  useEffect(() => {
    run();
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "loading") {
    return (
      <Centered>
        <p className="caption" style={{ color: "var(--accent)" }}>
          STRAVA CONNECTED
        </p>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", margin: "var(--space-4) 0 var(--space-8)" }}>
          Reading your training, {firstName}.
        </h1>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-6)" }}>
          <LoadingBar />
        </div>
        <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 15, color: "var(--mid-gray)", letterSpacing: 1 }}>
          {loadingText}
        </p>
      </Centered>
    );
  }

  if (phase === "error") {
    return (
      <Centered>
        <div
          role="alert"
          style={{
            border: "3px solid var(--alert-red)",
            color: "var(--alert-red)",
            padding: "var(--space-6)",
            fontFamily: "var(--font-mono), monospace",
            fontSize: 15,
            lineHeight: 1.7,
            marginBottom: "var(--space-6)",
          }}
        >
          We couldn&apos;t pull your training data. This is usually temporary —
          give it another try.
        </div>
        <button type="button" className="btn-primary" onClick={() => run()}>
          Try again
        </button>
      </Centered>
    );
  }

  if (phase === "insufficient") {
    return (
      <Centered>
        <p className="caption" style={{ color: "var(--accent)" }}>
          NOT ENOUGH DATA YET
        </p>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", margin: "var(--space-4) 0 var(--space-6)" }}>
          Keep logging runs.
        </h1>
        <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 18, lineHeight: 1.7, color: "var(--mid-gray)" }}>
          We need more training history to generate a reliable plan. Keep logging
          runs on Strava and come back when you have 3+ months of consistent data.
        </p>
      </Centered>
    );
  }

  // phase === "ready"
  const { user, metrics } = profile as { user: ProfileUser; metrics: AthleteMetricsRow };
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(" ").toUpperCase() || "ATHLETE";
  const location = [user.city, user.country].filter(Boolean).join(", ");
  const hr = metrics.hr_zone_distribution;
  const hrWarning = hr.has_data ? hr.warning : null;

  const concerns = buildConcerns(metrics, hrWarning?.message ?? null);
  const races = [...metrics.detected_races].sort((a, b) => b.distance_km - a.distance_km);

  return (
    <section
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: "var(--space-12) 30px var(--space-20)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-6)",
      }}
    >
      {/* Card 1: Identity */}
      <ProfileCard caption="YOUR RUNNING PROFILE" captionColor="var(--accent)">
        <div style={{ display: "flex", gap: "var(--space-6)", alignItems: "center", flexWrap: "wrap" }}>
          {user.profile_photo_url ? (
            <Image
              src={user.profile_photo_url}
              alt={fullName}
              width={72}
              height={72}
              style={{ border: "3px solid var(--ink)", objectFit: "cover" }}
              unoptimized
            />
          ) : null}
          <div>
            <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", letterSpacing: "-1px" }}>{fullName}</h1>
            <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, color: "var(--mid-gray)", marginTop: "var(--space-2)" }}>
              Ultrarunner{location ? ` · ${location}` : ""} · Running since {formatStartYear(metrics.years_running)}
            </p>
          </div>
        </div>
        <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 18, marginTop: "var(--space-4)" }}>
          <strong>{metrics.total_runs}</strong> runs · <strong>{metrics.total_distance_km}</strong> km lifetime ·{" "}
          <strong>{metrics.total_time_hours}</strong> hours on feet
        </p>
      </ProfileCard>

      {/* Card 2: Current Fitness */}
      <ProfileCard caption="YOUR BASE RIGHT NOW">
        <StatLine label="Weekly average (last 4 weeks)" value={`${metrics.current_weekly_avg_km} km`} />
        <StatLine label="Runs per week" value={`${metrics.current_runs_per_week}`} />
        <StatLine
          label="Average easy pace"
          value={
            `${formatPace(metrics.current_avg_pace)} /km` +
            (metrics.current_avg_hr ? ` @ ${metrics.current_avg_hr} bpm avg` : "")
          }
        />
        {hrWarning ? (
          <p style={{ color: "var(--accent)", fontFamily: "var(--font-mono), monospace", fontSize: 15, lineHeight: 1.6, marginTop: "var(--space-4)" }}>
            → {hrWarning.message}
          </p>
        ) : null}
      </ProfileCard>

      {/* Card 3: Your Ceiling */}
      <ProfileCard caption="WHAT YOU'VE PROVEN YOU CAN DO">
        <StatLine label="Peak week ever" value={`${metrics.peak_weekly_volume_km} km`} />
        <StatLine label="Longest single run" value={`${metrics.longest_single_run_km} km`} />
        <StatLine label="Peak month" value={`${metrics.peak_monthly_volume_km} km`} />
        {metrics.fastest_10k_time_seconds ? (
          <StatLine label="Best 10k effort" value={formatTime(metrics.fastest_10k_time_seconds)} />
        ) : null}
      </ProfileCard>

      {/* Card 4: Consistency Pattern */}
      <ProfileCard caption="YOUR TRAINING RHYTHM">
        {metrics.seasonal_pattern.best_month || metrics.seasonal_pattern.worst_month ? (
          <>
            {metrics.seasonal_pattern.best_month ? (
              <StatLine label="You run most consistently in" value={metrics.seasonal_pattern.best_month.month} />
            ) : null}
            {metrics.seasonal_pattern.worst_month ? (
              <StatLine label="You tend to dip in" value={metrics.seasonal_pattern.worst_month.month} />
            ) : null}
          </>
        ) : (
          <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 16, color: "var(--mid-gray)" }}>
            Not enough seasonal history yet to spot a clear rhythm.
          </p>
        )}
      </ProfileCard>

      {/* Card 5: Detected Concerns */}
      <ProfileCard caption="THINGS WE NOTICED">
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {concerns.map((c, i) => (
            <li key={i} style={{ display: "flex", gap: "var(--space-3)", fontFamily: "var(--font-sans), sans-serif", fontSize: 16, lineHeight: 1.6 }}>
              <span style={{ color: c.kind === "warn" ? "var(--alert-red)" : "var(--confirm-green)", fontWeight: 700 }}>
                {c.kind === "warn" ? "⚠" : "✓"}
              </span>
              <span>{c.text}</span>
            </li>
          ))}
        </ul>
      </ProfileCard>

      {/* Card 6: Race History */}
      <ProfileCard caption="RACE HISTORY">
        {races.length ? (
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            {races.map((r) => (
              <li
                key={r.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: "var(--space-4)",
                  borderBottom: "1px solid var(--light-gray)",
                  paddingBottom: "var(--space-3)",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 16, fontWeight: 600 }}>
                  {r.name ?? "Race"}
                </span>
                <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 14, color: "var(--mid-gray)" }}>
                  {r.distance_km} km · {formatMonthYear(r.date)} · {r.time_formatted}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 16, color: "var(--mid-gray)" }}>
            No races auto-detected yet.
          </p>
        )}
      </ProfileCard>

      {/* Bottom CTA */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-8)" }}>
        <Link href="/plan/setup" className="btn-orange">
          Get My Training Plan →
        </Link>
      </div>
    </section>
  );
}

type Concern = { kind: "warn" | "ok"; text: string };

function buildConcerns(metrics: AthleteMetricsRow, hrWarningMessage: string | null): Concern[] {
  const concerns: Concern[] = [];

  for (const gap of metrics.detected_gaps.filter((g) => g.is_likely_injury).slice(0, 3)) {
    const context = gap.context?.length ? ` — activity name mentions "${gap.context.join("/")}"` : "";
    concerns.push({
      kind: "warn",
      text: `Training gap ${formatMonthYear(gap.start)}–${formatMonthYear(gap.end)}${context}`,
    });
  }

  if (hrWarningMessage) {
    concerns.push({ kind: "warn", text: hrWarningMessage });
  }

  if (metrics.strength_sessions_count > 0) {
    concerns.push({
      kind: "ok",
      text: `You cross-train: ${metrics.strength_sessions_count} weight training sessions logged`,
    });
  }

  const longestRace = [...metrics.detected_races]
    .filter((r) => r.distance_km >= 80)
    .sort((a, b) => b.distance_km - a.distance_km)[0];
  if (longestRace) {
    concerns.push({
      kind: "ok",
      text: `You've completed ${longestRace.distance_km} km before (${longestRace.time_formatted}, ${formatMonthYear(longestRace.date)})`,
    });
  }

  if (concerns.length === 0) {
    concerns.push({ kind: "ok", text: "Nothing concerning — your training looks consistent." });
  }

  return concerns;
}

function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 17, margin: "var(--space-2) 0", lineHeight: 1.5 }}>
      <span style={{ color: "var(--mid-gray)" }}>{label}: </span>
      <strong>{value}</strong>
    </p>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <section
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "var(--space-20) 30px",
        textAlign: "center",
      }}
    >
      {children}
    </section>
  );
}
