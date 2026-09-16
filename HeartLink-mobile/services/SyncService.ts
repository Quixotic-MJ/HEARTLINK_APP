import AsyncStorage from "@react-native-async-storage/async-storage";
import { DeviceEventEmitter } from "react-native";

const DEFAULT_MEAL_QUEUE_KEY = "@offline_meal_queue";
const DEFAULT_EXERCISE_QUEUE_KEY = "@offline_exercise_queue";
const DEFAULT_SLEEP_QUEUE_KEY = "@offline_sleep_queue";
const DEFAULT_HEALTH_QUEUE_KEY = "@offline_health_queue";

let isSyncing = false;

const getMealQueueKey = (userId?: string | null) =>
  userId ? `@offline_meal_queue_${userId}` : DEFAULT_MEAL_QUEUE_KEY;
const getExerciseQueueKey = (userId?: string | null) =>
  userId ? `@offline_exercise_queue_${userId}` : DEFAULT_EXERCISE_QUEUE_KEY;
const getSleepQueueKey = (userId?: string | null) =>
  userId ? `@offline_sleep_queue_${userId}` : DEFAULT_SLEEP_QUEUE_KEY;
const getHealthQueueKey = (userId?: string | null) =>
  userId ? `@offline_health_queue_${userId}` : DEFAULT_HEALTH_QUEUE_KEY;

export async function queueMealForSync(userId: string, payload: any): Promise<void> {
  try {
    const queueKey = getMealQueueKey(userId);
    const queueJson = await AsyncStorage.getItem(queueKey);
    const queue = queueJson ? JSON.parse(queueJson) : [];
    queue.push({ userId, payload, timestamp: Date.now() });
    await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
    console.log(`[SyncService] Queued meal offline for user ${userId}. Total in queue: ${queue.length}`);
  } catch (error) {
    console.error("[SyncService] Failed to queue meal for sync", error);
  }
}

export async function syncOfflineMeals(baseUrl: string): Promise<void> {
  try {
    const currentUserId = await AsyncStorage.getItem("user_id");
    const queueKey = getMealQueueKey(currentUserId);
    const queueJson = await AsyncStorage.getItem(queueKey);
    if (!queueJson) return;

    const queue = JSON.parse(queueJson);
    if (queue.length === 0) return;

    const token = await AsyncStorage.getItem("access_token");
    if (!token) {
      console.warn("[SyncService] No access token found. Skipping meal sync.");
      return;
    }

    console.log(`[SyncService] Attempting to sync ${queue.length} offline meals for user ${currentUserId || 'default'}...`);
    const newQueue = [];
    let stopSync = false;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (stopSync) {
        newQueue.push(item);
        continue;
      }

      // Security isolation: Never sync another user's offline records under current session
      if (item.userId && currentUserId && item.userId !== currentUserId) {
        newQueue.push(item);
        continue;
      }

      try {
        const response = await fetch(`${baseUrl}/api/meals/${item.userId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item.payload),
        });

        if (response.status === 401) {
          console.warn("[SyncService] 401 Unauthorized during meal sync. Halting sync pass.");
          newQueue.push(item);
          stopSync = true;
        } else if (response.status >= 400 && response.status < 500) {
          console.warn(`[SyncService] Meal rejected with status ${response.status}. Dropping invalid record.`);
        } else if (!response.ok) {
          console.error("[SyncService] Failed to sync a meal, keeping in queue.", item.payload);
          newQueue.push(item);
        } else {
          console.log(`[SyncService] Successfully synced meal: ${item.payload.meal_name}`);
        }
      } catch (err) {
        console.log("[SyncService] Network error during sync, keeping meal in queue.");
        newQueue.push(item);
      }
    }

    if (newQueue.length !== queue.length) {
      await AsyncStorage.setItem(queueKey, JSON.stringify(newQueue));
      console.log(`[SyncService] Meal sync complete. ${queue.length - newQueue.length} meals uploaded.`);
    }
    return queue.length - newQueue.length;
  } catch (error) {
    console.error("[SyncService] Failed during offline meal sync", error);
    return 0;
  }
}

export async function queueExerciseForSync(userId: string, payload: any): Promise<void> {
  try {
    const queueKey = getExerciseQueueKey(userId);
    const queueJson = await AsyncStorage.getItem(queueKey);
    const queue = queueJson ? JSON.parse(queueJson) : [];
    queue.push({ userId, payload, timestamp: Date.now() });
    await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
    console.log(`[SyncService] Queued exercise offline for user ${userId}. Total in queue: ${queue.length}`);
  } catch (error) {
    console.error("[SyncService] Failed to queue exercise for sync", error);
  }
}

export async function syncOfflineExercises(baseUrl: string): Promise<void> {
  try {
    const currentUserId = await AsyncStorage.getItem("user_id");
    const queueKey = getExerciseQueueKey(currentUserId);
    const queueJson = await AsyncStorage.getItem(queueKey);
    if (!queueJson) return;

    const queue = JSON.parse(queueJson);
    if (queue.length === 0) return;

    const token = await AsyncStorage.getItem("access_token");
    if (!token) {
      console.warn("[SyncService] No access token found. Skipping exercise sync.");
      return;
    }

    console.log(`[SyncService] Attempting to sync ${queue.length} offline exercises for user ${currentUserId || 'default'}...`);
    const newQueue = [];
    let stopSync = false;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (stopSync) {
        newQueue.push(item);
        continue;
      }

      if (item.userId && currentUserId && item.userId !== currentUserId) {
        newQueue.push(item);
        continue;
      }

      try {
        const response = await fetch(`${baseUrl}/api/exercises/logs/${item.userId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item.payload),
        });

        if (response.status === 401) {
          console.warn("[SyncService] 401 Unauthorized during exercise sync. Halting sync pass.");
          newQueue.push(item);
          stopSync = true;
        } else if (response.status >= 400 && response.status < 500) {
          console.warn(`[SyncService] Exercise rejected with status ${response.status}. Dropping invalid record.`);
        } else if (!response.ok) {
          console.error("[SyncService] Failed to sync an exercise, keeping in queue.", item.payload);
          newQueue.push(item);
        } else {
          console.log(`[SyncService] Successfully synced exercise: ${item.payload.routine_name}`);
        }
      } catch (err) {
        console.log("[SyncService] Network error during sync, keeping exercise in queue.");
        newQueue.push(item);
      }
    }

    if (newQueue.length !== queue.length) {
      await AsyncStorage.setItem(queueKey, JSON.stringify(newQueue));
      console.log(`[SyncService] Exercise sync complete. ${queue.length - newQueue.length} exercises uploaded.`);
    }
    return queue.length - newQueue.length;
  } catch (error) {
    console.error("[SyncService] Failed during offline exercise sync", error);
    return 0;
  }
}

