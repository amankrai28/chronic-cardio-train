"use client";

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import LoadingBar from "@/components/LoadingBar";

type Step = "landing" | "connect" | "connecting" | "upload" | "uploading";

const STRAVA_APP_NAME = "My Training Plan";
const STRAVA_APP_WEBSITE = "https://train.chroniccardio.com";
const STRAVA_APP_DOMAIN = "train.chroniccardio.com";
const STRAVA_APP_CATEGORY = "Training";

const STRAVA_SETTINGS_API = "https://www.strava.com/settings/api";
const STRAVA_ACCOUNT = "https://www.strava.com/account";

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

export default function OnboardingClient({
  authMessage,
}: {
  authMessage?: string;
}) {
  const [step, setStep] = useState<Step>("landing");
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      {step === "landing" ? (
        <Landing
          authMessage={authMessage}
          onConnect={() => {
            setError(null);
            setStep("connect");
          }}
        />
      ) : null}

      {step !== "landing" ? (
        <section
          style={{
            maxWidth: 980,
            margin: "0 auto",
            padding: "var(--space-12) 30px var(--space-20)",
          }}
        >
          {error ? (
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
              {error}
            </p>
          ) : null}

          {step === "connect" ? (
            <ConnectScreen
              onBack={() => {
                setError(null);
                setStep("landing");
              }}
              onError={(msg) => setError(msg)}
              onConnecting={() => {
                setError(null);
                setStep("connecting");
              }}
              onUpload={() => {
                setError(null);
                setStep("upload");
              }}
            />
          ) : null}

          {step === "connecting" ? <Connecting /> : null}

          {step === "upload" ? (
            <UploadScreen
              onBack={() => {
                setError(null);
                setStep("connect");
              }}
              onError={(msg) => setError(msg)}
              onUploading={() => {
                setError(null);
                setStep("uploading");
              }}
            />
          ) : null}

          {step === "uploading" ? <Uploading /> : null}
        </section>
      ) : null}
    </>
  );
}

// --- Landing --------------------------------------------------------------

