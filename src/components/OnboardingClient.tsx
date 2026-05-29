"use client";

import {
  useCallback,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";
import LoadingBar from "@/components/LoadingBar";

type Step =
  | "choosing"
  | "pathA_setup"
  | "pathA_creds"
  | "pathA_connecting"
  | "pathB_instructions"
  | "pathB_upload"
  | "pathB_processing";

const STRAVA_APP_NAME = "My Training Plan";
const STRAVA_APP_WEBSITE = "https://train.chroniccardio.com";
const STRAVA_APP_DOMAIN = "train.chroniccardio.com";
const STRAVA_APP_CATEGORY = "Training";

const STRAVA_SETTINGS_API = "https://www.strava.com/settings/api";
const STRAVA_ACCOUNT = "https://www.strava.com/account";

export default function OnboardingClient({
  directOAuthEnabled,
}: {
  directOAuthEnabled: boolean;
}) {
  const [step, setStep] = useState<Step>("choosing");
  const [error, setError] = useState<string | null>(null);

  return (
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

      {step === "choosing" ? (
        <ChoosingView
          directOAuthEnabled={directOAuthEnabled}
          onPickA={() => {
            setError(null);
            setStep("pathA_setup");
          }}
          onPickB={() => {
            setError(null);
            setStep("pathB_instructions");
          }}
        />
      ) : null}

      {step === "pathA_setup" ? (
        <PathASetup
          onBack={() => setStep("choosing")}
          onContinue={() => setStep("pathA_creds")}
        />
      ) : null}

      {step === "pathA_creds" ? (
        <PathACreds
          onBack={() => setStep("pathA_setup")}
          onError={(msg) => setError(msg)}
          onConnecting={() => {
            setError(null);
            setStep("pathA_connecting");
          }}
        />
      ) : null}

      {step === "pathA_connecting" ? <PathAConnecting /> : null}

      {step === "pathB_instructions" ? (
        <PathBInstructions
          onBack={() => setStep("choosing")}
          onContinue={() => setStep("pathB_upload")}
        />
      ) : null}

      {step === "pathB_upload" ? (
        <PathBUpload
          onBack={() => setStep("pathB_instructions")}
          onError={(msg) => setError(msg)}
          onProcessing={() => {
            setError(null);
            setStep("pathB_processing");
          }}
        />
      ) : null}

      {step === "pathB_processing" ? <PathBProcessing /> : null}
    </section>
  );
}

// --- Choosing -------------------------------------------------------------

function ChoosingView({
  directOAuthEnabled,
  onPickA,
  onPickB,
}: {
  directOAuthEnabled: boolean;
  onPickA: () => void;
  onPickB: () => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      {directOAuthEnabled ? (
        <div
          style={{
            background: "var(--ink)",
            color: "var(--newsprint)",
            padding: "var(--space-6)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
          }}
        >
          <span className="caption" style={{ color: "var(--accent)" }}>
            ONE-CLICK CONNECT
          </span>
          <h2 style={{ fontSize: 26, color: "var(--newsprint)" }}>
            Connect Strava directly
          </h2>
          <a href="/api/auth/strava" className="btn-orange" style={{ alignSelf: "flex-start" }}>
            Connect Strava
          </a>
        </div>
      ) : (
        <div>
          <p
            className="caption"
            style={{
              background: "var(--ink)",
              color: "var(--newsprint)",
              display: "inline-block",
              padding: "8px 18px",
              marginBottom: "var(--space-4)",
              letterSpacing: 4,
            }}
          >
            STRAVA IS REVIEWING OUR API APP
          </p>
          <p
            style={{
              fontFamily: "var(--font-sans), sans-serif",
              fontSize: 16,
              lineHeight: 1.7,
              color: "var(--mid-gray)",
              maxWidth: 720,
            }}
          >
            Until they approve us, direct OAuth is throttled to a single
            athlete. Pick one of the two workarounds below — both work today.
          </p>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: "var(--space-6)",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        }}
      >
        <PathCard
          tag="FASTEST · RECOMMENDED"
          tagColor="var(--accent)"
          title="Connect via API Key"
          body="Make a quick Strava API app in your own account, paste two values, OAuth into yourself. Full HR analysis."
          duration="~2 minutes"
          ctaLabel="Use API Key →"
          ctaClass="btn-orange"
          onClick={onPickA}
        />
        <PathCard
          tag="NO API KEY NEEDED"
          tagColor="var(--ink)"
          title="Upload Strava Export"
          body="Request your Strava archive, wait for the email, upload the ZIP. No HR/suffer data in CSV exports."
          duration="~5 minutes + email wait"
          ctaLabel="Upload Export →"
          ctaClass="btn-primary"
          onClick={onPickB}
        />
      </div>
    </div>
  );
}

function PathCard({
  tag,
  tagColor,
  title,
  body,
  duration,
  ctaLabel,
  ctaClass,
  onClick,
}: {
  tag: string;
  tagColor: string;
  title: string;
  body: string;
  duration: string;
  ctaLabel: string;
  ctaClass: string;
  onClick: () => void;
}) {
  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
      <span className="caption" style={{ color: tagColor }}>
        {tag}
      </span>
      <h2 style={{ fontSize: 24 }}>{title}</h2>
      <p
        style={{
          fontFamily: "var(--font-sans), sans-serif",
          fontSize: 15,
          color: "var(--mid-gray)",
          lineHeight: 1.7,
          flex: 1,
        }}
      >
        {body}
      </p>
      <p
        className="caption"
        style={{ color: "var(--mid-gray)", letterSpacing: 2 }}
      >
        {duration}
      </p>
      <button type="button" className={ctaClass} onClick={onClick} style={{ alignSelf: "flex-start" }}>
        {ctaLabel}
      </button>
    </div>
  );
}

