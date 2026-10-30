import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { VitalsRow } from "../services/trends";

/** The last 7 days from /api/analytics, under the same key as the Trends screen's 7-day view, so they share one copy. */
export function useWeekTrends(userId: string | null | undefined) {
  return useQuery({
    queryKey: ["trends", userId, 7],
    enabled: !!userId,
    queryFn: async (): Promise<{ vitals?: VitalsRow[] }> => {
      const res = await apiFetch(`/api/analytics/${userId}?days=7`);
      if (!res.ok) throw new Error("Could not load trends");
      return res.json();
    },
  });
}
