import { QueryClient } from "@tanstack/react-query";

// HL-035: the one cache for data the portal loads (replaces api.js's hand-made Map). Data counts as fresh for
// 30 seconds, a failed load is retried once, and screens refresh when the tab gets focus again. Polling
// (refetchInterval) pauses while the tab is hidden.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});
