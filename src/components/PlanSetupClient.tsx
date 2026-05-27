"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import LoadingBar from "@/components/LoadingBar";
import {
  formatTime,
  type DetectedRace,
  type GoalType,
  type RaceDistance,
} from "@/lib/metrics";

type Card = {
  key: string;
  title: string;
  value: string | number;
  rationale: string;
  adjustable: boolean;
};

const DISTANCE_OPTIONS: { value: RaceDistance; label: string; km: number }[] = [
  { value: "50K", label: "50K", km: 50 },
  { value: "50Mi", label: "50 Mi", km: 80.5 },
  { value: "100K", label: "100K", km: 100 },
  { value: "100Mi", label: "100 Mi", km: 160.9 },
  { value: "200Mi", label: "200 Mi+", km: 322 },
];

const RACE_TYPE_BY_DISTANCE: Record<RaceDistance, string | null> = {
  "50K": "50K",
  "50Mi": "50 Mile",
  "100K": "100K",
  "100Mi": "100 Mile",
  "200Mi": null,
};

const TERRAIN_OPTIONS: { value: string; label: string }[] = [
  { value: "road", label: "Road / Flat" },
  { value: "trail", label: "Trail / Rolling" },
  { value: "mountain", label: "Mountain / Technical" },
];

const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: "finish", label: "Just finish" },
  { value: "beat_time", label: "Beat my last time" },
  { value: "compete", label: "Compete for placement" },
];

function parseLeadingNumber(v: string | number): number {
  if (typeof v === "number") return v;
  const m = v.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : 0;
}

function defaultRaceMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 6);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function preselectDistance(races: DetectedRace[]): RaceDistance {
  if (!races.length) return "100K";
  const longest = races[0].distance_km; // detected_races is sorted desc by distance
  // 5% tolerance so a recorded 100-miler (~160.6 km) still maps to 100Mi (160.9).
  let pick: RaceDistance = DISTANCE_OPTIONS[0].value;
  for (const o of DISTANCE_OPTIONS) {
    if (o.km <= longest * 1.05) pick = o.value;
  }
  return pick;
}

function findPreviousRace(races: DetectedRace[], dist: RaceDistance): DetectedRace | null {
  const opt = DISTANCE_OPTIONS.find((o) => o.value === dist);
  if (!opt) return null;
  const stdName = RACE_TYPE_BY_DISTANCE[dist];
  const matches = races.filter(
    (r) =>
      (stdName !== null && r.race_type === stdName) ||
      Math.abs(r.distance_km - opt.km) / opt.km <= 0.08,
  );
  if (!matches.length) return null;
  return matches.reduce((best, r) => (r.time_seconds < best.time_seconds ? r : best));
}

// "H:MM:SS" / "MM:SS" / "SS" → seconds. Returns null if blank or malformed.
function parseHmsToSeconds(input: string): number | null {
  const t = input.trim();
  if (!t) return null;
  const parts = t.split(":").map((p) => p.trim());
  if (parts.some((p) => p === "" || Number.isNaN(Number(p)))) return null;
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + Number(p);
  return seconds > 0 ? Math.round(seconds) : null;
}

