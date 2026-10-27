import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";
import { PaymentMethod, PremiumPeriod, PremiumStatus } from "../services/premium";

// HL-084: the patient's Premium status, the free trial and the demo checkout (test mode, nothing is charged).

async function premiumRequest(path: string, init?: RequestInit): Promise<PremiumStatus> {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const detail = typeof body?.detail === "string" ? body.detail : null;
    throw new Error(detail ?? "Couldn't reach HeartLink. Check your connection and try again.");
  }
  return res.json();
}

export function usePremium() {
  const { userId } = useUser();
  return useQuery({
    queryKey: ["premium", userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    queryFn: () => premiumRequest("/api/premium"),
  });
}

function usePremiumChange<T>(send: (input: T) => Promise<PremiumStatus>) {
  const { userId, refreshUser } = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: (status) => {
      queryClient.setQueryData(["premium", userId], status);
      // The profile carries the plan too (user.plan, user.premium_until)
      refreshUser();
    },
  });
}

export function useStartTrial() {
  return usePremiumChange<void>(() => premiumRequest("/api/premium/trial", { method: "POST" }));
}

export function useDemoCheckout() {
  return usePremiumChange<{ period: PremiumPeriod; method: PaymentMethod }>((input) =>
    premiumRequest("/api/premium/checkout", { method: "POST", body: JSON.stringify(input) }),
  );
}
