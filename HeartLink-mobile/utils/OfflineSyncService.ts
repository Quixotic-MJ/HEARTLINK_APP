import AsyncStorage from "@react-native-async-storage/async-storage";

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timestamp: number;
}

const QUEUE_KEY = "@offline_request_queue";

export const OfflineSyncService = {
  /**
   * Queue a request to be retried when internet is restored
   */
  async queueRequest(url: string, method: string = "POST", body?: any, headers?: Record<string, string>): Promise<void> {
    try {
      const existingQueueStr = await AsyncStorage.getItem(QUEUE_KEY);
      const queue: QueuedRequest[] = existingQueueStr ? JSON.parse(existingQueueStr) : [];

      const newRequest: QueuedRequest = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        url,
        method,
        headers: headers || { "Content-Type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
        timestamp: Date.now(),
      };

      queue.push(newRequest);
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
      console.log(`[OfflineSyncService] Queued offline request to ${url}. Total queued: ${queue.length}`);
    } catch (error) {
      console.error("[OfflineSyncService] Failed to queue request:", error);
    }
  },

  /**
   * Process all queued requests sequentially
   */
  async processQueue(): Promise<{ successCount: number; failedCount: number }> {
    try {
      const existingQueueStr = await AsyncStorage.getItem(QUEUE_KEY);
      if (!existingQueueStr) return { successCount: 0, failedCount: 0 };

      const queue: QueuedRequest[] = JSON.parse(existingQueueStr);
      if (queue.length === 0) return { successCount: 0, failedCount: 0 };

      console.log(`[OfflineSyncService] Attempting to sync ${queue.length} offline request(s)...`);

      const remainingQueue: QueuedRequest[] = [];
      let successCount = 0;
      let failedCount = 0;
      const token = await AsyncStorage.getItem("access_token");
      if (!token) {
        console.warn("[OfflineSyncService] No access token available. Halting queue processing.");
        return { successCount: 0, failedCount: 0 };
      }

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];
        try {
          const headers: Record<string, string> = { ...(item.headers || { "Content-Type": "application/json" }) };
          if (!headers["Authorization"] && !headers["authorization"]) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const response = await fetch(item.url, {
            method: item.method,
            headers,
            body: item.body,
          });

          if (response.ok) {
            successCount++;
            console.log(`[OfflineSyncService] Successfully synced request ${item.id} (${item.url})`);
          } else if (response.status === 401) {
            console.warn(`[OfflineSyncService] 401 Unauthorized encountered. Halting queue to avoid spam.`);
            // Retain this and all remaining items in queue
            for (let j = i; j < queue.length; j++) {
              remainingQueue.push(queue[j]);
            }
            failedCount += (queue.length - i);
            break;
          } else if (response.status === 400 || response.status === 403 || response.status === 422) {
            console.warn(`[OfflineSyncService] Request ${item.id} rejected with client error ${response.status}. Dropping invalid request.`);
            failedCount++;
          } else {
            console.warn(`[OfflineSyncService] Request ${item.id} failed with status ${response.status}. Retaining in queue.`);
            remainingQueue.push(item);
            failedCount++;
          }
        } catch (err) {
          console.error(`[OfflineSyncService] Network error trying to sync request ${item.id}. Retaining in queue.`, err);
          remainingQueue.push(item);
          failedCount++;
        }
      }

      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
      return { successCount, failedCount };
    } catch (error) {
      console.error("[OfflineSyncService] Failed processing queue:", error);
      return { successCount: 0, failedCount: 0 };
    }
  },

  /**
   * Get the current count of queued items
   */
  async getQueueCount(): Promise<number> {
    try {
      const existingQueueStr = await AsyncStorage.getItem(QUEUE_KEY);
      if (!existingQueueStr) return 0;
      const queue: QueuedRequest[] = JSON.parse(existingQueueStr);
      return queue.length;
    } catch {
      return 0;
    }
  }
};
