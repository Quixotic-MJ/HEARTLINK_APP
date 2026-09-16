import { useMutation, useQueryClient } from '@tanstack/react-query';
import { MealPayload } from '../services/MealLoggingService';
import { useToast } from '../contexts/ToastContext';
import { postLogAck } from '../services/companionCopy';
import { useNetInfo } from '@react-native-community/netinfo';

const base_url = process.env.EXPO_PUBLIC_API_URL;

export function useLogMeal(userId: string | null | undefined, token: string | null) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const netInfo = useNetInfo();

  return useMutation({
    mutationKey: ['logMeal', userId],
    mutationFn: async (payload: MealPayload) => {
      if (!userId) throw new Error("No user ID");
      
      const response = await fetch(`${base_url}/api/meals/${userId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to log meal to server");
      }
      return response.json();
    },
    // When mutate is called:
    onMutate: async (newMeal) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['dashboard', userId] });

      // Snapshot the previous value
      const previousDashboard = queryClient.getQueryData(['dashboard', userId]);

      // Optimistically update to the new value
      queryClient.setQueryData(['dashboard', userId], (old: any) => {
        if (!old) return old;
        
        const prevTotal = old.nutrition_budget?.sodium?.consumed_mg ?? old.today_activity?.total_sodium_mg ?? 0;
        const newTotal = prevTotal + newMeal.sodium_mg;
        const newMealsCount = (old.today_activity?.meals_count || 0) + 1;

        return {
          ...old,
          nutrition_budget: old.nutrition_budget ? {
            ...old.nutrition_budget,
            sodium: { ...old.nutrition_budget.sodium, consumed_mg: newTotal }
          } : undefined,
          today_activity: old.today_activity ? {
            ...old.today_activity,
            total_sodium_mg: newTotal,
            meals_count: newMealsCount
          } : undefined
        };
      });

      // Show the optimistic success toast (differentiate based on network status)
      const isOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
      
      // Calculate running total for the toast
      let runningTotal = newMeal.sodium_mg;
      if (previousDashboard) {
        const prevData = previousDashboard as any;
        const prevTotal = prevData.nutrition_budget?.sodium?.consumed_mg ?? prevData.today_activity?.total_sodium_mg ?? 0;
        runningTotal = prevTotal + newMeal.sodium_mg;
      }

      if (isOffline) {
        showToast({
          ...postLogAck(
            "meal",
            `Saved offline. Added ${Math.round(newMeal.sodium_mg)}mg. You're at ${Math.round(runningTotal).toLocaleString()} of 2,000mg.`
          ),
          type: "info",
          duration: 5500,
        });
      } else {
        showToast({
          ...postLogAck(
            "meal",
            `${Math.round(newMeal.sodium_mg)}mg sodium. You're at ${Math.round(runningTotal).toLocaleString()} of your 2,000mg budget today.`
          ),
          type: "success",
          duration: 5500,
        });
      }

      // Return a context object with the snapshotted value
      return { previousDashboard };
    },
    // If the mutation fails, use the context returned from onMutate to roll back
    onError: (err, newMeal, context) => {
      if (context?.previousDashboard) {
        queryClient.setQueryData(['dashboard', userId], context.previousDashboard);
      }
      // Note: React Query's default offline persister will catch network errors
      // and queue them. So this onError is truly for SERVER errors (e.g. 500)
      showToast({
        title: "Error logging meal",
        message: "Failed to log meal. Please try again.",
        type: "error",
      });
    },
    // Always refetch after error or success to make sure we're in sync
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
    },
  });
}
