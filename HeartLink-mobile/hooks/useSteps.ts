import { useCallback, useEffect, useState } from "react";
import { AppState } from "react-native";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";
import {
  type HealthConnectState,
  giveBackStepAccess,
  hasStepAccess,
  healthConnectState,
  isStepTrackingAvailable,
  isStepTrackingOn,
  readStepWeek,
  requestStepAccess,
  setStepTrackingOn,
  useStepTrackingSetting,
} from "../services/stepTracker";

// HL-163: the week of steps the server has (the Steps card and screen), sending the phone's steps to it, and turning
// step tracking on and off.

export type StepDay = { day: string; steps: number; brisk_minutes: number; synced: boolean };
export type StepWeek = { days: StepDay[]; goal: number; last_synced_at: string | null };

const SYNC_EVERY_MS = 15 * 60 * 1000;
const lastSync = new Map<string, number>();

export const stepWeekKey = (userId: string | null) => ["steps", "week", userId];

function refresh(queryClient: QueryClient, userId: string) {
  queryClient.invalidateQueries({ queryKey: stepWeekKey(userId) });
  queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
}

export type SyncResult = "synced" | "skipped" | "no_access" | "failed";

/** Reads the last 7 days from Health Connect and sends them. At most every 15 minutes unless `force`. */
export async function syncSteps(userId: string, force = false): Promise<SyncResult> {
  if (!isStepTrackingAvailable() || !(await isStepTrackingOn(userId))) return "skipped";
  if (!force && Date.now() - (lastSync.get(userId) ?? 0) < SYNC_EVERY_MS) return "skipped";
  try {
    if (!(await hasStepAccess())) return "no_access";
    const days = await readStepWeek();
    if (!days.length) return "skipped";
    const res = await apiFetch("/api/steps/days", { method: "PUT", body: JSON.stringify({ days }) });
    if (!res.ok) return "failed";
    lastSync.set(userId, Date.now());
    return "synced";
  } catch {
    // Offline or Health Connect busy: the next sync sends the whole week again
    return "failed";
  }
}

/** Keeps the server up to date while the screen using it is open: now, and whenever the app comes back. */
export function useStepSync(): void {
  const { userId } = useUser();
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!userId || !isStepTrackingAvailable()) return;
    const run = () => {
      syncSteps(userId).then((r) => {
        if (r === "synced") refresh(queryClient, userId);
      });
    };
    run();
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") run();
    });
    return () => sub.remove();
  }, [userId, queryClient]);
}

export function useStepWeek(enabled: boolean) {
  const { userId } = useUser();
  return useQuery({
    queryKey: stepWeekKey(userId),
    enabled: !!userId && enabled,
    queryFn: async (): Promise<StepWeek> => {
      const res = await apiFetch("/api/steps/week");
      if (!res.ok) throw new Error("Couldn't load your steps");
      return res.json();
    },
  });
}

export type TurnOnResult = "on" | "needs_install" | "needs_update" | "denied" | "unavailable";

/** Everything the Steps screen and card need: whether tracking can work here, whether it's on, and the switches. */
export function useStepTracking() {
  const { userId } = useUser();
  const queryClient = useQueryClient();
  const available = isStepTrackingAvailable();
  const { on, inviteHidden } = useStepTrackingSetting(userId);
  const [state, setState] = useState<HealthConnectState | null>(available ? null : "unavailable");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!available) return;
    let alive = true;
    healthConnectState().then((s) => alive && setState(s));
    return () => {
      alive = false;
    };
  }, [available]);

  const turnOn = useCallback(async (): Promise<TurnOnResult> => {
    if (!userId || !available) return "unavailable";
    setBusy(true);
    try {
      const current = await healthConnectState();
      setState(current);
      if (current !== "ready") return current === "unavailable" ? "unavailable" : current;
      if (!(await requestStepAccess())) return "denied";
      await setStepTrackingOn(userId, true);
      await syncSteps(userId, true);
      refresh(queryClient, userId);
      return "on";
    } finally {
      setBusy(false);
    }
  }, [userId, available, queryClient]);

  /** Stops reading and deletes the steps already sent. Throws if the server couldn't delete them. */
  const turnOff = useCallback(async (): Promise<void> => {
    if (!userId) return;
    setBusy(true);
    try {
      const res = await apiFetch("/api/steps", { method: "DELETE" });
      if (!res.ok) throw new Error("Your steps couldn't be deleted. Check your connection, then try again.");
      await setStepTrackingOn(userId, false);
      await giveBackStepAccess();
      lastSync.delete(userId);
      queryClient.removeQueries({ queryKey: stepWeekKey(userId) });
      queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });
    } finally {
      setBusy(false);
    }
  }, [userId, queryClient]);

  const syncNow = useCallback(async (): Promise<SyncResult> => {
    if (!userId) return "skipped";
    setBusy(true);
    try {
      const r = await syncSteps(userId, true);
      if (r === "synced") refresh(queryClient, userId);
      return r;
    } finally {
      setBusy(false);
    }
  }, [userId, queryClient]);

  return { available, state, on, inviteHidden, busy, turnOn, turnOff, syncNow };
}
