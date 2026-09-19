import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../contexts/ToastContext';
import { postLogAck } from '../services/companionCopy';
import { useNetInfo } from '@react-native-community/netinfo';

const base_url = process.env.EXPO_PUBLIC_API_URL;

export interface ExercisePayload {
  routine_name: string;
  duration_minutes: number;
  duration_seconds: number;
  status: string;
}

export function useLogExercise(userId: string | null | undefined, token: string | null) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const netInfo = useNetInfo();

  return useMutation({
    mutationKey: ['logExercise', userId],
    mutationFn: async (payload: ExercisePayload) => {
      if (!userId) throw new Error("No user ID");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await fetch(`${base_url}/api/exercises/logs/${userId}`, {
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
    onMutate: async (newExercise) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard', userId] });
      const previousDashboard = queryClient.getQueryData(['dashboard', userId]);

      queryClient.setQueryData(['dashboard', userId], (old: any) => {
        if (!old) return old;
        
        const prevTotal = old.today_activity?.total_exercise_minutes || 0;
        const newTotal = prevTotal + newExercise.duration_minutes;
        const newExercisesCount = (old.today_activity?.exercises_count || 0) + 1;

        return {
          ...old,
          today_activity: old.today_activity ? {
            ...old.today_activity,
            total_exercise_minutes: newTotal,
            exercises_count: newExercisesCount
          } : {
             total_exercise_minutes: newTotal,
             exercises_count: newExercisesCount
          }
        };
      });

      const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
      
      if (isOffline) {
        showToast({
          title: "Saved Offline",
          message: `${newExercise.routine_name} (${newExercise.duration_minutes} min) saved on this device. I'll sync it when you're back online.`,
          type: "info",
        });
      } else {
        showToast({
          ...postLogAck(
            "exercise",
            `${newExercise.routine_name} (${newExercise.duration_minutes} min)`
          ),
          type: "success",
        });
      }

      return { previousDashboard };
    },
    onError: (err: any, newExercise, context) => {
      const isQueued = err.status === 401 || err.status >= 500 || err.isNetworkError;

      if (!isQueued && context?.previousDashboard) {
        queryClient.setQueryData(['dashboard', userId], context.previousDashboard);
      }
      
      if (isQueued) {
        if (userId) {
          import('../services/SyncService').then(({ queueExerciseForSync }) => {
            queueExerciseForSync(userId, newExercise);
          });
        }
        if (err.status !== 401) {
          showToast({
            title: "Saved offline",
            message: "Network unstable. Your activity was saved offline.",
            type: "info",
          });
        }
      } else {
        showToast({
          title: "Error logging activity",
          message: "Failed to log activity. Please try again.",
          type: "error",
        });
      }
    },
    onSettled: (data, err: any) => {
      const isQueued = err && (err.status === 401 || err.status >= 500 || err.isNetworkError);
      if (!isQueued) {
        queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      }
    },
  });
}
