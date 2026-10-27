import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";
import { LongTermDays, LongTermTrends } from "../services/longTermTrends";
import { PremiumRequiredError } from "./useHealthReport";

// HL-086: 90-day and 1-year Trends (Premium). A free account gets PremiumRequiredError instead of an error.

export function useLongTermTrends(days: LongTermDays, enabled = true) {
  const { userId } = useUser();
  return useQuery({
    queryKey: ["longTermTrends", userId, days],
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => !(error instanceof PremiumRequiredError) && count < 2,
    queryFn: async (): Promise<LongTermTrends> => {
      const res = await apiFetch(`/api/analytics/${userId}/long-term?days=${days}`);
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        if (body?.detail?.code === "premium_required") throw new PremiumRequiredError("premium_required");
      }
      if (!res.ok) throw new Error("Couldn't load your trends");
      return res.json();
    },
  });
}
