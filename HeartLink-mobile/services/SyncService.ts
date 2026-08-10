import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "@offline_meal_queue";
const EXERCISE_QUEUE_KEY = "@offline_exercise_queue";
const SLEEP_QUEUE_KEY = "@offline_sleep_queue";

export async function queueMealForSync(userId: string, payload: any) {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = queueJson ? JSON.parse(queueJson) : [];
    queue.push({ userId, payload, timestamp: Date.now() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    console.log(`[SyncService] Queued meal offline. Total in queue: ${queue.length}`);
  } catch (error) {
    console.error("[SyncService] Failed to queue meal for sync", error);
  }
}

export async function syncOfflineMeals(baseUrl: string) {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    if (!queueJson) return;
    
    const queue = JSON.parse(queueJson);
    if (queue.length === 0) return;

    console.log(`[SyncService] Attempting to sync ${queue.length} offline meals...`);
    const newQueue = [];

    for (const item of queue) {
      try {
        const response = await fetch(`${baseUrl}/api/meals/${item.userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        
        if (!response.ok) {
          console.error("[SyncService] Failed to sync a meal, keeping in queue.", item.payload);
          newQueue.push(item);
        } else {
          console.log(`[SyncService] Successfully synced meal: ${item.payload.meal_name}`);
        }
      } catch (err) {
         // Network error, keep in queue
         console.log("[SyncService] Network error during sync, keeping meal in queue.");
         newQueue.push(item);
      }
    }
    
    if (newQueue.length !== queue.length) {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(newQueue));
      console.log(`[SyncService] Sync complete. ${queue.length - newQueue.length} meals uploaded.`);
    }
  } catch (error) {
    console.error("[SyncService] Failed during offline meal sync", error);
  }
}

export async function queueExerciseForSync(userId: string, payload: any) {
  try {
    const queueJson = await AsyncStorage.getItem(EXERCISE_QUEUE_KEY);
    const queue = queueJson ? JSON.parse(queueJson) : [];
    queue.push({ userId, payload, timestamp: Date.now() });
    await AsyncStorage.setItem(EXERCISE_QUEUE_KEY, JSON.stringify(queue));
    console.log(`[SyncService] Queued exercise offline. Total in queue: ${queue.length}`);
  } catch (error) {
    console.error("[SyncService] Failed to queue exercise for sync", error);
  }
}

export async function syncOfflineExercises(baseUrl: string) {
  try {
    const queueJson = await AsyncStorage.getItem(EXERCISE_QUEUE_KEY);
    if (!queueJson) return;
    
    const queue = JSON.parse(queueJson);
    if (queue.length === 0) return;

    console.log(`[SyncService] Attempting to sync ${queue.length} offline exercises...`);
    const newQueue = [];

    for (const item of queue) {
      try {
        const response = await fetch(`${baseUrl}/api/exercises/logs/${item.userId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(item.payload),
        });
        
        if (!response.ok) {
          console.error("[SyncService] Failed to sync an exercise, keeping in queue.", item.payload);
          newQueue.push(item);
        } else {
          console.log(`[SyncService] Successfully synced exercise: ${item.payload.routine_name}`);
        }
      } catch (err) {
         // Network error, keep in queue
         console.log("[SyncService] Network error during sync, keeping exercise in queue.");
         newQueue.push(item);
      }
    }
    
    if (newQueue.length !== queue.length) {
      await AsyncStorage.setItem(EXERCISE_QUEUE_KEY, JSON.stringify(newQueue));
      console.log(`[SyncService] Sync complete. ${queue.length - newQueue.length} exercises uploaded.`);
    }
  } catch (error) {
    console.error("[SyncService] Failed during offline exercise sync", error);
  }
}

export async function queueSleepForSync(userId: string, payload: any) {
  try {
    const queueJson = await AsyncStorage.getItem(SLEEP_QUEUE_KEY);
    const queue = queueJson ? JSON.parse(queueJson) : [];
    queue.push({ userId, payload, timestamp: Date.now() });
    await AsyncStorage.setItem(SLEEP_QUEUE_KEY, JSON.stringify(queue));
    console.log(`[SyncService] Queued sleep offline. Total in queue: ${queue.length}`);
  } catch (error) {
    console.error("[SyncService] Failed to queue sleep for sync", error);
  }
}

export async function syncOfflineSleeps(baseUrl: string) {
  try {
    const queueJson = await AsyncStorage.getItem(SLEEP_QUEUE_KEY);
    if (!queueJson) return;
    
    const queue = JSON.parse(queueJson);
    if (queue.length === 0) return;

    console.log(`[SyncService] Attempting to sync ${queue.length} offline sleeps...`);
    const newQueue = [];

    for (const item of queue) {
      try {
        const response = await fetch(`${baseUrl}/api/sleep-logs/${item.userId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${item.userId}`
          },
          body: JSON.stringify(item.payload),
        });
        
        if (!response.ok) {
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
      await AsyncStorage.setItem(SLEEP_QUEUE_KEY, JSON.stringify(newQueue));
      console.log(`[SyncService] Sync complete. ${queue.length - newQueue.length} sleep logs uploaded.`);
    }
  } catch (error) {
    console.error("[SyncService] Failed during offline sleep sync", error);
  }
}