// --- Path A: setup --------------------------------------------------------

function PathASetup({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  const [createdChecked, setCreatedChecked] = useState(false);
  const [credsChecked, setCredsChecked] = useState(false);

  const openStrava = useCallback(() => {
    window.open(STRAVA_SETTINGS_API, "strava_app", "width=800,height=700");
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <BackLink onClick={onBack} />

      <div>
        <span className="caption" style={{ color: "var(--accent)" }}>
          STEP 1 OF 2 — CREATE YOUR STRAVA APP
        </span>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: "var(--space-4) 0" }}>
          Paste these into Strava&apos;s API page.
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
          Strava&apos;s &quot;Single Player Mode&quot; lets every account create one
          API app for themselves. Use these values — copy them with the
          buttons.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <CopyRow label="App name" value={STRAVA_APP_NAME} />
        <CopyRow label="Website" value={STRAVA_APP_WEBSITE} />
        <CopyRow label="Authorization Callback Domain" value={STRAVA_APP_DOMAIN} />
        <CopyRow label="Category" value={STRAVA_APP_CATEGORY} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <button type="button" className="btn-orange" onClick={openStrava} style={{ alignSelf: "flex-start" }}>
          Open Strava Settings ↗
        </button>

        <StatusBar text="Strava is open in a popup. Create your app there, then come back here." />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
        <Checkbox
          label="I created the app on Strava"
          checked={createdChecked}
          onChange={setCreatedChecked}
        />
        <Checkbox
          label="I can see my Client ID and Client Secret"
          checked={credsChecked}
          onChange={setCredsChecked}
        />
      </div>

      {createdChecked && credsChecked ? (
        <button type="button" className="btn-orange" onClick={onContinue} style={{ alignSelf: "flex-start" }}>
          Done — Paste My Credentials →
        </button>
      ) : null}
    </div>
  );
}

// --- Path A: credentials --------------------------------------------------

function PathACreds({
  onBack,
  onError,
  onConnecting,
}: {
  onBack: () => void;
  onError: (msg: string) => void;
  onConnecting: () => void;
}) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
        onError(errorMessageFor(json.error) ?? "Couldn't validate those credentials.");
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
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <BackLink onClick={onBack} />

      <div>
        <span className="caption" style={{ color: "var(--accent)" }}>
          STEP 2 OF 2 — PASTE YOUR CREDENTIALS
        </span>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: "var(--space-4) 0" }}>
          Two values, then you&apos;re in.
        </h2>
      </div>

      <FieldInput
        label="Client ID"
        value={clientId}
        onChange={setClientId}
        placeholder="123456"
        autoComplete="off"
        inputMode="numeric"
      />
      <FieldInput
        label="Client Secret"
        value={clientSecret}
        onChange={setClientSecret}
        placeholder="40-character hex string"
        autoComplete="off"
        type="password"
      />

      <p
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 13,
          color: "var(--mid-gray)",
          lineHeight: 1.7,
          letterSpacing: 0.5,
        }}
      >
        Used once to authenticate. We don&apos;t store your secret. Strava&apos;s
        access tokens are valid for ~6 hours — we&apos;ll capture your data
        snapshot during that window.
      </p>

      <button
        type="submit"
        className="btn-orange"
        disabled={submitting}
        style={{ alignSelf: "flex-start", opacity: submitting ? 0.6 : 1 }}
      >
        {submitting ? "Connecting…" : "Connect My Strava →"}
      </button>
    </form>
  );
}

function PathAConnecting() {
  return (
    <CenteredLoad
      captionText="CONNECTING TO STRAVA"
      title="Hold on a sec…"
      subtext="Redirecting you to Strava with your credentials."
    />
  );
}

// --- Path B: instructions -------------------------------------------------

