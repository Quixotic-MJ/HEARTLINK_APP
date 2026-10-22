import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

/**
 * React Query for hook tests: no retries, and gcTime: Infinity stops React Query's 5-minute cache
 * cleanup timer from keeping Jest running after the tests finish.
 */
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false, gcTime: Infinity },
    },
  });
}

/** A `wrapper` for renderHook that provides the given client. */
export function queryClientWrapper(client: QueryClient) {
  return function QueryProvider({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
