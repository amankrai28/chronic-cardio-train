import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { parseStravaCsv } from "@/lib/csv-parser";
import { supabaseAdmin } from "@/lib/supabase";
import { computeAllMetrics } from "@/lib/metrics";
import { setSession } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const UPSERT_CHUNK = 500;
const MAX_BYTES = 100 * 1024 * 1024; // 100 MB cap on uploaded archive

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }

  const firstname = trimOrNull(form.get("firstname"));
  const city = trimOrNull(form.get("city"));

  const name = file.name.toLowerCase();
  let csvText: string;
  try {
    if (name.endsWith(".zip")) {
      const buf = Buffer.from(await file.arrayBuffer());
      const zip = await JSZip.loadAsync(buf);
      const csvEntry = findActivitiesCsv(zip);
      if (!csvEntry) {
        return NextResponse.json(
          { error: "no_activities_csv" },
          { status: 400 },
        );
      }
      csvText = await csvEntry.async("string");
    } else if (name.endsWith(".csv")) {
      csvText = await file.text();
    } else {
      return NextResponse.json({ error: "unsupported_file_type" }, { status: 400 });
    }
  } catch (err) {
    console.error("CSV extraction failed:", err);
    return NextResponse.json({ error: "extract_failed" }, { status: 400 });
  }

  const { activities, skipped } = parseStravaCsv(csvText);
  if (activities.length === 0) {
    return NextResponse.json(
      { error: "no_runs_found", skipped },
      { status: 400 },
    );
  }

  const nowIso = new Date().toISOString();
  const { data: createdUser, error: userError } = await supabaseAdmin
    .from("users")
    .insert({
      auth_method: "csv",
      firstname: firstname ?? "Athlete",
      city,
      updated_at: nowIso,
    })
    .select("id")
    .single();

  if (userError || !createdUser) {
    console.error("CSV user insert failed:", userError);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  const userId = createdUser.id as string;
  const rows = activities.map((a) => ({
    id: a.id,
    user_id: userId,
    type: a.type,
    name: a.name,
    start_date: a.start_date,
    distance: a.distance,
    moving_time: a.moving_time,
    elapsed_time: a.elapsed_time,
    total_elevation_gain: a.total_elevation_gain,
    average_heartrate: a.average_heartrate,
    max_heartrate: a.max_heartrate,
    suffer_score: a.suffer_score,
    fetched_at: nowIso,
  }));

  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabaseAdmin
      .from("activities")
      .upsert(chunk, { onConflict: "id" });
    if (error) {
      console.error("CSV activity upsert failed:", error);
      return NextResponse.json({ error: "db_error" }, { status: 500 });
    }
  }

  const metrics = computeAllMetrics(activities, { id: userId });
  const { error: metricsError } = await supabaseAdmin
    .from("athlete_metrics")
    .upsert(metrics, { onConflict: "user_id" });
  if (metricsError) {
    console.error("CSV metrics upsert failed:", metricsError);
    return NextResponse.json({ error: "db_error" }, { status: 500 });
  }

  await setSession(userId);

  return NextResponse.json({
    user_id: userId,
    activities_synced: activities.length,
    skipped,
    metrics_computed: true,
  });
}

function trimOrNull(v: FormDataEntryValue | null): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t : null;
}

function findActivitiesCsv(zip: JSZip): JSZip.JSZipObject | null {
  // Strava archives put it at the root as `activities.csv`, but match
  // any path ending in /activities.csv just in case.
  for (const path of Object.keys(zip.files)) {
    const lower = path.toLowerCase();
    if (lower === "activities.csv" || lower.endsWith("/activities.csv")) {
      const entry = zip.files[path];
      if (!entry.dir) return entry;
    }
  }
  return null;
}
