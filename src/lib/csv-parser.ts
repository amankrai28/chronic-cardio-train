import "server-only";
import Papa from "papaparse";
import type { StravaActivity } from "@/lib/strava";

// Map a Strava archive `activities.csv` into the same shape we use for the
// Strava API. The CSV export does NOT include heart rate or suffer_score —
// those fields are nulled out and the dashboard degrades gracefully.

const RELEVANT_TYPES = new Set([
  "Run",
  "TrailRun",
  "Trail Run",
  "VirtualRun",
  "Virtual Run",
  "Walk",
  "Hike",
]);

const TYPE_NORMALIZE: Record<string, string> = {
  "Trail Run": "TrailRun",
  "Virtual Run": "VirtualRun",
};

function parseDuration(raw: string | undefined | null): number {
  if (raw == null) return 0;
  const v = String(raw).trim();
  if (!v) return 0;
  // Integer seconds (Strava CSV's modern format).
  const asInt = Number(v);
  if (Number.isFinite(asInt) && !v.includes(":")) return Math.round(asInt);
  // HH:MM:SS or MM:SS fallback.
  const parts = v.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function parseNumber(raw: string | undefined | null): number | null {
  if (raw == null) return null;
  const v = String(raw).trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function parseStartDate(raw: string | undefined | null): string {
  if (!raw) return new Date(0).toISOString();
  // Strava CSV date is typically already ISO-ish ("2024-03-27 06:15:21" or
  // "Mar 27, 2024, 6:15:21 AM"). Date() handles both reasonably.
  const d = new Date(String(raw).trim());
  if (Number.isNaN(d.getTime())) return new Date(0).toISOString();
  return d.toISOString();
}

function syntheticId(row: Record<string, string>): number {
  // When the CSV omits Activity ID, fold name+date into a stable negative
  // integer so multiple imports for the same user are idempotent.
  const key = `${row["Activity Name"] ?? ""}|${row["Activity Date"] ?? ""}|${row["Distance"] ?? ""}`;
  let h = 0;
  for (let i = 0; i < key.length; i++) {
    h = (h * 31 + key.charCodeAt(i)) | 0;
  }
  // Negative + small enough to fit safely in a JS number / bigint column.
  return -Math.abs(h) - 1;
}

export type ParseResult = {
  activities: StravaActivity[];
  skipped: number;
};

export function parseStravaCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const activities: StravaActivity[] = [];
  let skipped = 0;
  const seenIds = new Set<number>();

  for (const row of parsed.data) {
    const rawType = (row["Activity Type"] ?? "").trim();
    if (!RELEVANT_TYPES.has(rawType)) {
      skipped++;
      continue;
    }
    const type = TYPE_NORMALIZE[rawType] ?? rawType;

    const rawId = (row["Activity ID"] ?? "").trim();
    const idNum = rawId ? Number(rawId) : NaN;
    let id = Number.isFinite(idNum) && idNum > 0 ? idNum : syntheticId(row);
    while (seenIds.has(id)) id -= 1;
    seenIds.add(id);

    // Strava CSV distance is in km (decimal). Convert to meters.
    const distanceKm = parseNumber(row["Distance"]) ?? 0;

    activities.push({
      id,
      name: (row["Activity Name"] ?? null) || null,
      type,
      start_date: parseStartDate(row["Activity Date"]),
      distance: Math.round(distanceKm * 1000),
      moving_time: parseDuration(row["Moving Time"]),
      elapsed_time: parseDuration(row["Elapsed Time"]),
      total_elevation_gain: parseNumber(row["Elevation Gain"]),
      average_heartrate: null,
      max_heartrate: null,
      suffer_score: null,
    });
  }

  return { activities, skipped };
}
