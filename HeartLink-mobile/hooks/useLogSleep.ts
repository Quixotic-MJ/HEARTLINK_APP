import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';
import { postLogAck } from '../services/companionCopy';
import { useNetInfo } from '@react-native-community/netinfo';

const base_url = process.env.EXPO_PUBLIC_API_URL;

export interface SleepPayload {
  duration_hours: number;
  quality: string;
  bedtime: string;
  wake_time: string;
}

export function useLogSleep(userId: string | null | undefined, token: string | null) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const netInfo = useNetInfo();

  return useMutation({
    mutationKey: ['logSleep', userId],
    mutationFn: async (payload: SleepPayload) => {
      if (!userId) throw new Error("No user ID");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${base_url}/api/sleep-logs/${userId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error: any = new Error(`Server error: ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return await response.json();
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
          const error: any = new Error("Network request timed out");
          error.isNetworkError = true;
          throw error;
        }
        if (err.name === 'TypeError' || err.message?.includes('Network request failed')) {
          err.isNetworkError = true;
        }
        throw err;
      }
    },
    onMutate: async (newSleep) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard', userId] });
      const previousDashboard = queryClient.getQueryData(['dashboard', userId]);

      // Optimistically update dashboard
      queryClient.setQueryData(['dashboard', userId], (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          today_activity: old.today_activity ? {
            ...old.today_activity,
            sleep_hours: newSleep.duration_hours
          } : {
            sleep_hours: newSleep.duration_hours
          }
        };
      });

      const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
      
      if (isOffline) {
        showToast({
          ...postLogAck(
            "sleep",
            `${newSleep.duration_hours.toFixed(1)} hrs • ${newSleep.quality}`
          ),
          type: "info",
          duration: 5500,
        });
      } else {
        showToast({
          ...postLogAck(
            "sleep",
            `${newSleep.duration_hours.toFixed(1)} hrs • ${newSleep.quality}`
          ),
          type: "success",
          duration: 5500,
        });
      }

      return { previousDashboard, offlineToastShown: isOffline };
    },
    onError: (err: any, newSleep, context) => {
      const isQueued = err.status >= 500 || err.isNetworkError;

      if (!isQueued && context?.previousDashboard) {
        queryClient.setQueryData(['dashboard', userId], context.previousDashboard);
      }
      
      if (isQueued) {
        if (userId) {
          import('../services/SyncService').then(({ queueSleepForSync }) => {
            queueSleepForSync(userId, newSleep);
          });
        }
        
        if (err.status !== 401 && !context?.offlineToastShown) {
          showToast({
            title: "Saved offline",
            message: "Network unstable. Your sleep was saved offline.",
            type: "info",
          });
        }
      } else {
        showToast({
          title: "Error logging sleep",
          message: "Failed to log sleep. Please try again.",
          type: "error",
        });
      }
    },
    onSettled: (data, err: any) => {
      const isQueued = err && (err.status >= 500 || err.isNetworkError);
      if (!isQueued) {
        queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      }
    },
  });
}
