// Display formatters for derived metrics. Time formatting for durations lives
// in lib/metrics.ts (formatTime) — reuse that for second-based values.

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// Decimal minutes per km (e.g. 6.08) → "6:05".
export function formatPace(minPerKm: number): string {
  if (!minPerKm || minPerKm <= 0) return "—";
  const totalSeconds = Math.round(minPerKm * 60);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ISO date string → "Jun 2025".
export function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// "Running since" year from years-of-running span.
export function formatStartYear(yearsRunning: number): number {
  return new Date().getFullYear() - Math.floor(yearsRunning || 0);
}
