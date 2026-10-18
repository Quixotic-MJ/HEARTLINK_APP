import { useQuery } from "@tanstack/react-query";
import { useUser } from "../contexts/UserContext";
import { apiFetch } from "../lib/api";
import type { Readiness } from "../services/exerciseSession";

type DashboardExercise = Readiness & {
  today_activity?: { total_exercise_minutes?: number | null } | null;
  thresholds?: { active_minutes_goal?: number | null } | null;
};

/**
 * Score, recent severe symptoms and today's movement, from the dashboard data. Shares the
 * dashboard's cache key, so it is usually already loaded (and kept between app launches).
 */
export function useExerciseReadiness() {
  const { userId } = useUser();
  const query = useQuery<DashboardExercise>({
    queryKey: ["dashboard", userId],
    enabled: !!userId,
    queryFn: async () => {
      const res = await apiFetch("/api/dashboard/me");
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });
  const d = query.data;
  return {
    readiness: d,
    /** True only while there is no saved copy yet to decide from. */
    isLoading: query.isLoading,
    movementMinutes: d?.today_activity?.total_exercise_minutes ?? 0,
    movementGoal: d?.thresholds?.active_minutes_goal || 30,
    refetch: query.refetch,
  };
}
