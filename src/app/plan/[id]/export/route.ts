import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase";
import { formatTime } from "@/lib/metrics";
import { formatDateRange, formatShortDate } from "@/lib/utils";
import type { DailyPlan, PlanMetadata, WeeklyPlan } from "@/lib/plan-builder";

export const dynamic = "force-dynamic";

type ExportPlan = {
  id: string;
  race_name: string | null;
  race_distance: string;
  race_date: string;
  terrain: string | null;
  goal_type: string;
  previous_time_seconds: number | null;
  target_time_seconds: number | null;
  peak_volume_km: number;
  weekly_plan: WeeklyPlan;
  daily_plan: DailyPlan;
  plan_metadata: PlanMetadata;
};

const DISTANCE_LABELS: Record<string, string> = {
  "50K": "50K",
  "50Mi": "50 Mile",
  "100K": "100K",
  "100Mi": "100 Mile",
  "200Mi": "200 Mile+",
};

const GOAL_LABELS: Record<string, string> = {
  finish: "Just finish",
  beat_time: "Beat my last time",
  compete: "Compete for placement",
};

const TERRAIN_LABELS: Record<string, string> = {
  road: "Road / Flat",
  trail: "Trail / Rolling",
  mountain: "Mountain / Technical",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const userId = await getSession();
  if (!userId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const { id } = await params;
  const { data: plan } = await supabaseAdmin
    .from("plans")
    .select(
      "id, race_name, race_distance, race_date, terrain, goal_type, previous_time_seconds, target_time_seconds, peak_volume_km, weekly_plan, daily_plan, plan_metadata",
    )
    .eq("id", id)
    .eq("user_id", userId)
    .single<ExportPlan>();

  if (!plan || !plan.weekly_plan || !plan.daily_plan) {
    return new NextResponse("Plan not found", { status: 404 });
  }

  const format = request.nextUrl.searchParams.get("format");

  if (format === "ics") {
    const ics = buildIcs(plan);
    return new NextResponse(ics, {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'attachment; filename="chronic-cardio-plan.ics"',
      },
    });
  }

  // Default: print-optimised branded HTML (browser "Save as PDF").
  return new NextResponse(buildPrintHtml(plan), {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// --- iCal -----------------------------------------------------------------

function escapeIcs(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Fold property lines to <=75 octets per RFC 5545 (continuation lines start
// with a single space).
function foldIcs(line: string): string {
  if (line.length <= 73) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 73));
  rest = rest.slice(73);
  while (rest.length > 0) {
    chunks.push(" " + rest.slice(0, 72));
    rest = rest.slice(72);
  }
  return chunks.join("\r\n");
}

function toIcsDate(iso: string, offsetDays = 0): string {
  const d = new Date(iso);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function buildIcs(plan: ExportPlan): string {
  const stamp =
    new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Chronic Cardio//Training Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const week of plan.daily_plan.weeks) {
    for (const day of week.days) {
      if (day.type === "rest") continue;

      const parts = [day.description];
      if (day.distance_km > 0) parts.push(`${day.distance_km} km`);
      if (day.intensity) parts.push(day.intensity);
      const summary = parts.filter(Boolean).join(" · ");

      const descPieces = [
        day.workout_details ? `Workout: ${day.workout_details}` : "",
        day.strength ? `Strength: ${day.strength}` : "",
        day.notes ?? "",
      ].filter(Boolean);

      lines.push("BEGIN:VEVENT");
      lines.push(foldIcs(`UID:${plan.id}-w${week.week}-${day.date}@train.chroniccardio.com`));
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${toIcsDate(day.date)}`);
      lines.push(`DTEND;VALUE=DATE:${toIcsDate(day.date, 1)}`);
      lines.push(foldIcs(`SUMMARY:${escapeIcs(`[CC] ${summary}`)}`));
      if (descPieces.length > 0) {
        lines.push(foldIcs(`DESCRIPTION:${escapeIcs(descPieces.join("\n"))}`));
      }
      lines.push("END:VEVENT");
    }
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// --- Print HTML -----------------------------------------------------------

function esc(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMinutes(min: number): string {
  if (!min || min <= 0) return "";
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  return `${m}m`;
}

function buildPrintHtml(plan: ExportPlan): string {
  const distanceLabel = DISTANCE_LABELS[plan.race_distance] ?? plan.race_distance;
  const summary = plan.weekly_plan.plan_summary;
  const keyChange = plan.plan_metadata?.key_change ?? summary.key_change;
  const title = plan.race_name || `${distanceLabel} Plan`;

  const dailyByWeek = new Map<number, DailyPlan["weeks"][number]>();
  for (const dw of plan.daily_plan.weeks) dailyByWeek.set(dw.week, dw);

  const metaLine = [
    distanceLabel,
    esc(plan.race_date),
    plan.terrain ? TERRAIN_LABELS[plan.terrain] ?? plan.terrain : "",
    GOAL_LABELS[plan.goal_type] ?? plan.goal_type,
    plan.previous_time_seconds ? `PR ${formatTime(plan.previous_time_seconds)}` : "",
    plan.target_time_seconds ? `Target ${formatTime(plan.target_time_seconds)}` : "",
  ]
    .filter(Boolean)
    .map(esc)
    .join(" &middot; ");

  const phases = summary.phases
    .map(
      (p) =>
        `<span class="phase">${esc(p.name)} &middot; WK ${esc(p.weeks)}<br><em>${esc(p.focus)}</em></span>`,
    )
    .join("");

  const weeksHtml = plan.weekly_plan.weeks
    .map((w) => {
      const days = dailyByWeek.get(w.week)?.days ?? [];
      const rows = days
        .map((d) => {
          if (d.type === "rest") {
            return `<tr class="rest"><td>${esc(d.day)}</td><td>${esc(formatShortDate(d.date))}</td><td colspan="3"><strong>REST</strong> ${esc(d.notes ?? d.description ?? "")}</td></tr>`;
          }
          const detail = [
            d.description ? `<strong>${esc(d.description)}</strong>` : "",
            d.workout_details ? `<div class="workout">${esc(d.workout_details)}</div>` : "",
            d.strength ? `<div class="sub">Strength: ${esc(d.strength)}</div>` : "",
            d.notes ? `<div class="sub note">${esc(d.notes)}</div>` : "",
          ]
            .filter(Boolean)
            .join("");
          const dist = [
            d.distance_km > 0 ? `${esc(d.distance_km)} km` : "",
            d.time_minutes > 0 ? formatMinutes(d.time_minutes) : "",
          ]
            .filter(Boolean)
            .join("<br>");
          return `<tr><td>${esc(d.day)}</td><td>${esc(formatShortDate(d.date))}</td><td><span class="chip chip-${esc(d.type)}">${esc(d.type)}</span></td><td>${dist}</td><td>${detail}${d.intensity ? `<div class="sub">${esc(d.intensity)}</div>` : ""}</td></tr>`;
        })
        .join("");

      const weekMeta = [
        `${esc(w.total_volume_km)} km`,
        `Long ${esc(w.long_run_km)} km`,
        w.b2b_km ? `B2B ${esc(w.b2b_km)} km` : "",
        w.quality_summary ? `Quality: ${esc(w.quality_summary)}` : "",
        `Strength ${esc(w.strength_sessions)}×`,
        w.is_cutback ? "CUTBACK" : "",
      ]
        .filter(Boolean)
        .join(" &middot; ");

      return `
        <section class="week ${w.is_cutback ? "cutback" : ""}">
          <div class="week-head">
            <h2>WK ${esc(w.week)} <span class="phase-tag">${esc(w.phase)}</span> <span class="dates">${esc(formatDateRange(w.date_start))}</span></h2>
            <div class="week-meta">${weekMeta}</div>
            ${w.notes ? `<div class="week-notes">${esc(w.notes)}</div>` : ""}
          </div>
          <table>
            <thead><tr><th>Day</th><th>Date</th><th>Type</th><th>Dist</th><th>Session</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
    })
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Chronic Cardio</title>
<style>
@import url("https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap");
:root{--ink:#1a1a1a;--newsprint:#f5f5f0;--accent:#ef6c00;--mid-gray:#666;--light-gray:#e8e8e3;}
*{box-sizing:border-box;}
body{margin:0;padding:40px;background:var(--newsprint);color:var(--ink);font-family:"DM Sans",sans-serif;line-height:1.5;max-width:900px;margin:0 auto;}
h1,h2{font-family:"Space Mono",monospace;font-weight:700;text-transform:uppercase;margin:0;}
.caption{font-family:"Courier Prime",monospace;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:var(--mid-gray);}
.accent{color:var(--accent);}
h1{font-size:34px;margin:8px 0;}
.meta{font-family:"Courier Prime",monospace;font-size:13px;letter-spacing:1px;color:var(--mid-gray);margin-bottom:24px;}
.black-box{background:var(--ink);color:var(--newsprint);padding:24px;margin:24px 0;}
.black-box .caption{color:var(--accent);}
.black-box p{font-size:18px;margin:8px 0 0;}
.phases{display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 32px;}
.phase{border:3px solid var(--ink);padding:8px 12px;font-family:"Courier Prime",monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;}
.phase em{font-size:10px;color:var(--mid-gray);font-style:normal;}
.week{border:3px solid var(--ink);margin-bottom:20px;page-break-inside:avoid;}
.week.cutback{outline:3px solid var(--accent);outline-offset:-9px;}
.week-head{padding:16px 20px;border-bottom:3px solid var(--ink);}
.week-head h2{font-size:20px;}
.phase-tag{font-family:"Courier Prime",monospace;font-size:11px;letter-spacing:2px;color:var(--accent);}
.dates{font-family:"Courier Prime",monospace;font-size:11px;letter-spacing:1px;color:var(--mid-gray);}
.week-meta{font-family:"Courier Prime",monospace;font-size:12px;letter-spacing:1px;margin-top:8px;}
.week-notes{font-size:14px;color:var(--mid-gray);font-style:italic;margin-top:8px;}
table{border-collapse:collapse;width:100%;}
th{background:var(--ink);color:var(--newsprint);font-family:"Courier Prime",monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;padding:8px 12px;text-align:left;}
td{padding:10px 12px;border-bottom:1px solid var(--light-gray);font-size:14px;vertical-align:top;}
tr.rest td{color:var(--mid-gray);}
.chip{font-family:"Courier Prime",monospace;font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:2px 6px;border:2px solid var(--ink);}
.chip-quality,.chip-b2b{border-color:var(--accent);color:var(--accent);}
.chip-long{background:var(--ink);color:var(--newsprint);}
.workout{font-family:"Courier Prime",monospace;font-size:12px;background:var(--light-gray);padding:6px 8px;margin-top:4px;}
.sub{font-size:13px;color:var(--mid-gray);margin-top:3px;}
.sub.note{font-style:italic;}
footer{margin-top:40px;font-family:"Courier Prime",monospace;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:var(--mid-gray);border-top:3px solid var(--ink);padding-top:16px;}
@media print{body{padding:0;}.no-print{display:none;}}
</style>
</head>
<body>
<p class="caption">Chronic Card<span class="accent">i</span>o · Training Plan</p>
<h1>${esc(title)}</h1>
<div class="meta">${metaLine}</div>
${keyChange ? `<div class="black-box"><span class="caption">The #1 thing to change</span><p>${esc(keyChange)}</p></div>` : ""}
<span class="caption">${esc(summary.total_weeks)}-Week Periodization</span>
<div class="phases">${phases}</div>
${weeksHtml}
<footer>Powered by Strava · train.chroniccardio.com</footer>
<script>window.onload=function(){setTimeout(function(){window.print();},300);};</script>
</body>
</html>`;
}
