import { useCallback, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";
import { PremiumRequiredError } from "./useHealthReport";
import { MealPlan, thisWeek } from "../services/mealPlan";

// HL-155: the weekly meal plan (Premium). A free account gets PremiumRequiredError instead of an error.

export function useMealPlan(week: string, shuffle: number | null) {
  const { userId } = useUser();
  return useQuery({
    queryKey: ["mealPlan", userId, week, shuffle],
    enabled: !!userId && shuffle !== null,
    staleTime: 10 * 60 * 1000,
    retry: (count, error) => !(error instanceof PremiumRequiredError) && count < 2,
    queryFn: async (): Promise<MealPlan> => {
      const res = await apiFetch(`/api/meal-plan?week=${week}&shuffle=${shuffle}`);
      if (res.status === 403) {
        const body = await res.json().catch(() => null);
        if (body?.detail?.code === "premium_required") throw new PremiumRequiredError("premium_required");
      }
      if (!res.ok) throw new Error("Couldn't load your meal plan");
      return res.json();
    },
  });
}

const shuffleKey = (userId: string | null, week: string) => `meal_plan_shuffle_${userId ?? "anon"}_${week}`;

/**
 * This week's plan number, remembered on the phone so the plan stays the same when the screen is opened again.
 * null while it loads. "Make a new plan" moves to the next number.
 */
export function usePlanNumber(week = thisWeek()) {
  const { userId } = useUser();
  const [shuffle, setShuffle] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(shuffleKey(userId, week))
      .then((v) => alive && setShuffle(Number.parseInt(v ?? "0", 10) || 0))
      .catch(() => alive && setShuffle(0));
    return () => {
      alive = false;
    };
  }, [userId, week]);
  const next = useCallback(() => {
    setShuffle((n) => {
      const value = ((n ?? 0) + 1) % 10_000;
      AsyncStorage.setItem(shuffleKey(userId, week), String(value)).catch(() => {});
      return value;
    });
  }, [userId, week]);
  return { week, shuffle, next };
}
