import { Linking } from "react-native";
import { Point, distanceKm } from "./clinics";

// HL-171 (panel revision): the nearest barangay's emergency contacts. The app downloads the list (/api/barangays) and
// picks the nearest barangay here on the phone, so the user's location is never sent to HeartLink. A phone number is
// only in the list once an admin has called it and marked it checked.

export interface Barangay {
  id: string;
  name: string;
  city: string | null;
  hallAddress: string | null;
  latitude: number;
  longitude: number;
  /** "hall" = the barangay hall; "centre" = the middle of the barangay (approximate) */
  locationKind: "hall" | "centre" | null;
  /** Checked numbers only; empty when none has been checked yet */
  phones: string[];
}

/** Further than this from every barangay on the list, the user is outside the area HeartLink covers. */
export const MAX_KM = 5;

const coordinate = (v: unknown) => (v === null || v === undefined || v === "" ? NaN : Number(v));

export function toBarangays(data: unknown): Barangay[] {
  if (!Array.isArray(data)) return [];
  const out: Barangay[] = [];
  for (const row of data as Record<string, unknown>[]) {
    const latitude = coordinate(row?.latitude);
    const longitude = coordinate(row?.longitude);
    if (!row?.name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;
    out.push({
      id: String(row.id ?? row.name),
      name: String(row.name),
      city: typeof row.city === "string" && row.city ? row.city : null,
      hallAddress: typeof row.hall_address === "string" && row.hall_address ? row.hall_address : null,
      latitude,
      longitude,
      locationKind: row.location_kind === "hall" || row.location_kind === "centre" ? row.location_kind : null,
      phones: Array.isArray(row.phones) ? row.phones.filter((p): p is string => typeof p === "string" && !!p.trim()) : [],
    });
  }
  return out;
}

/** The nearest barangay and how far it is, or null when every one is further than maxKm. */
export function nearestBarangay(
  list: Barangay[],
  you: Point,
  maxKm = MAX_KM
): { barangay: Barangay; km: number } | null {
  let best: { barangay: Barangay; km: number } | null = null;
  for (const b of list) {
    const km = distanceKm(you, b);
    if (!best || km < best.km) best = { barangay: b, km };
  }
  return best && best.km <= maxKm ? best : null;
}

/** "Barangay Lahug" (names on the list don't always say "Barangay"). */
export function barangayTitle(b: Pick<Barangay, "name">): string {
  return /^(barangay|brgy\.?)\s/i.test(b.name) ? b.name : `Barangay ${b.name}`;
}

/** "Hall about 0.8 km away", or "About 3.2 km away (approximate)" when only the barangay's middle is known. */
export function distanceLine(b: Pick<Barangay, "locationKind">, km: number): string {
  const d = km < 1 ? `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m` : `${km.toFixed(1)} km`;
  return b.locationKind === "hall" ? `Hall about ${d} away` : `About ${d} away (approximate)`;
}

export function callNumber(phone: string): void {
  Linking.openURL(`tel:${phone.replace(/[^\d+]/g, "")}`).catch(() => {});
}
