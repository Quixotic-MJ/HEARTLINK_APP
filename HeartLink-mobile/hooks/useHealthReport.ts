import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";
import { HealthReport, ReportDays } from "../services/healthReport";

// HL-085: the doctor-ready health report (Premium). A free account gets `premiumRequired` instead of an error.

export class PremiumRequiredError extends Error {}

export function useHealthReport(days: ReportDays, enabled = true) {
  const { userId } = useUser();
  return useQuery({
    queryKey: ["healthReport", userId, days],
    enabled: enabled && !!userId,
    staleTime: 5 * 60 * 1000,
    retry: (count, error) => !(error instanceof PremiumRequiredError) && count < 2,
    queryFn: async (): Promise<HealthReport> => {
      const res = await apiFetch(`/api/reports/${userId}?days=${days}`);
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        if (body?.detail?.code === "premium_required") throw new PremiumRequiredError("premium_required");
      }
      if (!res.ok) throw new Error("Couldn't load the report");
      return res.json();
    },
  });
}
