// Display-layer unit conversion. The internal data model is always metric
// (km, min/km); these helpers localize values for presentation based on the
// athlete's Strava measurement_preference. Conversion never touches stored data.
import { formatPace } from "@/lib/utils";

export type UnitSystem = "imperial" | "metric";

const KM_PER_MILE = 1.609344;

// Strava reports 'feet' for imperial athletes, 'meters' for metric. Anything
// else (including null) falls back to metric.
export function getUnitSystem(preference: string | null): UnitSystem {
  return preference === "feet" ? "imperial" : "metric";
}

// km → miles for imperial; identity for metric.
export function convertDistance(km: number, system: UnitSystem): number {
  return system === "imperial" ? km / KM_PER_MILE : km;
}

// min/km → min/mi for imperial (a mile takes longer, so the pace number grows);
// identity for metric.
export function convertPace(minPerKm: number, system: UnitSystem): number {
  return system === "imperial" ? minPerKm * KM_PER_MILE : minPerKm;
}

export function distanceUnit(system: UnitSystem): string {
  return system === "imperial" ? "mi" : "km";
}

export function paceUnit(system: UnitSystem): string {
  return system === "imperial" ? "/mi" : "/km";
}

// e.g. "32 mi" or "52 km". Rounds to the nearest whole unit.
export function formatDistanceWithUnit(km: number, system: UnitSystem): string {
  return `${Math.round(convertDistance(km, system))} ${distanceUnit(system)}`;
}

// Inverse of convertDistance — used when posting slider values that the user
// adjusted in display units back to the metric model.
export function displayToKm(value: number, system: UnitSystem): number {
  return system === "imperial" ? value * KM_PER_MILE : value;
}

// Rewrite "<n> km" distance tokens embedded in generated prose to display units.
export function convertDistancesInText(text: string, system: UnitSystem): string {
  if (system === "metric") return text;
  return text.replace(/(\d+(?:\.\d+)?)\s*km\b/g, (_match, n: string) =>
    `${Math.round(convertDistance(parseFloat(n), system))} mi`,
  );
}

// Rewrite "<m>:<ss>/km" pace tokens embedded in generated prose to display units.
export function convertPacesInText(text: string, system: UnitSystem): string {
  if (system === "metric") return text;
  return text.replace(/(\d+):(\d{2})\/km/g, (_match, m: string, s: string) => {
    const minPerKm = Number(m) + Number(s) / 60;
    return `${formatPace(convertPace(minPerKm, system))}/mi`;
  });
}

// Localize both paces and distances in free text. Pace runs first because it
// consumes the "/km" token, so the distance pass can't re-match it.
export function localizeText(text: string, system: UnitSystem): string {
  if (system === "metric") return text;
  return convertDistancesInText(convertPacesInText(text, system), system);
}
