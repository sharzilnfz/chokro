// queryClient.ts: the single shared TanStack Query client for the whole app, so
// every hook shares the same cache, staleness, and retry policy.

import { QueryClient } from '@tanstack/react-query';

// Defaults tuned for mobile: short staleness and no window-focus refetching.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 2,
      refetchOnWindowFocus: false, // Not relevant for mobile
    },
  },
});
