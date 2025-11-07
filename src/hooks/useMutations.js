/**
 * useMutations Hook
 *
 * Collection of custom hooks for mutations (create, update, delete operations)
 * Includes optimistic updates and proper cache invalidation
 *
 * Features:
 * - Optimistic updates (instant UI feedback)
 * - Automatic cache invalidation
 * - Error rollback
 * - Loading states
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../utils/api';
import { useNotification } from '../contexts/NotificationContext';

/**
 * Add a new voter to an election
 *
 * @param {string} electionId - Election ID
 * @returns {Object} Mutation object with mutate function
 *
 * @example
 * const addVoterMutation = useAddVoter(electionId);
 * addVoterMutation.mutate({ email: 'user@example.com', name: 'John' });
 */
export function useAddVoter(electionId) {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: (voterData) =>
      api.post(`/elections/${electionId}/voters`, voterData),

    // Optimistic update: show success immediately
    onMutate: async (newVoter) => {
      // Cancel any in-flight requests for voters list
      await queryClient.cancelQueries({ queryKey: ['voters', electionId] });

      // Snapshot the previous data
      const previousVoters = queryClient.getQueryData(['voters', electionId]);

      // Optimistically update the cache
      queryClient.setQueryData(['voters', electionId], (old) => {
        if (!old) return old;
        return {
          ...old,
          voters: [newVoter, ...old.voters],
          pagination: {
            ...old.pagination,
            total: old.pagination.total + 1
          }
        };
      });

      // Return context for rollback
      return { previousVoters };
    },

    // If mutation fails, revert to previous data
    onError: (err, newVoter, context) => {
      if (context?.previousVoters) {
        queryClient.setQueryData(['voters', electionId], context.previousVoters);
      }
      showNotification({
        type: 'error',
        message: 'Failed to add voter'
      });
    },

    // On success, refetch to get server data
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voters', electionId] });
      queryClient.invalidateQueries({ queryKey: ['voters-count', electionId] });
      showNotification({
        type: 'success',
        message: 'Voter added successfully'
      });
    }
  });
}

/**
 * Update a voter
 *
 * @param {string} voterId - Voter ID
 * @returns {Object} Mutation object
 */
export function useUpdateVoter(voterId) {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: (updateData) =>
      api.put(`/voters/${voterId}`, updateData),

    onMutate: async (updateData) => {
      await queryClient.cancelQueries({ queryKey: ['voters', voterId] });
      const previousVoter = queryClient.getQueryData(['voters', voterId]);

      queryClient.setQueryData(['voters', voterId], (old) => ({
        ...old,
        ...updateData
      }));

      return { previousVoter };
    },

    onError: (err, updateData, context) => {
      if (context?.previousVoter) {
        queryClient.setQueryData(['voters', voterId], context.previousVoter);
      }
      showNotification({ type: 'error', message: 'Failed to update voter' });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voters'] });
      showNotification({ type: 'success', message: 'Voter updated' });
    }
  });
}

/**
 * Delete voter
 *
 * @param {string} voterId - Voter ID
 * @returns {Object} Mutation object
 */
export function useDeleteVoter(voterId) {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: () =>
      api.delete(`/voters/${voterId}`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voters'] });
      showNotification({ type: 'success', message: 'Voter deleted' });
    },

    onError: () => {
      showNotification({ type: 'error', message: 'Failed to delete voter' });
    }
  });
}

/**
 * Bulk delete voters
 *
 * @param {string} electionId - Election ID
 * @returns {Object} Mutation object
 */
export function useBulkDeleteVoters(electionId) {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: (voterIds) =>
      api.post(`/elections/${electionId}/voters/bulk-delete`, { voterIds }),

    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['voters', electionId] });
      queryClient.invalidateQueries({ queryKey: ['voters-count', electionId] });
      showNotification({
        type: 'success',
        message: `Deleted ${data.deleted} voters`
      });
    },

    onError: () => {
      showNotification({ type: 'error', message: 'Failed to delete voters' });
    }
  });
}

/**
 * Create a new election
 *
 * @returns {Object} Mutation object
 */
export function useCreateElection() {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: (electionData) =>
      api.post('/elections', electionData),

    onSuccess: (data) => {
      // Invalidate elections list to refetch
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      queryClient.invalidateQueries({ queryKey: ['my-elections'] });
      showNotification({
        type: 'success',
        message: `Election "${data.title}" created`
      });
    },

    onError: () => {
      showNotification({ type: 'error', message: 'Failed to create election' });
    }
  });
}

/**
 * Update election
 *
 * @param {string} electionId - Election ID
 * @returns {Object} Mutation object
 */
export function useUpdateElection(electionId) {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: (updateData) =>
      api.put(`/elections/${electionId}`, updateData),

    onMutate: async (updateData) => {
      await queryClient.cancelQueries({ queryKey: ['elections', electionId] });
      const previousElection = queryClient.getQueryData(['elections', electionId]);

      queryClient.setQueryData(['elections', electionId], (old) => ({
        ...old,
        ...updateData
      }));

      return { previousElection };
    },

    onError: (err, updateData, context) => {
      if (context?.previousElection) {
        queryClient.setQueryData(['elections', electionId], context.previousElection);
      }
      showNotification({ type: 'error', message: 'Failed to update election' });
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections', electionId] });
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      showNotification({ type: 'success', message: 'Election updated' });
    }
  });
}

/**
 * Close/finish an election
 *
 * @param {string} electionId - Election ID
 * @returns {Object} Mutation object
 */
export function useCloseElection(electionId) {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: () =>
      api.post(`/elections/${electionId}/close`),

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['elections', electionId] });
      queryClient.invalidateQueries({ queryKey: ['elections'] });
      queryClient.invalidateQueries({ queryKey: ['results', electionId] });
      showNotification({ type: 'success', message: 'Election closed' });
    },

    onError: () => {
      showNotification({ type: 'error', message: 'Failed to close election' });
    }
  });
}

/**
 * Submit a vote
 *
 * @returns {Object} Mutation object
 */
export function useSubmitVote() {
  const queryClient = useQueryClient();
  const { showNotification } = useNotification();

  return useMutation({
    mutationFn: ({ token, voteData }) =>
      api.post(`/voting/${token}`, voteData),

    onSuccess: (data) => {
      // Invalidate results to refetch
      queryClient.invalidateQueries({ queryKey: ['results'] });
      queryClient.invalidateQueries({ queryKey: ['results-summary'] });
      showNotification({
        type: 'success',
        message: 'Vote submitted successfully'
      });
    },

    onError: (error) => {
      const message = error.response?.data?.message || 'Failed to submit vote';
      showNotification({ type: 'error', message });
    }
  });
}

export default {
  useAddVoter,
  useUpdateVoter,
  useDeleteVoter,
  useBulkDeleteVoters,
  useCreateElection,
  useUpdateElection,
  useCloseElection,
  useSubmitVote
};
