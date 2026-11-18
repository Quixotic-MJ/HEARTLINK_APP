import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { SavedSleep } from "../services/sleepOverlap";

/** The patient's saved sleep logs, for the overlap check before a new one is saved (2026-11-19). Empty if they can't
 * be loaded: the server checks again anyway. */
export function useSleepLogs(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["sleepLogs", userId],
    enabled: !!userId,
    queryFn: async (): Promise<SavedSleep[]> => {
      const res = await apiFetch(`/api/sleep-logs/${userId}`);
      if (!res.ok) return [];
      const logs = await res.json();
      return Array.isArray(logs) ? logs : [];
    },
  });
}
