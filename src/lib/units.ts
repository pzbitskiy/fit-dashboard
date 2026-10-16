export type DistanceUnit = "km" | "mi" | "nmi";

export const METERS_PER_KILOMETER = 1000;
export const METERS_PER_MILE = 1609.344;
export const METERS_PER_NAUTICAL_MILE = 1852;
export const FEET_PER_METER = 3.280839895;

export function distanceDivisor(unit: DistanceUnit): number {
  if (unit === "nmi") return METERS_PER_NAUTICAL_MILE;
  return unit === "mi" ? METERS_PER_MILE : METERS_PER_KILOMETER;
}

export function distanceLabel(unit: DistanceUnit): string {
  return unit;
}

export function speedLabel(unit: DistanceUnit): string {
  if (unit === "nmi") return "kn";
  return unit === "mi" ? "mi/h" : "km/h";
}

export function paceLabel(unit: DistanceUnit): string {
  return `min/${distanceLabel(unit)}`;
}

export function elevationLabel(unit: DistanceUnit): string {
  return unit === "mi" ? "ft" : "m";
}

export function convertDistanceMeters(valueMeters: number, unit: DistanceUnit): number {
  return valueMeters / distanceDivisor(unit);
}

export function convertSpeedMps(valueMps: number, unit: DistanceUnit): number {
  return valueMps * 3600 / distanceDivisor(unit);
}

export function convertSpeedKmh(valueKmh: number, unit: DistanceUnit): number {
  return valueKmh * METERS_PER_KILOMETER / distanceDivisor(unit);
}

export function convertElevationMeters(valueMeters: number, unit: DistanceUnit): number {
  return unit === "mi" ? valueMeters * FEET_PER_METER : valueMeters;
}

export function convertPaceMinPerKm(valueMinPerKm: number, unit: DistanceUnit): number {
  return valueMinPerKm * distanceDivisor(unit) / METERS_PER_KILOMETER;
}
