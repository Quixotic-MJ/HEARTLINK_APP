import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";
import { PremiumRequiredError } from "./useHealthReport";
import { MealName, MealPlan, OwnMeal, PlanOptions, thisWeek } from "../services/mealPlan";

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

// ─── HL-159: changing single meals ───────────────────────────────────────────

/** Approved recipes that suit the patient and fit the day's sodium, to swap in for one meal. */
export function usePlanOptions(date: string, meal: MealName, shuffle: number | null) {
  const { userId } = useUser();
  return useQuery({
    queryKey: ["mealPlanOptions", userId, date, meal, shuffle],
    enabled: !!userId && shuffle !== null && !!date,
    queryFn: async (): Promise<PlanOptions> => {
      const res = await apiFetch(`/api/meal-plan/options?date=${date}&meal=${meal}&shuffle=${shuffle}`);
      if (!res.ok) throw new Error("Couldn't load the choices");
      return res.json();
    },
  });
}

export type PlanChange =
  | { date: string; meal: MealName; recipe_id: string }
  | { date: string; meal: MealName; own: OwnMeal }
  | { date: string; meal: MealName; putBack: true };

async function detailOf(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => null);
  return typeof body?.detail === "string" ? body.detail : fallback;
}

/** Swap a meal, make it "My own meal", or put the plan's pick back. The plan reloads afterwards. */
export function useChangePlanMeal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (change: PlanChange) => {
      const res =
        "putBack" in change
          ? await apiFetch(`/api/meal-plan/changes?date=${change.date}&meal=${change.meal}`, { method: "DELETE" })
          : await apiFetch("/api/meal-plan/changes", { method: "PUT", body: JSON.stringify(change) });
      if (!res.ok) throw new Error(await detailOf(res, "Couldn't change the meal. Check your connection, then try again."));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mealPlan"] });
      queryClient.invalidateQueries({ queryKey: ["mealPlanOptions"] });
    },
  });
}

/** Every change in the week, gone: the plan's own picks again. */
export function useUndoPlanChanges() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (week: string) => {
      const res = await apiFetch(`/api/meal-plan/changes?week=${week}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await detailOf(res, "Couldn't undo your changes. Check your connection, then try again."));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["mealPlan"] }),
  });
}
