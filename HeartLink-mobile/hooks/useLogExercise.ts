import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OFFLINE_SAVE, isConnectionError } from './offlineSave';
import { useToast } from '../contexts/ToastContext';
import { postLogAck } from '../services/companionCopy';
import { queueExerciseForSync } from '../services/SyncService';
import { apiFetch } from "../lib/api";
import { useNetInfo } from '@react-native-community/netinfo';
export interface ExercisePayload {
  routine_name: string;
  duration_minutes: number;
  duration_seconds: number;
  status: string;
  /** Guided exercises also send which routine it was and its planned length. */
  id?: string;
  routine_id?: string;
  planned_duration_seconds?: number;
  planned_duration_minutes?: number;
}

/**
 * `quiet`: skip the "logged" message when the screen shows the result itself (the guided
 * exercise's "Exercise saved" screen). Offline and error messages still show.
 */
export function useLogExercise(userId: string | null | undefined, token: string | null, { quiet = false }: { quiet?: boolean } = {}) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const netInfo = useNetInfo();

  return useMutation({
    mutationKey: ['logExercise', userId],
    ...OFFLINE_SAVE,
    mutationFn: async (payload: ExercisePayload) => {
      if (!userId) throw new Error("No user ID");
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      try {
        const response = await apiFetch(`/api/exercises/logs/${userId}`, {
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
        if (isConnectionError(err)) {
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

      // Calculate running total for data-aware feedback
      let runningTotal = newExercise.duration_minutes;
      if (previousDashboard) {
        const prevData = previousDashboard as any;
        const prevTotal = prevData.today_activity?.total_exercise_minutes || 0;
        runningTotal = prevTotal + newExercise.duration_minutes;
      }
      
      if (isOffline) {
        showToast({
          ...postLogAck(
            "exercise",
            `${newExercise.routine_name} — ${newExercise.duration_minutes} min saved offline. You're at ${runningTotal} min of activity today`
          ),
          type: "info",
          duration: 5500,
        });
      } else if (!quiet) {
        showToast({
          ...postLogAck(
            "exercise",
            `${newExercise.routine_name} — ${newExercise.duration_minutes} min logged. You're at ${runningTotal} min of activity today`
          ),
          type: "success",
          duration: 5500,
        });
      }

      return { previousDashboard, offlineToastShown: isOffline };
    },
    onError: (err: any, newExercise, context) => {
      const isQueued = err.status >= 500 || err.isNetworkError;

      if (!isQueued && context?.previousDashboard) {
        queryClient.setQueryData(['dashboard', userId], context.previousDashboard);
      }
      
      if (isQueued) {
        if (userId) {
          queueExerciseForSync(userId, newExercise);
        }
        // Only show the offline toast if onMutate didn't already show one
        if (err.status !== 401 && !context?.offlineToastShown) {
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
      const isQueued = err && (err.status >= 500 || err.isNetworkError);
      if (!isQueued) {
        queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
      }
    },
  });
}
