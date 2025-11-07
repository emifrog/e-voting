/**
 * useElections Hook
 *
 * Custom hook for fetching and caching election data with React Query
 * Provides intelligent caching and background refetching
 *
 * Features:
 * - Automatic caching (5-minute stale time)
 * - Query key management for filtering
 * - Error handling
 * - Loading states
 * - isPreviousData for smooth pagination
 */

import { useQuery } from '@tanstack/react-query';
import api from '../utils/api';

/**
 * Fetch elections list with optional filters
 *
 * @param {number} page - Page number (1-indexed)
 * @param {number} limit - Items per page
 * @param {Object} filters - Filter options (status, search, sort, direction)
 * @returns {Object} Query result with data, isLoading, error, etc.
 *
 * @example
 * const { data, isLoading, error } = useElections(1, 10, { status: 'active' });
 */
export function useElections(page = 1, limit = 10, filters = {}) {
  return useQuery({
    // Query key includes all parameters for proper cache isolation
    // Same filters = cache hit, different filters = new request
    queryKey: ['elections', page, limit, filters],

    // Function that fetches the data
    queryFn: async () => {
      const response = await api.get('/elections', {
        params: {
          page,
          limit,
          ...filters
        }
      });
      return response.data;
    },

    // How long data is considered fresh (won't refetch if query made recently)
    staleTime: 1000 * 60 * 5,        // 5 minutes

    // How long cached data is kept in memory
    cacheTime: 1000 * 60 * 10,       // 10 minutes

    // Don't refetch when window regains focus
    refetchOnWindowFocus: false,

    // Enable placeholders for smooth pagination transitions
    // Shows previous data while fetching new data
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Get a single election by ID
 *
 * @param {string} electionId - Election ID
 * @returns {Object} Query result
 *
 * @example
 * const { data: election } = useElection('election-123');
 */
export function useElection(electionId) {
  return useQuery({
    queryKey: ['elections', electionId],
    queryFn: async () => {
      const response = await api.get(`/elections/${electionId}`);
      return response.data;
    },
    enabled: !!electionId,            // Only fetch if ID is provided
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

/**
 * Get elections created by current user
 *
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Object} Query result
 */
export function useMyElections(page = 1, limit = 10) {
  return useQuery({
    queryKey: ['my-elections', page, limit],
    queryFn: async () => {
      const response = await api.get('/elections', {
        params: { page, limit, createdByMe: true }
      });
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
    cacheTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
}

export default {
  useElections,
  useElection,
  useMyElections
};
