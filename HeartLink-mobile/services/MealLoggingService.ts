import AsyncStorage from "@react-native-async-storage/async-storage";
import { queueMealForSync } from "./SyncService";
import { postLogAck } from "./companionCopy";

const base_url = process.env.EXPO_PUBLIC_API_URL;

export type MealPayload = {
  recipe_id?: string;
  meal_name: string;
  portion: number;
  calories: number;
  sodium_mg: number;
  saturated_fat_g: number;
  fiber_g: number;
  cholesterol_mg?: number;
  image_url: string | null;
  source?: string;
  time_of_meal?: string;
};

/** The patient's own daily sodium limit from the cached dashboard, else 2,000 mg. */
function limitFromCache(data: any): number {
  const limit = data?.nutrition_budget?.sodium?.limit_mg;
  return typeof limit === "number" && limit > 0 ? limit : 2000;
}

/**
 * Centralized meal logging service that handles the network POST,
 * offline queuing, and safely computes the daily running total from the local cache.
 */
export async function logMealAndGetToast(
  userId: string,
  token: string | null,
  payload: MealPayload,
  showToast: (options: any) => void,
  onComplete: () => void
) {
  const cacheKey = `@dashboard_cache_${userId}`;
  let runningTotal = payload.sodium_mg;
  let limit = 2000;

  try {
    // 1. Send to server
    const response = await fetch(`${base_url}/api/meals/${userId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token || ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) throw new Error("Failed to log meal to server");

    // 2. Read last known total from dashboard cache
    const cachedStr = await AsyncStorage.getItem(cacheKey);
    if (cachedStr) {
      const data = JSON.parse(cachedStr);
      limit = limitFromCache(data);
      const prevTotal =
        data?.nutrition_budget?.sodium?.consumed_mg ??
        data?.today_activity?.total_sodium_mg ??
        0;
      runningTotal = prevTotal + payload.sodium_mg;

      // Optimistically update the cache so if they log twice before dashboard refreshes, the total is correct.
      if (data.nutrition_budget?.sodium) {
        data.nutrition_budget.sodium.consumed_mg = runningTotal;
      } else if (data.today_activity) {
        data.today_activity.total_sodium_mg = runningTotal;
      }
      if (data.today_activity) {
        data.today_activity.meals_count = (data.today_activity.meals_count || 0) + 1;
      }
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    }

    // 3. Show success toast with perfectly matched math
    showToast({
      ...postLogAck(
        "meal",
        `${Math.round(payload.sodium_mg)}mg sodium. You're at ${Math.round(
          runningTotal
        ).toLocaleString()} of your ${limit.toLocaleString()}mg budget today.`
      ),
      type: "success",
      duration: 5500,
    });
  } catch (error) {
    console.log("Network error logging meal, queueing offline...", error);
    
    // 1. Queue it
    await queueMealForSync(userId, payload);

    // 2. Read last known total from cache (same logic as success)
    try {
      const cachedStr = await AsyncStorage.getItem(cacheKey);
      if (cachedStr) {
        const data = JSON.parse(cachedStr);
        limit = limitFromCache(data);
        const prevTotal =
          data?.nutrition_budget?.sodium?.consumed_mg ??
          data?.today_activity?.total_sodium_mg ??
          0;
        runningTotal = prevTotal + payload.sodium_mg;

        if (data.nutrition_budget?.sodium) {
          data.nutrition_budget.sodium.consumed_mg = runningTotal;
        } else if (data.today_activity) {
          data.today_activity.total_sodium_mg = runningTotal;
        }
        if (data.today_activity) {
          data.today_activity.meals_count = (data.today_activity.meals_count || 0) + 1;
        }
        await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
      }
    } catch (cacheError) {
      console.error("Failed to update cache during offline save", cacheError);
    }

    // 3. Show offline success toast with math
    showToast({
      ...postLogAck(
        "meal",
        `Saved offline. Added ${Math.round(payload.sodium_mg)}mg. You're at ${Math.round(
          runningTotal
        ).toLocaleString()} of ${limit.toLocaleString()}mg.`
      ),
      type: "info",
      duration: 5500,
    });
  } finally {
    onComplete();
  }
}

export type LogMealsResult = {
  savedCount: number;
  /** Saved on the phone and uploaded later by SyncService. */
  offlineCount: number;
};

/**
 * Logs several foods at once (HL-032 review screen). Each one that can't reach the
 * server is queued for later, and the cached daily total is updated once. The caller
 * shows the result (the "logged" screen), so no toast here.
 */
export async function logMeals(userId: string, token: string | null, payloads: MealPayload[]): Promise<LogMealsResult> {
  const cacheKey = `@dashboard_cache_${userId}`;
  let totalAddedSodium = 0;
  let savedCount = 0;
  let offlineCount = 0;

  for (const payload of payloads) {
    totalAddedSodium += payload.sodium_mg;
    try {
      const response = await fetch(`${base_url}/api/meals/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to log meal to server");
      savedCount++;
    } catch (error) {
      console.log("Network error logging one of multiple meals, queueing offline...", error);
      await queueMealForSync(userId, payload);
      offlineCount++;
    }
  }

  // Update Cache once for the batch
  try {
    const cachedStr = await AsyncStorage.getItem(cacheKey);
    if (cachedStr) {
      const data = JSON.parse(cachedStr);
      const prevTotal =
        data?.nutrition_budget?.sodium?.consumed_mg ??
        data?.today_activity?.total_sodium_mg ??
        0;
      const runningTotal = prevTotal + totalAddedSodium;

      if (data.nutrition_budget?.sodium) {
        data.nutrition_budget.sodium.consumed_mg = runningTotal;
      } else if (data.today_activity) {
        data.today_activity.total_sodium_mg = runningTotal;
      }
      if (data.today_activity) {
        data.today_activity.meals_count = (data.today_activity.meals_count || 0) + payloads.length;
      }
      await AsyncStorage.setItem(cacheKey, JSON.stringify(data));
    }
  } catch (cacheError) {
    console.error("Failed to update cache during batch save", cacheError);
  }

  return { savedCount, offlineCount };
}