function PathBInstructions({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  const openStrava = useCallback(() => {
    window.open(STRAVA_ACCOUNT, "strava_account", "width=800,height=700");
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      <BackLink onClick={onBack} />

      <div>
        <span className="caption">STEP 1 OF 2 — REQUEST YOUR ARCHIVE</span>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: "var(--space-4) 0" }}>
          Ask Strava for your data.
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
          Strava emails the ZIP within 5–10 minutes. Once it arrives, come
          back and upload it.
        </p>
      </div>

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

      <button type="button" className="btn-primary" onClick={openStrava} style={{ alignSelf: "flex-start" }}>
        Open Strava Settings ↗
      </button>

      <StatusBar text="Waiting on Strava&apos;s email. When the ZIP arrives, hit the button below." />

      <button type="button" className="btn-orange" onClick={onContinue} style={{ alignSelf: "flex-start" }}>
        I Have My ZIP — Upload It →
      </button>
    </div>
  );
}

// --- Path B: upload -------------------------------------------------------

function PathBUpload({
  onBack,
  onError,
  onProcessing,
}: {
  onBack: () => void;
  onError: (msg: string) => void;
  onProcessing: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    onProcessing();
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
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      <BackLink onClick={onBack} />

      <div>
        <span className="caption">STEP 2 OF 2 — UPLOAD YOUR ARCHIVE</span>
        <h2 style={{ fontSize: "clamp(28px, 5vw, 40px)", margin: "var(--space-4) 0" }}>
          Drop the ZIP here.
        </h2>
      </div>

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
        <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 15, letterSpacing: 1 }}>
          {file ? `✓ ${file.name}` : "Drag your ZIP or CSV here"}
        </p>
        <p style={{ fontFamily: "var(--font-sans), sans-serif", fontSize: 14, color: "var(--mid-gray)" }}>
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

      <p
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 13,
          color: "var(--mid-gray)",
          lineHeight: 1.7,
          letterSpacing: 0.5,
        }}
      >
        Strava&apos;s CSV export doesn&apos;t include heart rate — HR zone
        analysis won&apos;t be available. Everything else (volume, gaps, races)
        works as normal.
      </p>

      <button
        type="submit"
        className="btn-orange"
        disabled={!file || submitting}
        style={{ alignSelf: "flex-start", opacity: !file || submitting ? 0.6 : 1 }}
      >
        {submitting ? "Uploading…" : "Upload + Analyze →"}
      </button>
    </form>
  );
}

function PathBProcessing() {
  return (
    <CenteredLoad
      captionText="PARSING YOUR ARCHIVE"
      title="Crunching your training…"
      subtext="Extracting activities and computing metrics."
    />
  );
}

// --- Shared bits ----------------------------------------------------------

function CopyRow({ label, value }: { label: string; value: string }) {
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
        border: "3px solid var(--ink)",
        padding: "var(--space-4) var(--space-5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--space-4)",
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 220 }}>
        <span className="caption" style={{ color: "var(--mid-gray)" }}>
          {label}
        </span>
        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            fontSize: 16,
            marginTop: 4,
            wordBreak: "break-all",
          }}
        >
          {value}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        style={copyButtonStyle(copied)}
        aria-label={`Copy ${label}`}
      >
        {copied ? "✓ COPIED" : "COPY"}
      </button>
    </div>
  );
}

function copyButtonStyle(copied: boolean): CSSProperties {
  return {
    minHeight: 44,
    minWidth: 96,
    padding: "12px 18px",
    fontFamily: "var(--font-mono), monospace",
    fontSize: 12,
    letterSpacing: 2,
    textTransform: "uppercase",
    background: copied ? "var(--confirm-green)" : "var(--ink)",
    color: "var(--newsprint)",
    border: `3px solid ${copied ? "var(--confirm-green)" : "var(--ink)"}`,
    cursor: "pointer",
  };
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        minHeight: 44,
        cursor: "pointer",
        fontFamily: "var(--font-sans), sans-serif",
        fontSize: 16,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ width: 22, height: 22, accentColor: "var(--accent)" }}
      />
      {label}
    </label>
  );
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
  inputMode?: "text" | "numeric" | "decimal" | "email" | "tel" | "url" | "search" | "none";
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

function StatusBar({ text }: { text: string }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "var(--space-4)",
        alignItems: "center",
        border: "3px solid var(--ink)",
        padding: "var(--space-4) var(--space-5)",
        background: "var(--newsprint)",
      }}
    >
      <LoadingBar />
      <p
        style={{
          fontFamily: "var(--font-mono), monospace",
          fontSize: 14,
          letterSpacing: 0.5,
          color: "var(--ink)",
        }}
      >
        {text}
      </p>
    </div>
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
      <h2 style={{ fontSize: "clamp(28px, 5vw, 44px)", margin: "var(--space-4) 0 var(--space-8)" }}>
        {title}
      </h2>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "var(--space-6)" }}>
        <LoadingBar />
      </div>
      <p style={{ fontFamily: "var(--font-mono), monospace", fontSize: 15, color: "var(--mid-gray)", letterSpacing: 1 }}>
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

