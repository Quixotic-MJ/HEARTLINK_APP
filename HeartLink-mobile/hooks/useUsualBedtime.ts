import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useUser } from "../contexts/UserContext";
import { usualBedtime } from "../services/remindersService";

// HL-161: the person's usual bedtime ("HH:MM") from their recent sleep logs, to suggest a bedtime reminder. Null until
// they have logged at least 3 nights with a bedtime, or when the logs can't be loaded (the suggestion is optional).

interface SleepLog {
  bedtime?: string | null;
  logged_at?: string | null;
}

export function useUsualBedtime() {
  const { userId } = useUser();
  return useQuery({
    queryKey: ["usualBedtime", userId],
    enabled: !!userId,
    staleTime: 60 * 60 * 1000,
    queryFn: async (): Promise<string | null> => {
      const res = await apiFetch(`/api/sleep-logs/${userId}`);
      if (!res.ok) return null;
      const logs = (await res.json()) as SleepLog[];
      const newestFirst = [...(Array.isArray(logs) ? logs : [])].sort((a, b) =>
        String(b.bedtime ?? b.logged_at ?? "").localeCompare(String(a.bedtime ?? a.logged_at ?? ""))
      );
      return usualBedtime(newestFirst.map((l) => l.bedtime));
    },
  });
}
