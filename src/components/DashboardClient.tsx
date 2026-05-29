"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import LoadingBar from "@/components/LoadingBar";
import ProfileCard from "@/components/ProfileCard";
import { formatTime, type AthleteMetricsRow } from "@/lib/metrics";
import { formatPace, formatMonthYear, formatStartYear } from "@/lib/utils";
import {
  convertPace,
  formatDistanceWithUnit,
  paceUnit,
  type UnitSystem,
} from "@/lib/units";

type ProfileUser = {
  firstname: string | null;
  lastname: string | null;
  city: string | null;
  country: string | null;
  profile_photo_url: string | null;
  auth_method?: "oauth" | "byok" | "csv";
};

type Profile = {
  user: ProfileUser;
  metrics: AthleteMetricsRow | null;
  unit_system?: UnitSystem;
  snapshot_at?: string | null;
};

type Phase = "loading" | "ready" | "insufficient" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const minDelay = (start: number, ms: number) =>
  sleep(Math.max(0, ms - (Date.now() - start)));

export default function DashboardClient({ firstName }: { firstName: string }) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [loadingText, setLoadingText] = useState("Pulling your runs…");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showFull, setShowFull] = useState(false);

  async function run() {
    setPhase("loading");
    try {
      // Peek at the profile first so we know whether to trigger a sync.
      // For BYOK/CSV users, the snapshot was captured at onboarding and
      // /api/strava/sync would just return { skipped: true } — calling
      // it would also be misleading ("Pulling your runs…" with nothing
      // to pull). We skip it entirely for those auth methods.
      const pull = Date.now();
      setLoadingText("Reading your training…");
      const peekRes = await fetch("/api/athlete/profile");
      if (!peekRes.ok) throw new Error("profile_failed");
      const peek = (await peekRes.json()) as Profile;
      const method = peek.user.auth_method ?? "oauth";

      let activitiesCount = peek.metrics?.total_runs ?? 0;
      if (method === "oauth") {
        setLoadingText("Pulling your runs…");
        const syncRes = await fetch("/api/strava/sync", { method: "POST" });
        if (!syncRes.ok) throw new Error("sync_failed");
        const sync = await syncRes.json();
        if (typeof sync.activities_synced === "number" && sync.activities_synced > 0) {
          activitiesCount = sync.activities_synced;
        }
      }
      await minDelay(pull, 700);

      const crunch = Date.now();
      setLoadingText(
        activitiesCount > 0
          ? `Crunching ${activitiesCount} activities…`
          : "Crunching your activities…",
      );
      await minDelay(crunch, 700);

      const almost = Date.now();
      setLoadingText("Almost there…");
      // Re-fetch profile post-sync so oauth users see fresh metrics; for
      // BYOK/CSV reuse the peek we already did.
      const data: Profile = method === "oauth"
        ? (await (await fetch("/api/athlete/profile")).json()) as Profile
        : peek;
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
  const system: UnitSystem = profile?.unit_system ?? "metric";
  const authMethod = user.auth_method ?? "oauth";
  const snapshotAt = profile?.snapshot_at ?? null;
  const fullName = [user.firstname, user.lastname].filter(Boolean).join(" ").toUpperCase() || "ATHLETE";
  const location = [user.city, user.country].filter(Boolean).join(", ");
  const hr = metrics.hr_zone_distribution;
  const hrWarning = hr.has_data ? hr.warning : null;

  const concerns = buildConcerns(metrics, hrWarning?.message ?? null, system);
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
      {authMethod !== "oauth" ? (
        <SnapshotBanner method={authMethod} snapshotAt={snapshotAt} />
      ) : null}

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
          <strong>{metrics.total_runs}</strong> runs · <strong>{formatDistanceWithUnit(metrics.total_distance_km, system)}</strong> lifetime ·{" "}
          <strong>{metrics.total_time_hours}</strong> hours on feet
        </p>
      </ProfileCard>

      {/* Card 2: Current Fitness */}
      <ProfileCard caption="YOUR BASE RIGHT NOW">
        <StatLine label="Weekly average (last 4 weeks)" value={formatDistanceWithUnit(metrics.current_weekly_avg_km, system)} />
        <StatLine label="Runs per week" value={`${metrics.current_runs_per_week}`} />
        <StatLine
          label="Average easy pace"
          value={
            `${formatPace(convertPace(metrics.current_avg_pace, system))} ${paceUnit(system)}` +
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
        <StatLine label="Peak week ever" value={formatDistanceWithUnit(metrics.peak_weekly_volume_km, system)} />
        <StatLine label="Longest single run" value={formatDistanceWithUnit(metrics.longest_single_run_km, system)} />
        <StatLine label="Peak month" value={formatDistanceWithUnit(metrics.peak_monthly_volume_km, system)} />
        {metrics.fastest_10k_time_seconds ? (
          <StatLine label="Best 10k effort" value={formatTime(metrics.fastest_10k_time_seconds)} />
        ) : null}
      </ProfileCard>

      {/* Bottom CTA — surfaced right after the core "wow moment" cards */}
      <div style={{ display: "flex", justifyContent: "center", marginTop: "var(--space-8)" }}>
        <Link href="/plan/setup" className="btn-orange">
          Get My Training Plan →
        </Link>
      </div>

      {/* Toggle for the detailed analysis below */}
      <button
        type="button"
        onClick={() => setShowFull((v) => !v)}
        aria-expanded={showFull}
        style={{
          alignSelf: "center",
          minHeight: 44,
          padding: "12px 24px",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 13,
          letterSpacing: 2,
          textTransform: "uppercase",
          background: "var(--newsprint)",
          color: "var(--ink)",
          border: "3px solid var(--ink)",
          cursor: "pointer",
        }}
      >
        {showFull ? "Hide full analysis ▴" : "See full analysis ▾"}
      </button>

      {showFull ? (
        <>
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
                  {formatDistanceWithUnit(r.distance_km, system)} · {formatMonthYear(r.date)} · {r.time_formatted}
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
        </>
      ) : null}
    </section>
  );
}

type Concern = { kind: "warn" | "ok"; text: string };

function buildConcerns(metrics: AthleteMetricsRow, hrWarningMessage: string | null, system: UnitSystem): Concern[] {
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
      text: `You've completed ${formatDistanceWithUnit(longestRace.distance_km, system)} before (${longestRace.time_formatted}, ${formatMonthYear(longestRace.date)})`,
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

function SnapshotBanner({
  method,
  snapshotAt,
}: {
  method: "byok" | "csv";
  snapshotAt: string | null;
}) {
  const dateLabel = snapshotAt
    ? new Date(snapshotAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  const body =
    method === "csv"
      ? "Connected via file upload. HR zone analysis is unavailable in Strava's CSV export — reconnect via API key for full analysis."
      : `Snapshot${dateLabel ? ` from ${dateLabel}` : ""}. Tokens from your Strava app expire after a few hours and we don't store your secret. To refresh data, reconnect via API key.`;
  return (
    <div
      role="note"
      style={{
        border: "3px solid var(--ink)",
        padding: "var(--space-5) var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <span className="caption" style={{ color: "var(--accent)" }}>
        {method === "csv" ? "FILE UPLOAD" : "ONE-SHOT SNAPSHOT"}
      </span>
      <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
        {body}
      </p>
      <Link
        href="/"
        className="caption"
        style={{ color: "var(--accent)", minHeight: 44, display: "inline-flex", alignItems: "center" }}
      >
        RECONNECT TO REFRESH DATA →
      </Link>
    </div>
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
