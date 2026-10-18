import { useQuery } from "@tanstack/react-query";
import { useUser } from "../contexts/UserContext";
import { getToken } from "../lib/secureTokenStore";
import { apiFetch } from "../lib/api";
import { DEFAULT_SODIUM_LIMIT_MG } from "../services/foodLogging";type DashboardSodium = {
  nutrition_budget?: { sodium?: { consumed_mg?: number | null; limit_mg?: number | null } };
  today_activity?: { total_sodium_mg?: number | null };
};

/**
 * Today's sodium and the patient's own daily limit (set in Goals & thresholds), from the
 * dashboard data. Shares the dashboard's cache key, so it's usually already loaded.
 * Falls back to 2,000 mg when the patient hasn't set a limit.
 */
export function useSodiumBudget() {
  const { userId, token } = useUser();
  const query = useQuery<DashboardSodium>({
    queryKey: ["dashboard", userId],
    enabled: !!userId,
    queryFn: async () => {
      const effectiveToken = token || (await getToken()) || "";
      const res = await apiFetch(`/api/dashboard/me`, {
        headers: { Authorization: `Bearer ${effectiveToken}` },
      });
      if (!res.ok) throw new Error("Failed to fetch dashboard");
      return res.json();
    },
  });
  const sodium = query.data?.nutrition_budget?.sodium;
  return {
    consumedMg: sodium?.consumed_mg ?? query.data?.today_activity?.total_sodium_mg ?? 0,
    limitMg: sodium?.limit_mg && sodium.limit_mg > 0 ? sodium.limit_mg : DEFAULT_SODIUM_LIMIT_MG,
    isLoading: query.isLoading,
  };
}
