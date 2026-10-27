import { useMutation, useQueryClient } from '@tanstack/react-query';
import { OFFLINE_SAVE } from './offlineSave';
import { queueHealthLogForSync } from '../services/SyncService';
import { apiFetch } from "../lib/api";

export interface VitalsPayload {
  systolic_bp: number | null;
  diastolic_bp: number | null;
  heart_rate_bpm: number | null;
  weight_kg: number | null;
  /** true = took them, false = not yet, null = takes no regular medicines */
  medication_taken: boolean | null;
  symptoms: string[];
  severity_map: Record<string, number>;
  context: string | null;
  triggered_by_exercise_id: string | null;
  notes: string;
}

/** The check-in's medicine answers. */
export type Medicine = "taken" | "not_yet" | "none";

/** What is saved for the medicine answer: null for "I don't take any", and false when left blank (as before). */
export function medicationTaken(answer: Medicine | null): boolean | null {
  if (answer === "none") return null;
  return answer === "taken";
}

type LogError =Error & { status?: number; isNetworkError?: boolean };

type DashboardCache = {
  today_activity?: Record<string, unknown>;
  latest_vitals?: Record<string, unknown>;
  [key: string]: unknown;
};

/** True when the check-in couldn't reach the server and was saved on the phone to upload later. */
export function wasQueued(err: unknown): boolean {
  const e = err as LogError | null;
  return !!e && ((e.status ?? 0) >= 500 || !!e.isNetworkError);
}

/**
 * Saves a daily check-in. The dashboard updates straight away; a real error (e.g. the server refused the
 * numbers) puts it back, and a network or server error saves the check-in on the phone (SyncService).
 * Messages are left to the screen, because a check-in may need the emergency guidance instead.
 */
export function useLogVitals(userId: string | null | undefined, token: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['logVitals', userId],
    ...OFFLINE_SAVE,
    mutationFn: async (payload: VitalsPayload) => {
      if (!userId) throw new Error("No user ID");

      // Longer than the other logs: saving a check-in also scores it and checks for alerts, and a
      // check-in that timed out but was saved would be uploaded a second time later.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const response = await apiFetch(`/api/health-logs/${userId}`, {
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
          const error: LogError = new Error(`Server error: ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return await response.json();
      } catch (err) {
        clearTimeout(timeoutId);
        const e = err as LogError;
        if (e.name === 'AbortError') {
          const error: LogError = new Error("Network request timed out");
          error.isNetworkError = true;
          throw error;
        }
        if (e.name === 'TypeError' || e.message?.includes('Network request failed')) {
          e.isNetworkError = true;
        }
        throw e;
      }
    },
    onMutate: async (vitals) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard', userId] });
      const previousDashboard = queryClient.getQueryData(['dashboard', userId]);

      queryClient.setQueryData(['dashboard', userId], (old: DashboardCache | undefined) => {
        if (!old) return old;
        const hasBp = vitals.systolic_bp !== null && vitals.diastolic_bp !== null;
        return {
          ...old,
          today_activity: { ...old.today_activity, vitals_logged: true },
          latest_vitals: hasBp
            ? {
                ...old.latest_vitals,
                bp: `${vitals.systolic_bp}/${vitals.diastolic_bp}`,
                ...(vitals.heart_rate_bpm !== null ? { bpm: vitals.heart_rate_bpm } : {}),
              }
            : old.latest_vitals,
        };
      });

      return { previousDashboard };
    },
    onError: (err, vitals, context) => {
      if (wasQueued(err)) {
        if (userId) queueHealthLogForSync(userId, vitals);
      } else if (context?.previousDashboard) {
        queryClient.setQueryData(['dashboard', userId], context.previousDashboard);
      }
    },
    onSettled: (data, err) => {
      if (!wasQueued(err)) {
        queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
        queryClient.invalidateQueries({ queryKey: ['trends', userId] });
      }
    },
  });
}
