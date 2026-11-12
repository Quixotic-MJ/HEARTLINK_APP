import { useEffect, useEffectEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";
import { PaymentMethod, PremiumPeriod, PremiumStatus, isPremiumProfile } from "../services/premium";

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
    // Asked again every time a screen that needs it opens: Premium can start or end outside the app (an admin in the
    // portal, or the end date passing), 2026-11-12
    staleTime: 0,
    queryFn: () => premiumRequest("/api/premium"),
  });
}

/**
 * Whether this patient has Premium now. The server's answer wins; the profile saved at sign-in is only the first guess
 * while it loads. When they differ (Premium given or removed in the portal while the app was open), the saved profile
 * is refreshed too, so every screen agrees (2026-11-12).
 */
export function useIsPremium(): boolean {
  const { user, refreshUser } = useUser();
  const fromProfile = isPremiumProfile(user);
  const fromServer = usePremium().data?.is_premium;
  const refreshProfile = useEffectEvent(() => {
    refreshUser?.();
  });
  useEffect(() => {
    if (typeof fromServer === "boolean" && fromServer !== fromProfile) refreshProfile();
  }, [fromServer, fromProfile]);
  return typeof fromServer === "boolean" ? fromServer : fromProfile;
}

function usePremiumChange<T>(send: (input: T) => Promise<PremiumStatus>) {
  const { userId, refreshUser } = useUser();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: send,
    onSuccess: (status) => {
      queryClient.setQueryData(["premium", userId], status);
      // The profile carries the plan too (user.plan, user.premium_until), and family sharing depends on it
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["family", "sharing"] });
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
