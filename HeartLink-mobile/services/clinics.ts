import { Linking, Platform } from "react-native";

// HL-078 / HL-088: the Nearby Clinics directory (Cebu City, from OpenStreetMap, checked by the team).
// Only real fields: what the place is, whether it has an emergency room, where it is, and a phone number only once
// the team checked it. Nothing is guessed from a name (no "24/7", no "Open now").

export type ClinicKind = "er_hospital" | "hospital" | "clinic" | "health_center";

export interface Clinic {
  id: string;
  name: string;
  kind: ClinicKind;
  /** true / false, or null when the team hasn't checked yet */
  hasEr: boolean | null;
  address: string | null;
  latitude: number;
  longitude: number;
  /** Only a number the team checked; null hides the Call button */
  phone: string | null;
  distanceKm: number;
}

export interface Point {
  latitude: number;
  longitude: number;
}

/** Cebu City centre, used until the phone's location is known. */
export const CEBU_CITY: Point = { latitude: 10.3157, longitude: 123.8854 };

const KINDS: ClinicKind[] = ["er_hospital", "hospital", "clinic", "health_center"];

/** A coordinate, or NaN when missing (Number(null) would be 0, a point in the ocean). */
function coordinate(value: unknown): number {
  return value === null || value === undefined || value === "" ? NaN : Number(value);
}

export function distanceKm(a: Point, b: Point): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) * Math.cos((b.latitude * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function distanceLabel(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export function hasEmergencyRoom(c: Pick<Clinic, "kind" | "hasEr">): boolean {
  return c.hasEr === true;
}

/** The tag on a card, from real fields only. */
export function clinicLabel(c: Pick<Clinic, "kind" | "hasEr">): string {
  if (hasEmergencyRoom(c)) return "Emergency room";
  switch (c.kind) {
    case "er_hospital":
    case "hospital":
      return "Hospital";
    case "health_center":
      return "Health centre";
    default:
      return "Clinic";
  }
}

/** Server rows → cards: emergency rooms first, each group nearest first. Bad rows are dropped. */
export function toClinics(data: unknown, from: Point): Clinic[] {
  if (!Array.isArray(data)) return [];
  const clinics: Clinic[] = [];
  for (const row of data as Record<string, unknown>[]) {
    const latitude = coordinate(row?.latitude);
    const longitude = coordinate(row?.longitude);
    const kind = row?.kind as ClinicKind;
    if (!row?.name || !KINDS.includes(kind) || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    clinics.push({
      id: String(row.id ?? row.name),
      name: String(row.name),
      kind,
      hasEr: row.has_er === true ? true : row.has_er === false ? false : null,
      address: typeof row.address === "string" && row.address ? row.address : null,
      latitude,
      longitude,
      phone: typeof row.phone === "string" && row.phone.trim() ? row.phone.trim() : null,
      distanceKm: distanceKm(from, { latitude, longitude }),
    });
  }
  return clinics.sort((a, b) => Number(hasEmergencyRoom(b)) - Number(hasEmergencyRoom(a)) || a.distanceKm - b.distanceKm);
}

export function matchesSearch(c: Clinic, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [c.name, c.address ?? "", clinicLabel(c)].some((text) => text.toLowerCase().includes(q));
}

/** Opens the phone's maps app (Google Maps on Android, Apple Maps on iPhone), or Google Maps in the browser. */
export function openDirections(c: Point): void {
  const destination = `${c.latitude},${c.longitude}`;
  const url = Platform.select({
    ios: `http://maps.apple.com/?daddr=${destination}&dirflg=d`,
    default: `google.navigation:q=${destination}`,
  });
  Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destination}`));
}

export function callClinic(c: Pick<Clinic, "phone">): void {
  if (c.phone) Linking.openURL(`tel:${c.phone.replace(/\s+/g, "")}`).catch(() => {});
}
