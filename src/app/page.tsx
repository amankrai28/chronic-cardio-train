const AUTH_MESSAGES: Record<string, string> = {
  denied: "Strava connection was cancelled. Connect to continue.",
  invalid_state: "Your session expired before connecting. Please try again.",
  missing_code: "Strava didn't return an authorization code. Please try again.",
  no_athlete: "We couldn't read your Strava profile. Please try again.",
  db_error: "Something went wrong saving your account. Please try again.",
  error: "Something went wrong connecting to Strava. Please try again.",
};

const PROOF_POINTS = [
  {
    label: "01",
    title: "We read your last 2+ years",
    body: "Every run, every gap, every peak. We analyze your full Strava history to understand how you actually train.",
  },
  {
    label: "02",
    title: "Plans are daily, not weekly",
    body: "Not a generic template. A day-by-day plan with distances, zones, workouts, strength, and nutrition cues.",
  },
  {
    label: "03",
    title: "Open-source methodology",
    body: "No black box. The coaching rules behind every plan are published. Read exactly how it works.",
  },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const { auth } = await searchParams;
  const authMessage = auth ? AUTH_MESSAGES[auth] : undefined;

  return (
    <div>
      {/* Hero */}
      <section
        style={{
          padding: "var(--space-20) 30px var(--space-12)",
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        {authMessage ? (
          <p
            role="alert"
            style={{
              border: "3px solid var(--alert-red)",
              color: "var(--alert-red)",
              padding: "var(--space-3) var(--space-4)",
              marginBottom: "var(--space-8)",
              fontFamily: "var(--font-mono), monospace",
              fontSize: 13,
              letterSpacing: 1,
            }}
          >
            {authMessage}
          </p>
        ) : null}

        <p
          className="caption"
          style={{
            background: "var(--ink)",
            color: "var(--newsprint)",
            display: "inline-block",
            padding: "8px 18px",
            marginBottom: "var(--space-8)",
            letterSpacing: 5,
          }}
        >
          FREE · OPEN SOURCE · FOR ULTRARUNNERS
        </p>

        <h1
          style={{
            fontSize: "clamp(40px, 8vw, 80px)",
            lineHeight: 1.0,
            letterSpacing: "-2px",
            marginBottom: "var(--space-6)",
          }}
        >
          Your Strava data.
          <br />
          A real plan.
          <br />
          <span style={{ color: "var(--accent)" }}>Zero guesswork.</span>
        </h1>

        <p
          style={{
            fontFamily: "var(--font-sans), sans-serif",
            fontSize: 20,
            lineHeight: 1.7,
            color: "var(--mid-gray)",
            maxWidth: 600,
            marginBottom: "var(--space-8)",
          }}
        >
          We read your training history, detect your patterns, and generate a
          personalized daily training plan using evidence-based coaching
          principles. No paywalls. No guessing.
        </p>

        <a href="/api/auth/strava" className="btn-orange">
          Connect Strava
        </a>
      </section>

      {/* Proof points */}
      <section
        style={{
          padding: "var(--space-12) 30px",
          maxWidth: 980,
          margin: "0 auto",
          display: "grid",
          gap: "var(--space-6)",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
        }}
      >
        {PROOF_POINTS.map((p) => (
          <div key={p.label} className="card">
            <span className="caption" style={{ color: "var(--accent)" }}>
              {p.label}
            </span>
            <h2 style={{ fontSize: 20, margin: "var(--space-3) 0 var(--space-4)" }}>
              {p.title}
            </h2>
            <p
              style={{
                fontFamily: "var(--font-sans), sans-serif",
                fontSize: 15,
                color: "var(--mid-gray)",
                lineHeight: 1.7,
              }}
            >
              {p.body}
            </p>
          </div>
        ))}
      </section>

      {/* Methodology callout */}
      <section
        style={{
          padding: "0 30px var(--space-20)",
          maxWidth: 980,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            background: "var(--ink)",
            color: "var(--newsprint)",
            padding: "var(--space-8)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono), monospace",
              fontSize: 17,
              lineHeight: 1.7,
              marginBottom: "var(--space-4)",
            }}
          >
            We published every gel recipe. Now we&apos;re publishing the training
            methodology.{" "}
            <span style={{ color: "var(--accent)" }}>Same principle: no gatekeeping.</span>
          </p>
          <a
            href="https://github.com/amankrai28/chronic-cardio-train/tree/main/docs"
            className="caption"
            style={{ color: "var(--accent)", minHeight: 44, display: "inline-flex", alignItems: "center" }}
          >
            READ THE METHODOLOGY →
          </a>
        </div>
      </section>
    </div>
  );
}