function Landing({
  authMessage,
  onConnect,
}: {
  authMessage?: string;
  onConnect: () => void;
}) {
  return (
    <div>
      {/* Hero */}
      <section
        style={{
          padding: "var(--space-20) 30px var(--space-8)",
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

        <button
          type="button"
          className="btn-orange"
          onClick={onConnect}
          style={{ fontSize: 16 }}
        >
          Connect Your Strava →
        </button>
      </section>

      {/* Proof points */}
      <section
        style={{
          padding: "var(--space-8) 30px var(--space-12)",
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
            <span style={{ color: "var(--accent)" }}>
              Same principle: no gatekeeping.
            </span>
          </p>
          <a
            href="https://github.com/amankrai28/chronic-cardio-train/tree/main/docs"
            className="caption"
            style={{
              color: "var(--accent)",
              minHeight: 44,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            READ THE METHODOLOGY →
          </a>
        </div>
      </section>
    </div>
  );
}

// --- Connect: open Strava, create app, paste key (single screen, 3 steps) -

function ConnectScreen({
  onBack,
  onError,
  onConnecting,
  onUpload,
}: {
  onBack: () => void;
  onError: (msg: string) => void;
  onConnecting: () => void;
  onUpload: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openStrava = useCallback(() => {
    window.open(STRAVA_SETTINGS_API, "_blank");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId.trim() || !clientSecret.trim()) {
      onError("Both Client ID and Client Secret are required.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/strava/path-a", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId.trim(),
          client_secret: clientSecret.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok || typeof json.redirect !== "string") {
        onError(
          errorMessageFor(json.error) ?? "Couldn't validate those credentials.",
        );
        setSubmitting(false);
        return;
      }
      onConnecting();
      window.location.assign(json.redirect);
    } catch {
      onError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}
    >
      <BackLink onClick={onBack} />

      <div>
        <span className="caption" style={{ color: "var(--accent)" }}>
          3 STEPS · 2 MINUTES
        </span>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: "var(--space-4) 0" }}>
          Connect Your Strava
        </h2>
        <p
          style={{
            fontFamily: "var(--font-sans), sans-serif",
            fontSize: 16,
            lineHeight: 1.7,
            color: "var(--mid-gray)",
            maxWidth: 640,
          }}
        >
          We need a one-time connection to read your training history. You&apos;ll
          create a personal connection key on Strava — we walk you through every
          click.
        </p>
      </div>

      {/* Step 1 */}
      <StepDivider label="STEP 1 — OPEN STRAVA" />
      <p style={instructionStyle}>
        Click below. A new tab opens to your Strava settings. Keep this page open
        — you&apos;ll come back.
      </p>
      <button
        type="button"
        className="btn-orange"
        onClick={openStrava}
        style={{ alignSelf: "flex-start" }}
      >
        Open Strava Settings ↗
      </button>

      {/* Step 2 */}
      <StepDivider label="STEP 2 — CREATE CONNECTION" />
      <p style={instructionStyle}>
        On the Strava page, you&apos;ll see a form. Copy and paste these values
        into it, then click Create.
      </p>
      <div
        style={{
          background: "var(--ink)",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <span
          className="caption"
          style={{ color: "var(--accent)", letterSpacing: 4 }}
        >
          ↓ PASTE THESE INTO STRAVA
        </span>
        <CopyRow dark label="Application Name" value={STRAVA_APP_NAME} />
        <CopyRow dark label="Category" value={STRAVA_APP_CATEGORY} />
        <CopyRow dark label="Website" value={STRAVA_APP_WEBSITE} />
        <CopyRow dark label="Callback Domain" value={STRAVA_APP_DOMAIN} />
      </div>

      {/* Step 3 */}
      <StepDivider label="STEP 3 — PASTE YOUR KEY" />
      <p style={instructionStyle}>
        After clicking Create on Strava, you&apos;ll see two values. Copy them
        back here.
      </p>
      <div
        style={{
          border: "3px solid var(--accent)",
          padding: "var(--space-6)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-5)",
        }}
      >
        <span
          className="caption"
          style={{ color: "var(--accent)", letterSpacing: 4 }}
        >
          ↑ PASTE THESE FROM STRAVA
        </span>
        <FieldInput
          label="Client ID"
          value={clientId}
          onChange={setClientId}
          placeholder="The number shown on Strava"
          autoComplete="off"
          inputMode="numeric"
        />
        <FieldInput
          label="Client Secret"
          value={clientSecret}
          onChange={setClientSecret}
          placeholder="The long code shown on Strava"
          autoComplete="off"
          type="password"
        />
      </div>

      <button
        type="submit"
        className="btn-orange"
        disabled={submitting}
        style={{ alignSelf: "flex-start", opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? "Connecting…" : "Connect My Strava →"}
      </button>

      <button
        type="button"
        onClick={onUpload}
        style={{
          alignSelf: "flex-start",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "var(--font-sans), sans-serif",
          fontSize: 14,
          color: "var(--mid-gray)",
          textDecoration: "underline",
          minHeight: 44,
          padding: "8px 0",
        }}
      >
        Don&apos;t want to do this? Upload a file instead →
      </button>
    </form>
  );
}

function Connecting() {
  return (
    <CenteredLoad
      captionText="CONNECTING TO STRAVA"
      title="Hold on a sec…"
      subtext="Redirecting you to Strava with your credentials."
    />
  );
}

// --- Upload: alternative method (single screen, 2 steps) ------------------

function UploadScreen({
  onBack,
  onError,
  onUploading,
}: {
  onBack: () => void;
  onError: (msg: string) => void;
  onUploading: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const openStrava = useCallback(() => {
    window.open(STRAVA_ACCOUNT, "_blank");
  }, []);

  function pick(f: File | null) {
    if (!f) {
      setFile(null);
      return;
    }
    const name = f.name.toLowerCase();
    if (!name.endsWith(".zip") && !name.endsWith(".csv")) {
      onError("Please pick a .zip or .csv file.");
      return;
    }
    setFile(f);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    pick(f);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      onError("Pick a file first.");
      return;
    }
    setSubmitting(true);
    onUploading();
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload/activities", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        onError(errorMessageFor(json.error) ?? "Upload failed.");
        setSubmitting(false);
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      onError("Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}
    >
      <BackLink onClick={onBack} />

      <div>
        <span className="caption">ALTERNATIVE METHOD</span>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: "var(--space-4) 0" }}>
          Upload Your Training History
        </h2>
      </div>

      {/* Step 1 */}
      <StepDivider label="STEP 1 — DOWNLOAD YOUR ARCHIVE" />
      <ol
        style={{
          fontFamily: "var(--font-sans), sans-serif",
          fontSize: 16,
          lineHeight: 1.8,
          color: "var(--ink)",
          paddingLeft: 24,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-2)",
        }}
      >
        <li>Open Strava&apos;s Account page (button below).</li>
        <li>Scroll to &quot;Download or Delete Your Account&quot;.</li>
        <li>Click &quot;Get Started&quot; → &quot;Request Your Archive&quot;.</li>
        <li>Wait for the email (usually 5–10 min). Download the ZIP.</li>
      </ol>
      <button
        type="button"
        className="btn-primary"
        onClick={openStrava}
        style={{ alignSelf: "flex-start" }}
      >
        Open Strava Account ↗
      </button>

      {/* Step 2 */}
      <StepDivider label="STEP 2 — UPLOAD THE FILE" />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        style={{
          border: "3px dashed var(--ink)",
          background: dragging ? "var(--light-gray)" : "var(--newsprint)",
          padding: "var(--space-12) var(--space-6)",
          textAlign: "center",
          minHeight: 200,
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-3)",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 15,
            letterSpacing: 1,
          }}
        >
          {file ? `✓ ${file.name}` : "Drag your ZIP or CSV here"}
        </p>
        <p
          style={{
            fontFamily: "var(--font-sans), sans-serif",
            fontSize: 14,
            color: "var(--mid-gray)",
          }}
        >
          {file ? "Click to pick a different file" : "or click to browse"}
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,.csv"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          style={{ display: "none" }}
        />
      </div>

      <button
        type="submit"
        className="btn-orange"
        disabled={!file || submitting}
        style={{ alignSelf: "flex-start", opacity: !file || submitting ? 0.6 : 1 }}
      >
        {submitting ? "Uploading…" : "Analyze My Data →"}
      </button>

      <p
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 13,
          color: "var(--mid-gray)",
          lineHeight: 1.7,
          letterSpacing: 0.5,
        }}
      >
        Strava&apos;s file export doesn&apos;t include heart rate — HR zone
        analysis won&apos;t be available. Everything else (volume, gaps, races)
        works as normal.
      </p>
    </form>
  );
}

function Uploading() {
  return (
    <CenteredLoad
      captionText="PARSING YOUR ARCHIVE"
      title="Crunching your training…"
      subtext="Extracting activities and computing metrics."
    />
  );
}

// --- Shared bits ----------------------------------------------------------

function StepDivider({ label }: { label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-4)",
        marginTop: "var(--space-4)",
      }}
    >
      <span
        className="caption"
        style={{
          color: "var(--ink)",
          letterSpacing: 3,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
      <hr
        style={{
          flex: 1,
          border: "none",
          borderTop: "3px solid var(--ink)",
          margin: 0,
        }}
      />
    </div>
  );
}

const instructionStyle: CSSProperties = {
  fontFamily: "var(--font-sans), sans-serif",
  fontSize: 16,
  lineHeight: 1.7,
  color: "var(--ink)",
  maxWidth: 640,
};

function CopyRow({
  label,
  value,
  dark = false,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: select-and-prompt would be overkill here.
    }
  }

  return (
    <div
      style={{
        border: `3px solid ${dark ? "var(--newsprint)" : "var(--ink)"}`,
        padding: "var(--space-4) var(--space-5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-4)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 220 }}>
        <span
          className="caption"
          style={{ color: dark ? "var(--accent)" : "var(--mid-gray)" }}
        >
          {label}
        </span>
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 16,
            marginTop: 4,
            wordBreak: "break-all",
            color: dark ? "var(--newsprint)" : "var(--ink)",
          }}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        style={copyButtonStyle(copied, dark)}
        aria-label={`Copy ${label}`}
      >
        {copied ? "✓ COPIED" : "COPY"}
      </button>
    </div>
  );
}

function copyButtonStyle(copied: boolean, dark: boolean): CSSProperties {
  const base = dark ? "var(--newsprint)" : "var(--ink)";
  const text = dark ? "var(--ink)" : "var(--newsprint)";
  return {
    minHeight: 44,
    minWidth: 96,
    padding: "12px 18px",
    fontFamily: "var(--font-mono), monospace",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    background: copied ? "var(--confirm-green)" : base,
    color: copied ? "var(--newsprint)" : text,
    border: `3px solid ${copied ? "var(--confirm-green)" : base}`,
    cursor: "pointer",
  };
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  autoComplete = "off",
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  inputMode?:
    | "text"
    | "numeric"
    | "decimal"
    | "email"
    | "tel"
    | "url"
    | "search"
    | "none";
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
      <span className="caption" style={{ color: "var(--mid-gray)" }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        style={{
          border: "3px solid var(--ink)",
          background: "var(--newsprint)",
          padding: "14px 16px",
          fontFamily: "var(--font-mono), monospace",
          fontSize: 16,
          minHeight: 52,
          outline: "none",
        }}
      />
    </label>
  );
}

function CenteredLoad({
  captionText,
  title,
  subtext,
}: {
  captionText: string;
  title: string;
  subtext: string;
}) {
  return (
    <div style={{ textAlign: "center", padding: "var(--space-20) 0" }}>
      <p className="caption" style={{ color: "var(--accent)" }}>
        {captionText}
      </p>
      <h2
        style={{
          fontSize: "clamp(28px, 5vw, 44px)",
          margin: "var(--space-4) 0 var(--space-8)",
        }}
      >
        {title}
      </h2>
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "var(--space-6)",
        }}
      >
        <LoadingBar />
      </div>
      <p
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 15,
          color: "var(--mid-gray)",
          letterSpacing: 1,
        }}
      >
        {subtext}
      </p>
    </div>
  );
}