export async function queueSleepForSync(userId: string, payload: any): Promise<void> {
  try {
    const queueKey = getSleepQueueKey(userId);
    const queueJson = await AsyncStorage.getItem(queueKey);
    const queue = queueJson ? JSON.parse(queueJson) : [];
    queue.push({ userId, payload, timestamp: Date.now() });
    await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
    console.log(`[SyncService] Queued sleep offline for user ${userId}. Total in queue: ${queue.length}`);
  } catch (error) {
    console.error("[SyncService] Failed to queue sleep for sync", error);
  }
}

export async function syncOfflineSleeps(baseUrl: string): Promise<void> {
  try {
    const currentUserId = await AsyncStorage.getItem("user_id");
    const queueKey = getSleepQueueKey(currentUserId);
    const queueJson = await AsyncStorage.getItem(queueKey);
    if (!queueJson) return;

    const queue = JSON.parse(queueJson);
    if (queue.length === 0) return;

    const token = await AsyncStorage.getItem("access_token");
    if (!token) {
      console.warn("[SyncService] No access token found. Skipping sleep sync.");
      return;
    }

    console.log(`[SyncService] Attempting to sync ${queue.length} offline sleeps for user ${currentUserId || 'default'}...`);
    const newQueue = [];
    let stopSync = false;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (stopSync) {
        newQueue.push(item);
        continue;
      }

      if (item.userId && currentUserId && item.userId !== currentUserId) {
        newQueue.push(item);
        continue;
      }

      try {
        const response = await fetch(`${baseUrl}/api/sleep-logs/${item.userId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item.payload),
        });

        if (response.status === 401) {
          console.warn("[SyncService] 401 Unauthorized during sleep sync. Halting sync pass.");
          newQueue.push(item);
          stopSync = true;
        } else if (response.status >= 400 && response.status < 500) {
          console.warn(`[SyncService] Sleep log rejected with status ${response.status}. Dropping invalid record.`);
        } else if (!response.ok) {
          console.error("[SyncService] Failed to sync a sleep log, keeping in queue.", item.payload);
          newQueue.push(item);
        } else {
          console.log(`[SyncService] Successfully synced sleep log for user ${item.userId}`);
        }
      } catch (err) {
        console.log("[SyncService] Network error during sync, keeping sleep log in queue.");
        newQueue.push(item);
      }
    }

    if (newQueue.length !== queue.length) {
      await AsyncStorage.setItem(queueKey, JSON.stringify(newQueue));
      console.log(`[SyncService] Sleep sync complete. ${queue.length - newQueue.length} sleeps uploaded.`);
    }
    return queue.length - newQueue.length;
  } catch (error) {
    console.error("[SyncService] Failed during offline sleep sync", error);
    return 0;
  }
}

export async function queueHealthLogForSync(userId: string, payload: any): Promise<void> {
  try {
    const queueKey = getHealthQueueKey(userId);
    const queueJson = await AsyncStorage.getItem(queueKey);
    const queue = queueJson ? JSON.parse(queueJson) : [];
    queue.push({ userId, payload, timestamp: Date.now() });
    await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
    console.log(`[SyncService] Queued health log offline for user ${userId}. Total in queue: ${queue.length}`);
  } catch (error) {
    console.error("[SyncService] Failed to queue health log for sync", error);
  }
}

export async function syncOfflineHealthLogs(baseUrl: string): Promise<void> {
  try {
    const currentUserId = await AsyncStorage.getItem("user_id");
    const queueKey = getHealthQueueKey(currentUserId);
    const queueJson = await AsyncStorage.getItem(queueKey);
    if (!queueJson) return;

    const queue = JSON.parse(queueJson);
    if (queue.length === 0) return;

    const token = await AsyncStorage.getItem("access_token");
    if (!token) {
      console.warn("[SyncService] No access token found. Skipping health logs sync.");
      return;
    }

    console.log(`[SyncService] Attempting to sync ${queue.length} offline health log(s) for user ${currentUserId || 'default'}...`);
    const newQueue = [];
    let stopSync = false;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (stopSync) {
        newQueue.push(item);
        continue;
      }

      if (item.userId && currentUserId && item.userId !== currentUserId) {
        newQueue.push(item);
        continue;
      }

      try {
        const response = await fetch(`${baseUrl}/api/health-logs/${item.userId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(item.payload),
        });

        if (response.status === 401) {
          console.warn("[SyncService] 401 Unauthorized during health log sync. Halting sync pass.");
          newQueue.push(item);
          stopSync = true;
        } else if (response.status >= 400 && response.status < 500) {
          console.warn(`[SyncService] Invalid health log (status ${response.status}). Dropping from queue.`, item.payload);
        } else if (!response.ok) {
          console.error("[SyncService] Failed to sync health log, keeping in queue.", item.payload);
          newQueue.push(item);
        } else {
          console.log(`[SyncService] Successfully synced health log for user ${item.userId}`);
        }
      } catch (err) {
        console.log("[SyncService] Network error during sync, keeping health log in queue.");
        newQueue.push(item);
      }
    }

    if (newQueue.length !== queue.length) {
      await AsyncStorage.setItem(queueKey, JSON.stringify(newQueue));
      console.log(`[SyncService] Health log sync complete. ${queue.length - newQueue.length} health logs uploaded.`);
    }
    return queue.length - newQueue.length;
  } catch (error) {
    console.error("[SyncService] Failed during offline health logs sync", error);
    return 0;
  }
}

export async function syncOfflineAll(baseUrl: string): Promise<void> {
  if (isSyncing) {
    console.log("[SyncService] Sync already in progress, skipping concurrent attempt.");
    return;
  }
  
  isSyncing = true;
  DeviceEventEmitter.emit("sync_started");
  try {
    let syncedCount = 0;
    
    const wrapSync = async (syncFn: () => Promise<number>) => {
      try {
        const count = await syncFn();
        syncedCount += count;
      } catch (e) {
        console.log("Sync error:", e);
      }
    };

    await wrapSync(() => syncOfflineMeals(baseUrl));
    await wrapSync(() => syncOfflineExercises(baseUrl));
    await wrapSync(() => syncOfflineSleeps(baseUrl));
    await wrapSync(() => syncOfflineHealthLogs(baseUrl));
    
    if (syncedCount > 0) {
      DeviceEventEmitter.emit("offline_data_synced", syncedCount);
    }
    
    // Only emit if we actually attempted a sync, but it's safe to emit unconditionally if we want dashboard to know we checked.
    // We'll just emit unconditionally so the dashboard knows the check is done.
    DeviceEventEmitter.emit("sync_complete");
  } finally {
    isSyncing = false;
  }
}
