import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";
import type { ScreeningAnswers, ScreeningStatus } from "../constants/exerciseScreening";

/** HL-093: saves the safety check, or that a professional cleared the patient. The dashboard carries the result. */
export function useExerciseScreening() {
  const { userId } = useUser();
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["dashboard", userId] });

  const save = useMutation({
    mutationFn: async (answers: ScreeningAnswers): Promise<ScreeningStatus> => {
      // HL-122: the PAR-Q+ result goes at the top level. Wrapped in `answers` it reads as the old
      // 5-question check (yes/no values only) and the server refuses it with 422.
      const res = await apiFetch(`/api/users/${userId}/exercise-screening`, {
        method: "PUT",
        body: JSON.stringify(answers),
      });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    onSuccess: refresh,
  });

  const clear = useMutation({
    mutationFn: async (): Promise<ScreeningStatus> => {
      const res = await apiFetch(`/api/users/${userId}/exercise-screening/clear`, { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      return res.json();
    },
    onSuccess: refresh,
  });

  return { save, clear };
}
