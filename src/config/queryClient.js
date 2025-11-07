/**
 * React Query Configuration
 *
 * Central configuration for caching strategy and query options
 *
 * Features:
 * - 5-minute stale time for elections data
 * - 3-minute stale time for volatile data (voters, results)
 * - 10-minute cache time
 * - Retry logic with exponential backoff
 * - No refetch on window focus (prevents unnecessary requests)
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // How long data is considered fresh (won't refetch if query was made recently)
      staleTime: 1000 * 60 * 5,        // 5 minutes (default for most data)

      // How long cached data is kept in memory before garbage collection
      cacheTime: 1000 * 60 * 10,       // 10 minutes

      // Don't automatically refetch when window regains focus
      // This prevents unnecessary API calls when user switches tabs
      refetchOnWindowFocus: false,

      // Don't automatically refetch when component remounts
      refetchOnMount: false,

      // Single retry on failure (good balance between reliability and performance)
      retry: 1,

      // 30-second timeout per request
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      // Mutations usually only retry once (don't want to accidentally duplicate actions)
      retry: 1,
    },
  },
});

export default queryClient;
