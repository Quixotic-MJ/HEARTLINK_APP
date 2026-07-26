import AsyncStorage from "@react-native-async-storage/async-storage";

const QUEUE_KEY = "@offline_meal_queue";

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
