/**
 * useResults Hook
 *
 * Custom hook for fetching and managing election results
 * Provides real-time updates with configurable refetch interval
 *
 * Features:
 * - 30-second stale time (live data)
 * - 10-second refetch interval (real-time updates)
 * - Configurable polling
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';

/**
 * Fetch election results
 *
 * @param {string} electionId - Election ID
 * @param {Object} options - Additional options
 * @param {number} options.refetchInterval - Refetch interval in ms (0 to disable)
 * @param {boolean} options.enabled - Enable/disable fetching
 * @returns {Object} Query result
 *
 * @example
 * // Real-time results with 10-second polling
 * const { data: results } = useResults(electionId);
 *
 * @example
 * // One-time fetch (no polling)
 * const { data: results } = useResults(electionId, { refetchInterval: 0 });
 */
export function useResults(electionId, options = {}) {
  const {
    refetchInterval = 1000 * 10,  // Default: refetch every 10 seconds
    enabled = true
  } = options;

  return useQuery({
    queryKey: ['results', electionId],

    queryFn: async () => {
      const response = await api.get(`/elections/${electionId}/results`);
      return response.data;
    },

    // Short stale time for live data
    staleTime: 1000 * 30,             // 30 seconds

    cacheTime: 1000 * 60 * 5,         // 5 minutes

    // Poll results every 10 seconds by default
    // This provides real-time updates while voting is happening
    refetchInterval,

    // Stop polling when window loses focus (save bandwidth)
    // Resume when focus returns
    refetchIntervalInBackground: false,

    enabled: enabled && !!electionId,

    refetchOnWindowFocus: true,       // Refetch when returning to tab
  });
}

/**
 * Fetch results summary
 *
 * @param {string} electionId - Election ID
 * @returns {Object} Query result with summary stats
 *
 * @example
 * const { data: summary } = useResultsSummary(electionId);
 * // { totalVotes: 250, participation: 75, status: 'active' }
 */
export function useResultsSummary(electionId) {
  return useQuery({
    queryKey: ['results-summary', electionId],

    queryFn: async () => {
      const response = await api.get(`/elections/${electionId}/results/summary`);
      return response.data;
    },

    // Live summary
    staleTime: 1000 * 15,              // 15 seconds

    cacheTime: 1000 * 60 * 5,

    // Poll every 5 seconds for summary
    refetchInterval: 1000 * 5,

    refetchIntervalInBackground: false,

    enabled: !!electionId,

    refetchOnWindowFocus: true,
  });
}

/**
 * Fetch detailed results (with confidence intervals, etc.)
 *
 * @param {string} electionId - Election ID
 * @returns {Object} Query result
 */
export function useDetailedResults(electionId) {
  return useQuery({
    queryKey: ['detailed-results', electionId],

    queryFn: async () => {
      const response = await api.get(`/elections/${electionId}/results/detailed`);
      return response.data;
    },

    // Less frequent updates for detailed analysis
    staleTime: 1000 * 60,              // 1 minute

    cacheTime: 1000 * 60 * 10,

    // Refetch every 30 seconds
    refetchInterval: 1000 * 30,

    refetchIntervalInBackground: false,

    enabled: !!electionId,
  });
}

/**
 * Fetch results with trend data
 *
 * @param {string} electionId - Election ID
 * @returns {Object} Query result with historical data
 */
export function useResultsTrend(electionId) {
  return useQuery({
    queryKey: ['results-trend', electionId],

    queryFn: async () => {
      const response = await api.get(`/elections/${electionId}/results/trend`);
      return response.data;
    },

    // Trend data changes slowly
    staleTime: 1000 * 60 * 2,          // 2 minutes

    cacheTime: 1000 * 60 * 10,

    // Poll less frequently for trends
    refetchInterval: 1000 * 60,        // 1 minute

    refetchIntervalInBackground: false,

    enabled: !!electionId,
  });
}

export default {
  useResults,
  useResultsSummary,
  useDetailedResults,
  useResultsTrend
};
