/**
 * useVoters Hook
 *
 * Custom hook for fetching and managing voter data with React Query
 * Handles pagination, filtering, and sorting with intelligent caching
 *
 * Features:
 * - 3-minute stale time (volatile data)
 * - Filter and sort caching
 * - Enabled only when election selected
 * - Previous data during loading
 */

import { useQuery } from '@tanstack/react-query';
import { api } from '../utils/api';

/**
 * Fetch voters for an election
 *
 * @param {string} electionId - Election ID
 * @param {number} page - Page number
 * @param {Object} filters - Filter options (search, status, sort)
 * @returns {Object} Query result
 *
 * @example
 * const { data, isLoading } = useVoters(electionId, 1, { search: 'john' });
 */
export function useVoters(electionId, page = 1, filters = {}) {
  return useQuery({
    // Query key includes election and filters for proper isolation
    queryKey: ['voters', electionId, page, filters],

    queryFn: async () => {
      const response = await api.get(`/elections/${electionId}/voters`, {
        params: {
          page,
          ...filters
        }
      });
      return response.data;
    },

    // Voters data is volatile (has_voted status can change)
    // Shorter stale time ensures fresher data
    staleTime: 1000 * 60 * 3,         // 3 minutes

    cacheTime: 1000 * 60 * 5,         // 5 minutes

    // Only fetch if election is selected
    // Prevents unnecessary requests when no election chosen
    enabled: !!electionId,

    refetchOnWindowFocus: false,

    // Show previous data while fetching new data
    // Smooth transition when pagination changes
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Fetch a single voter
 *
 * @param {string} voterId - Voter ID
 * @returns {Object} Query result
 */
export function useVoter(voterId) {
  return useQuery({
    queryKey: ['voters', voterId],
    queryFn: async () => {
      const response = await api.get(`/voters/${voterId}`);
      return response.data;
    },
    enabled: !!voterId,
    staleTime: 1000 * 60 * 3,
    cacheTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
}

/**
 * Get voters count for an election
 *
 * @param {string} electionId - Election ID
 * @returns {Object} Query result with count
 */
export function useVotersCount(electionId) {
  return useQuery({
    queryKey: ['voters-count', electionId],
    queryFn: async () => {
      const response = await api.get(`/elections/${electionId}/voters/count`);
      return response.data;
    },
    enabled: !!electionId,
    staleTime: 1000 * 60 * 1,         // 1 minute (for real-time count)
    cacheTime: 1000 * 60 * 5,
  });
}

/**
 * Get voters who have voted
 *
 * @param {string} electionId - Election ID
 * @param {number} page - Page number
 * @returns {Object} Query result
 */
export function useVotedVoters(electionId, page = 1) {
  return useQuery({
    queryKey: ['voted-voters', electionId, page],
    queryFn: async () => {
      const response = await api.get(`/elections/${electionId}/voters`, {
        params: { page, hasVoted: true }
      });
      return response.data;
    },
    enabled: !!electionId,
    staleTime: 1000 * 60 * 1,         // 1 minute (tracking live voting)
    cacheTime: 1000 * 60 * 5,
  });
}

export default {
  useVoters,
  useVoter,
  useVotersCount,
  useVotedVoters
};
