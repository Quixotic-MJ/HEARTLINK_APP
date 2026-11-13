import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";

// The Profile screen's data: the patient's details, and their latest blood pressure and resting heart rate.
// Through React Query (saved on the phone), so the screen shows the last known details straight away, retries when
// the server is slow to wake (the free host sleeps), and refreshes when the tab is opened again. It used to load once,
// with no retry, and stay blank when that one request failed.

export interface ProfileDetails {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  birthdate: string;
  sex: string;
  heightCm: number | null;
  weightKg: number | null;
  /** The latest log that has a blood pressure (not just the latest check-in, which may not) */
  bp: { systolic: number; diastolic: number; loggedAt: string | null } | null;
  /** The latest log that has a pulse */
  restingHr: number | null;
}

interface ProfileRow {
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  date_of_birth?: string | null;
  sex?: string | null;
  height_cm?: number | string | null;
  weight_kg?: number | string | null;
}

interface HealthLog {
  systolic_bp?: number | null;
  diastolic_bp?: number | null;
  heart_rate_bpm?: number | null;
  logged_at?: string | null;
}

const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number.parseFloat(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** The details from a profile row (the server's, or the one saved at sign-in). */
export function detailsFromProfile(p: ProfileRow | null | undefined): Omit<ProfileDetails, "bp" | "restingHr"> {
  return {
    firstName: p?.first_name ?? "",
    lastName: p?.last_name ?? "",
    email: p?.email ?? "",
    phone: p?.phone ?? "",
    birthdate: p?.date_of_birth ?? "",
    sex: p?.sex ?? "",
    heightCm: num(p?.height_cm),
    weightKg: num(p?.weight_kg),
  };
}

/** The newest blood pressure and pulse among recent logs (newest first). */
export function latestVitals(logs: HealthLog[]): Pick<ProfileDetails, "bp" | "restingHr"> {
  const withBp = logs.find((l) => num(l.systolic_bp) && num(l.diastolic_bp));
  const withHr = logs.find((l) => num(l.heart_rate_bpm));
  return {
    bp: withBp ? { systolic: Number(withBp.systolic_bp), diastolic: Number(withBp.diastolic_bp), loggedAt: withBp.logged_at ?? null } : null,
    restingHr: withHr ? Number(withHr.heart_rate_bpm) : null,
  };
}

export function useProfileDetails() {
  const { userId, user } = useUser();
  return useQuery({
    queryKey: ["profileDetails", userId],
    enabled: !!userId,
    // The app's usual retries (lib/react-query.ts), spaced out, because the free server can take a while to wake up
    retryDelay: (attempt) => Math.min(3000 * 2 ** attempt, 15000),
    // The profile saved at sign-in fills the screen until the server answers
    placeholderData: user ? { ...detailsFromProfile(user as ProfileRow), bp: null, restingHr: null } : undefined,
    queryFn: async (): Promise<ProfileDetails> => {
      const [profileRes, logsRes] = await Promise.all([
        apiFetch(`/api/users/${userId}/profile`),
        apiFetch(`/api/health-logs/${userId}?page=1&page_size=20`).catch(() => null),
      ]);
      if (!profileRes.ok) throw new Error("Couldn't load your profile");
      const body = (await profileRes.json()) as { profile?: ProfileRow };
      let logs: HealthLog[] = [];
      if (logsRes?.ok) {
        const raw = (await logsRes.json()) as { data?: HealthLog[] } | HealthLog[];
        logs = Array.isArray(raw) ? raw : raw.data ?? [];
      }
      return { ...detailsFromProfile(body.profile), ...latestVitals(logs) };
    },
  });
}
