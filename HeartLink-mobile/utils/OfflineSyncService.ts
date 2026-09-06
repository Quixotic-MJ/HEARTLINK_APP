import AsyncStorage from "@react-native-async-storage/async-storage";

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
  timestamp: number;
  retryCount?: number;
  userId?: string;
}

const DEFAULT_QUEUE_KEY = "@offline_request_queue";
const MAX_RETRIES = 5;
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days TTL

function getQueueKey(userId?: string): string {
  return userId ? `@offline_request_queue_${userId}` : DEFAULT_QUEUE_KEY;
}

function getDeadLetterKey(userId?: string): string {
  return userId ? `@offline_dead_letter_log_${userId}` : "@offline_dead_letter_log";
}

async function appendToDeadLetterLog(userId: string | undefined, item: QueuedRequest, reason: string): Promise<void> {
  try {
    const key = getDeadLetterKey(userId);
    const raw = await AsyncStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    list.push({ ...item, droppedAt: Date.now(), dropReason: reason });
    // Keep at most last 50 dead letter items
    if (list.length > 50) list.splice(0, list.length - 50);
    await AsyncStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.warn("[OfflineSyncService] Failed to write to dead-letter log:", e);
  }
}

export const OfflineSyncService = {
  /**
   * Queue a request to be retried when internet is restored.
   * Scoped to user ID when available to prevent cross-account sync leaks.
   */
  async queueRequest(
    url: string,
    method: string = "POST",
    body?: any,
    headers?: Record<string, string>,
    userId?: string
  ): Promise<void> {
    try {
      const effectiveUserId = userId || (await AsyncStorage.getItem("user_id")) || undefined;
      const queueKey = getQueueKey(effectiveUserId);
      const existingQueueStr = await AsyncStorage.getItem(queueKey);
      const queue: QueuedRequest[] = existingQueueStr ? JSON.parse(existingQueueStr) : [];

      const newRequest: QueuedRequest = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        url,
        method,
        headers: headers || { "Content-Type": "application/json" },
        body: typeof body === "string" ? body : JSON.stringify(body),
        timestamp: Date.now(),
        retryCount: 0,
        userId: effectiveUserId,
      };

      queue.push(newRequest);
      await AsyncStorage.setItem(queueKey, JSON.stringify(queue));
      console.log(`[OfflineSyncService] Queued offline request to ${url} (user: ${effectiveUserId || 'anonymous'}). Total queued: ${queue.length}`);
    } catch (error) {
      console.error("[OfflineSyncService] Failed to queue request:", error);
    }
  },

  /**
   * Process all queued requests sequentially for the active user session.
   * Enforces 7-day TTL auto-eviction and 5-retry limit with dead-letter logging.
   */
  async processQueue(targetUserId?: string): Promise<{ successCount: number; failedCount: number }> {
    try {
      const activeUserId = targetUserId || (await AsyncStorage.getItem("user_id")) || undefined;
      const queueKey = getQueueKey(activeUserId);
      const existingQueueStr = await AsyncStorage.getItem(queueKey);
      if (!existingQueueStr) return { successCount: 0, failedCount: 0 };

      const queue: QueuedRequest[] = JSON.parse(existingQueueStr);
      if (queue.length === 0) return { successCount: 0, failedCount: 0 };

      console.log(`[OfflineSyncService] Attempting to sync ${queue.length} offline request(s) for user: ${activeUserId || 'default'}...`);

      const remainingQueue: QueuedRequest[] = [];
      let successCount = 0;
      let failedCount = 0;
      const token = await AsyncStorage.getItem("access_token");
      if (!token) {
        console.warn("[OfflineSyncService] No access token available. Halting queue processing.");
        return { successCount: 0, failedCount: 0 };
      }

      const now = Date.now();

      for (let i = 0; i < queue.length; i++) {
        const item = queue[i];

        // 1. Auto-eviction: 7-day TTL check
        if (item.timestamp && (now - item.timestamp > MAX_AGE_MS)) {
          console.warn(`[OfflineSyncService] Request ${item.id} exceeded 7-day TTL. Evicting to dead-letter.`);
          await appendToDeadLetterLog(activeUserId, item, "TTL_EXCEEDED_7_DAYS");
          failedCount++;
          continue;
        }

        // 2. Auto-eviction: Max retries check
        const currentRetries = item.retryCount || 0;
        if (currentRetries >= MAX_RETRIES) {
          console.warn(`[OfflineSyncService] Request ${item.id} exceeded ${MAX_RETRIES} retries. Evicting to dead-letter.`);
          await appendToDeadLetterLog(activeUserId, item, `MAX_RETRIES_${MAX_RETRIES}_EXCEEDED`);
          failedCount++;
          continue;
        }

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
            console.warn(`[OfflineSyncService] 401 Unauthorized encountered. Halting queue to avoid token invalidation.`);
            // Retain this and all remaining items in queue without incrementing retry count
            for (let j = i; j < queue.length; j++) {
              remainingQueue.push(queue[j]);
            }
            failedCount += (queue.length - i);
            break;
          } else if (response.status >= 400 && response.status < 500) {
            // Client errors (400, 403, 422, etc.) cannot be resolved by retrying. Evict to prevent poisoning.
            console.warn(`[OfflineSyncService] Request ${item.id} rejected with client error ${response.status}. Dropping invalid request.`);
            await appendToDeadLetterLog(activeUserId, item, `CLIENT_REJECTION_${response.status}`);
            failedCount++;
          } else {
            console.warn(`[OfflineSyncService] Request ${item.id} failed with server status ${response.status}. Incrementing retry count.`);
            remainingQueue.push({ ...item, retryCount: currentRetries + 1 });
            failedCount++;
          }
        } catch (err) {
          console.error(`[OfflineSyncService] Network error trying to sync request ${item.id}. Retaining in queue.`, err);
          remainingQueue.push({ ...item, retryCount: currentRetries + 1 });
          failedCount++;
        }
      }

      await AsyncStorage.setItem(queueKey, JSON.stringify(remainingQueue));
      return { successCount, failedCount };
    } catch (error) {
      console.error("[OfflineSyncService] Failed processing queue:", error);
      return { successCount: 0, failedCount: 0 };
    }
  },

  /**
   * Get the current count of queued items for active user
   */
  async getQueueCount(userId?: string): Promise<number> {
    try {
      const activeUserId = userId || (await AsyncStorage.getItem("user_id")) || undefined;
      const existingQueueStr = await AsyncStorage.getItem(getQueueKey(activeUserId));
      if (!existingQueueStr) return 0;
      const queue: QueuedRequest[] = JSON.parse(existingQueueStr);
      return queue.length;
    } catch {
      return 0;
    }
  }
};