export default function PlanSetupClient({ detectedRaces }: { detectedRaces: DetectedRace[] }) {
  const router = useRouter();

  // --- Section A: the goal ---
  const [raceName, setRaceName] = useState("");
  const [raceDistance, setRaceDistance] = useState<RaceDistance>(() => preselectDistance(detectedRaces));
  const [raceMonth, setRaceMonth] = useState(defaultRaceMonth);
  const [terrain, setTerrain] = useState("trail");
  const [goalType, setGoalType] = useState<GoalType>("finish");
  const [targetTimeStr, setTargetTimeStr] = useState("");

  const previousRace = useMemo(
    () => findPreviousRace(detectedRaces, raceDistance),
    [detectedRaces, raceDistance],
  );

  // --- Section B: inferred defaults ---
  const [cards, setCards] = useState<Card[]>([]);
  const [loadingDefaults, setLoadingDefaults] = useState(true);
  const [defaultsError, setDefaultsError] = useState(false);
  const latestReq = useRef(0);

  const [startVolumeKm, setStartVolumeKm] = useState(0);
  const [peakVolumeKm, setPeakVolumeKm] = useState(0);
  const [trainingDays, setTrainingDays] = useState(5);
  const [injuryConservative, setInjuryConservative] = useState(true);

  const startTouched = useRef(false);
  const peakTouched = useRef(false);
  const trainingTouched = useRef(false);
  const injuryTouched = useRef(false);

  // Per-card UI affordances.
  const [startEditing, setStartEditing] = useState(false);
  const [peakEditing, setPeakEditing] = useState(false);
  const [trainingEditing, setTrainingEditing] = useState(false);
  const [startConfirmed, setStartConfirmed] = useState(false);
  const [peakConfirmed, setPeakConfirmed] = useState(false);
  const [trainingConfirmed, setTrainingConfirmed] = useState(false);
  const [injuryConfirmed, setInjuryConfirmed] = useState(false);
  const [hrAck, setHrAck] = useState(false);

  // --- Submit ---
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(false);

  // Re-fetch defaults whenever distance or goal changes. peak_volume depends on
  // both; a distance change clears peakTouched (handled in the selector) so peak
  // always refreshes, while a goal-only change respects a manual override.
  useEffect(() => {
    const controller = new AbortController();
    const reqId = ++latestReq.current;
    setLoadingDefaults(true);
    setDefaultsError(false);

    fetch(`/api/athlete/defaults?race_distance=${raceDistance}&goal_type=${goalType}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("defaults_failed"))))
      .then((data: { cards?: Card[] }) => {
        if (reqId !== latestReq.current) return;
        setCards(data.cards ?? []);
        setLoadingDefaults(false);
      })
      .catch(() => {
        if (controller.signal.aborted || reqId !== latestReq.current) return;
        setDefaultsError(true);
        setLoadingDefaults(false);
      });

    return () => controller.abort();
  }, [raceDistance, goalType]);

  // Seed the editable values from freshly fetched cards, unless the user has
  // manually overridden the corresponding field.
  useEffect(() => {
    const sv = cards.find((c) => c.key === "starting_volume");
    if (sv && !startTouched.current) setStartVolumeKm(parseLeadingNumber(sv.value));

    const pv = cards.find((c) => c.key === "peak_volume");
    if (pv && !peakTouched.current) setPeakVolumeKm(parseLeadingNumber(pv.value));

    const td = cards.find((c) => c.key === "training_days");
    if (td && !trainingTouched.current) setTrainingDays(parseLeadingNumber(td.value));

    const inj = cards.find((c) => c.key === "injury_conservative");
    if (inj && !injuryTouched.current) setInjuryConservative(true);
  }, [cards]);

  const startCard = cards.find((c) => c.key === "starting_volume");
  const peakCard = cards.find((c) => c.key === "peak_volume");
  const trainingCard = cards.find((c) => c.key === "training_days");
  const injuryCard = cards.find((c) => c.key === "injury_conservative");
  const hrCard = cards.find((c) => c.key === "hr_zone_fix");

  function handleDistance(d: RaceDistance) {
    if (d === raceDistance) return;
    setRaceDistance(d);
    // Distance changes the appropriate peak target — always refresh it.
    peakTouched.current = false;
    setPeakConfirmed(false);
    setPeakEditing(false);
  }

  async function handleGenerate() {
    setGenerating(true);
    setGenerateError(false);
    try {
      const res = await fetch("/api/plan/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          race_name: raceName.trim() || null,
          race_distance: raceDistance,
          race_date: `${raceMonth}-01`,
          terrain,
          goal_type: goalType,
          previous_time_seconds:
            goalType === "beat_time" ? previousRace?.time_seconds ?? null : null,
          target_time_seconds:
            goalType === "beat_time" ? parseHmsToSeconds(targetTimeStr) : null,
          start_volume_km: startVolumeKm,
          peak_volume_km: peakVolumeKm,
          training_days_per_week: trainingDays,
          injury_conservative: injuryCard ? injuryConservative : false,
        }),
      });
      if (!res.ok) throw new Error("generate_failed");
      const data = (await res.json()) as { id: string };
      router.push(`/plan/${data.id}`);
    } catch {
      setGenerateError(true);
      setGenerating(false);
    }
  }

  return (
    <section
      style={{
        maxWidth: 760,
        margin: "0 auto",
        padding: "var(--space-12) 30px var(--space-20)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-8)",
      }}
    >
      <div>
        <p className="caption" style={{ color: "var(--accent)" }}>
          BUILD YOUR PLAN
        </p>
        <h1 style={{ fontSize: "clamp(28px, 5vw, 44px)", margin: "var(--space-4) 0 var(--space-2)" }}>
          Confirm the details.
        </h1>
        <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 18, color: "var(--mid-gray)", lineHeight: 1.6 }}>
          This isn&apos;t a form. We&apos;ve pre-filled everything from your data —
          just tell us the race, then confirm or tweak.
        </p>
      </div>

      {/* ---- Section A ---- */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <SectionHeading caption="THE ONLY THING WE ASK" title="What are you training for?" />

        <Field label="Race name (optional)">
          <input
            type="text"
            value={raceName}
            onChange={(e) => setRaceName(e.target.value)}
            placeholder="e.g. Western States 100"
            style={inputStyle}
          />
        </Field>

        <Field label="Distance">
          <ButtonGroup>
            {DISTANCE_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                style={toggleStyle(o.value === raceDistance)}
                onClick={() => handleDistance(o.value)}
              >
                {o.label}
              </button>
            ))}
          </ButtonGroup>
        </Field>

        <Field label="When">
          <input
            type="month"
            value={raceMonth}
            onChange={(e) => setRaceMonth(e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Terrain">
          <ButtonGroup>
            {TERRAIN_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                style={toggleStyle(o.value === terrain)}
                onClick={() => setTerrain(o.value)}
              >
                {o.label}
              </button>
            ))}
          </ButtonGroup>
        </Field>

        <Field label="What's your goal?">
          <ButtonGroup>
            {GOAL_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                style={toggleStyle(o.value === goalType)}
                onClick={() => setGoalType(o.value)}
              >
                {o.label}
              </button>
            ))}
          </ButtonGroup>
        </Field>

        {goalType === "beat_time" ? (
          <div
            style={{
              border: "3px solid var(--ink)",
              padding: "var(--space-6)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {previousRace ? (
              <>
                <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 16 }}>
                  Your previous time at this distance:{" "}
                  <strong>{formatTime(previousRace.time_seconds)}</strong>
                  <span style={{ color: "var(--mid-gray)" }}>
                    {" "}
                    ({previousRace.distance_km} km
                    {previousRace.name ? ` · ${previousRace.name}` : ""})
                  </span>
                </p>
                <Field label="Target time (optional)">
                  <input
                    type="text"
                    value={targetTimeStr}
                    onChange={(e) => setTargetTimeStr(e.target.value)}
                    placeholder="HH:MM:SS"
                    style={inputStyle}
                  />
                </Field>
              </>
            ) : (
              <>
                <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 16, color: "var(--mid-gray)" }}>
                  We couldn&apos;t find a previous race at this distance in your
                  history. You can still target a time below.
                </p>
                <Field label="Target time (optional)">
                  <input
                    type="text"
                    value={targetTimeStr}
                    onChange={(e) => setTargetTimeStr(e.target.value)}
                    placeholder="HH:MM:SS"
                    style={inputStyle}
                  />
                </Field>
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* ---- Section B ---- */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        <SectionHeading
          caption="WE BUILT THESE FROM YOUR DATA"
          title="Confirm or tweak."
        />

        {loadingDefaults && cards.length === 0 ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "var(--space-8)" }}>
            <LoadingBar />
          </div>
        ) : defaultsError ? (
          <AlertBox>We couldn&apos;t load your defaults. Try changing a selection above.</AlertBox>
        ) : (
          <>
            {startCard ? (
              <SetupCard
                title={startCard.title}
                value={`${startVolumeKm} km/week`}
                rationale={startCard.rationale}
                confirmed={startConfirmed}
              >
                <ConfirmRow
                  confirmed={startConfirmed}
                  editing={startEditing}
                  onConfirm={() => {
                    setStartConfirmed(true);
                    setStartEditing(false);
                  }}
                  onAdjust={() => {
                    setStartEditing((v) => !v);
                    setStartConfirmed(false);
                  }}
                />
                {startEditing ? (
                  <SliderRow
                    min={40}
                    max={100}
                    step={5}
                    value={startVolumeKm}
                    unit="km/wk"
                    onChange={(v) => {
                      setStartVolumeKm(v);
                      startTouched.current = true;
                    }}
                  />
                ) : null}
              </SetupCard>
            ) : null}

            {peakCard ? (
              <SetupCard
                title={peakCard.title}
                value={`${peakVolumeKm} km/week`}
                rationale={peakCard.rationale}
                confirmed={peakConfirmed}
              >
                <ConfirmRow
                  confirmed={peakConfirmed}
                  editing={peakEditing}
                  onConfirm={() => {
                    setPeakConfirmed(true);
                    setPeakEditing(false);
                  }}
                  onAdjust={() => {
                    setPeakEditing((v) => !v);
                    setPeakConfirmed(false);
                  }}
                />
                {peakEditing ? (
                  <SliderRow
                    min={80}
                    max={160}
                    step={5}
                    value={peakVolumeKm}
                    unit="km/wk"
                    onChange={(v) => {
                      setPeakVolumeKm(v);
                      peakTouched.current = true;
                    }}
                  />
                ) : null}
              </SetupCard>
            ) : null}

            {trainingCard ? (
              <SetupCard
                title={trainingCard.title}
                value={`${trainingDays} days/week`}
                rationale={trainingCard.rationale}
                confirmed={trainingConfirmed}
              >
                <ConfirmRow
                  confirmed={trainingConfirmed}
                  editing={trainingEditing}
                  onConfirm={() => {
                    setTrainingConfirmed(true);
                    setTrainingEditing(false);
                  }}
                  onAdjust={() => {
                    setTrainingEditing((v) => !v);
                    setTrainingConfirmed(false);
                  }}
                />
                {trainingEditing ? (
                  <ButtonGroup>
                    {[4, 5, 6].map((d) => (
                      <button
                        key={d}
                        type="button"
                        style={toggleStyle(d === trainingDays)}
                        onClick={() => {
                          setTrainingDays(d);
                          trainingTouched.current = true;
                        }}
                      >
                        {d} days
                      </button>
                    ))}
                  </ButtonGroup>
                ) : null}
              </SetupCard>
            ) : null}

            {injuryCard ? (
              <SetupCard
                title={injuryCard.title}
                value={injuryConservative ? "Conservative base phase" : "Standard progression"}
                rationale={injuryCard.rationale}
                confirmed={injuryConfirmed}
              >
                <div style={confirmRowStyle}>
                  <button
                    type="button"
                    style={smallButtonStyle(injuryConservative && injuryConfirmed, true)}
                    onClick={() => {
                      setInjuryConservative(true);
                      injuryTouched.current = true;
                      setInjuryConfirmed(true);
                    }}
                  >
                    That&apos;s right
                  </button>
                  <button
                    type="button"
                    style={smallButtonStyle(!injuryConservative, false)}
                    onClick={() => {
                      setInjuryConservative(false);
                      injuryTouched.current = true;
                      setInjuryConfirmed(false);
                    }}
                  >
                    Not an issue anymore
                  </button>
                </div>
              </SetupCard>
            ) : null}

            {hrCard ? (
              <SetupCard
                title={hrCard.title}
                value={typeof hrCard.value === "number" ? String(hrCard.value) : hrCard.value}
                rationale={hrCard.rationale}
                confirmed={hrAck}
              >
                <div style={confirmRowStyle}>
                  <button
                    type="button"
                    style={smallButtonStyle(hrAck, true)}
                    onClick={() => setHrAck(true)}
                  >
                    I understand
                  </button>
                </div>
              </SetupCard>
            ) : null}
          </>
        )}
      </div>

      {/* ---- Generate ---- */}
      {generateError ? (
        <AlertBox>Something went wrong generating your plan. Please try again.</AlertBox>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-4)" }}>
        {generating ? <LoadingBar /> : null}
        <button
          type="button"
          className="btn-orange"
          onClick={handleGenerate}
          disabled={generating || loadingDefaults}
          style={generating || loadingDefaults ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
        >
          {generating ? "Generating…" : "Generate My Plan →"}
        </button>
      </div>
    </section>
  );
}

// ---- Presentational helpers ----

function SectionHeading({ caption, title }: { caption: string; title: string }) {
  return (
    <div>
      <p className="caption" style={{ color: "var(--accent)" }}>
        {caption}
      </p>
      <h2 style={{ fontSize: "clamp(20px, 3vw, 28px)", marginTop: "var(--space-2)" }}>{title}</h2>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <span className="caption">{label}</span>
      {children}
    </div>
  );
}

function ButtonGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>{children}</div>
  );
}

function SetupCard({
  title,
  value,
  rationale,
  confirmed,
  children,
}: {
  title: string;
  value: string;
  rationale: string;
  confirmed: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: "3px solid var(--ink)",
        background: "var(--newsprint)",
        padding: "var(--space-6)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-4)", flexWrap: "wrap" }}>
        <span className="caption">{title}</span>
        {confirmed ? (
          <span
            className="caption"
            style={{ color: "var(--confirm-green)" }}
          >
            ✓ Confirmed
          </span>
        ) : null}
      </div>
      <p style={{ fontFamily: "var(--font-display), monospace", fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 700 }}>
        {value}
      </p>
      <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 15, color: "var(--mid-gray)", lineHeight: 1.6 }}>
        {rationale}
      </p>
      {children}
    </div>
  );
}

const confirmRowStyle: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "var(--space-2)",
  marginTop: "var(--space-2)",
};

function ConfirmRow({
  confirmed,
  editing,
  onConfirm,
  onAdjust,
}: {
  confirmed: boolean;
  editing: boolean;
  onConfirm: () => void;
  onAdjust: () => void;
}) {
  return (
    <div style={confirmRowStyle}>
      <button type="button" style={smallButtonStyle(confirmed, true)} onClick={onConfirm}>
        That&apos;s right
      </button>
      <button type="button" style={smallButtonStyle(editing, false)} onClick={onAdjust}>
        Actually… {editing ? "▴" : "▾"}
      </button>
    </div>
  );
}

function SliderRow({
  min,
  max,
  step,
  value,
  unit,
  onChange,
}: {
  min: number;
  max: number;
  step: number;
  value: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4)", marginTop: "var(--space-2)" }}>
      <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 13, color: "var(--mid-gray)" }}>{min}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: "var(--accent)", height: 44 }}
      />
      <span style={{ fontFamily: "var(--font-mono), monospace", fontSize: 13, color: "var(--mid-gray)" }}>{max}</span>
      <span style={{ fontFamily: "var(--font-display), monospace", fontWeight: 700, fontSize: 15, minWidth: 90, textAlign: "right" }}>
        {value} {unit}
      </span>
    </div>
  );
}

function AlertBox({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="alert"
      style={{
        border: "3px solid var(--alert-red)",
        color: "var(--alert-red)",
        padding: "var(--space-4)",
        fontFamily: "var(--font-mono), monospace",
        fontSize: 14,
        lineHeight: 1.6,
      }}
    >
      {children}
    </div>
  );
}

// ---- Inline style helpers ----

const inputStyle: React.CSSProperties = {
  minHeight: 44,
  padding: "10px 14px",
  border: "3px solid var(--ink)",
  background: "var(--newsprint)",
  color: "var(--ink)",
  fontFamily: "var(--font-mono), monospace",
  fontSize: 15,
  width: "100%",
  maxWidth: 360,
};

function toggleStyle(selected: boolean): React.CSSProperties {
  return {
    minHeight: 44,
    padding: "12px 18px",
    fontFamily: "var(--font-display), monospace",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    cursor: "pointer",
    border: "3px solid var(--ink)",
    background: selected ? "var(--ink)" : "transparent",
    color: selected ? "var(--newsprint)" : "var(--ink)",
    transition: "all 0.15s",
  };
}

function smallButtonStyle(active: boolean, isConfirm: boolean): React.CSSProperties {
  const activeColor = isConfirm ? "var(--confirm-green)" : "var(--ink)";
  return {
    minHeight: 44,
    padding: "10px 16px",
    fontFamily: "var(--font-mono), monospace",
    fontWeight: 700,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: "uppercase",
    cursor: "pointer",
    border: `3px solid ${active ? activeColor : "var(--ink)"}`,
    background: active ? activeColor : "transparent",
    color: active ? "var(--newsprint)" : "var(--ink)",
    transition: "all 0.15s",
  };
}