function BackLink({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        alignSelf: "flex-start",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        fontFamily: "var(--font-mono), monospace",
        fontSize: 13,
        letterSpacing: 2,
        textTransform: "uppercase",
        color: "var(--mid-gray)",
        minHeight: 44,
        padding: "8px 0",
      }}
    >
      ← BACK
    </button>
  );
}

function errorMessageFor(code: unknown): string | null {
  if (typeof code !== "string") return null;
  switch (code) {
    case "missing_credentials":
      return "Both Client ID and Client Secret are required.";
    case "invalid_client_id":
      return "Client ID should be a number (you'll see it on Strava's API page).";
    case "invalid_client_secret":
      return "That doesn't look like a valid Client Secret. Copy the full string from Strava.";
    case "missing_file":
      return "Pick a file first.";
    case "file_too_large":
      return "File is too large (100MB max).";
    case "unsupported_file_type":
      return "Please pick a .zip or .csv file.";
    case "no_activities_csv":
      return "Couldn't find activities.csv inside the ZIP.";
    case "extract_failed":
      return "Couldn't extract the ZIP. Try again or upload the CSV directly.";
    case "no_runs_found":
      return "We didn't find any runs in that CSV.";
    case "db_error":
      return "Server error saving your data. Try again.";
    default:
      return null;
  }
}
