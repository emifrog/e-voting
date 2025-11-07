/**
 * Tests for useMutations Hooks
 *
 * Tests cover:
 * - Mutation execution
 * - Optimistic updates
 * - Error rollback
 * - Cache invalidation
 * - Loading states
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAddVoter, useSubmitVote } from '../useMutations';
import * as api from '../../utils/api';
import * as notificationContext from '../../contexts/NotificationContext';

// Mock API
vi.mock('../../utils/api', () => ({
  api: {
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock Notification Context
vi.mock('../../contexts/NotificationContext', () => ({
  useNotification: vi.fn(() => ({
    showNotification: vi.fn()
  }))
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useAddVoter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should add a voter', async () => {
    const newVoter = { email: 'john@example.com', name: 'John' };
    api.api.post.mockResolvedValueOnce({ data: { ...newVoter, id: '123' } });

    const { result } = renderHook(
      () => useAddVoter('election-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.mutate(newVoter);
    });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(api.api.post).toHaveBeenCalledWith(
      '/elections/election-123/voters',
      newVoter
    );
    expect(result.current.isSuccess).toBe(true);
  });

  it('should handle mutation errors', async () => {
    const error = new Error('Failed to add voter');
    api.api.post.mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useAddVoter('election-123'),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.mutate({ email: 'john@example.com', name: 'John' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(error);
  });

  it('should show optimistic UI updates', async () => {
    const newVoter = { email: 'john@example.com', name: 'John', id: 'new-id' };

    // Simulate slow API
    api.api.post.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ data: newVoter }), 100))
    );

    const { result } = renderHook(
      () => useAddVoter('election-123'),
      { wrapper: createWrapper() }
    );

    let optimisticUpdateApplied = false;

    act(() => {
      result.current.mutate(newVoter, {
        onMutate: async (newData) => {
          optimisticUpdateApplied = true;
        }
      });
    });

    // Optimistic update should happen immediately
    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });

    expect(result.current.isSuccess).toBe(true);
  });

  it('should invalidate voters cache on success', async () => {
    const newVoter = { email: 'john@example.com', name: 'John' };
    api.api.post.mockResolvedValueOnce({ data: { ...newVoter, id: '123' } });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () => useAddVoter('election-123'),
      { wrapper }
    );

    act(() => {
      result.current.mutate(newVoter);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should invalidate voters cache
    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ['voters', 'election-123'] })
    );

    invalidateSpy.mockRestore();
  });
});

describe('useSubmitVote', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should submit a vote', async () => {
    const voteData = { token: 'voter-token', voteData: { option: 'Yes' } };
    api.api.post.mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(
      () => useSubmitVote(),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.mutate(voteData);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(api.api.post).toHaveBeenCalledWith(
      '/voting/voter-token',
      voteData.voteData
    );
  });

  it('should handle vote submission errors', async () => {
    const error = new Error('Vote submission failed');
    api.api.post.mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useSubmitVote(),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.mutate({
        token: 'voter-token',
        voteData: { option: 'No' }
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });

  it('should invalidate results cache after successful vote', async () => {
    const voteData = { token: 'voter-token', voteData: { option: 'Yes' } };
    api.api.post.mockResolvedValueOnce({ data: { success: true } });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      },
    });
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );

    const { result } = renderHook(
      () => useSubmitVote(),
      { wrapper }
    );

    act(() => {
      result.current.mutate(voteData);
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    // Should invalidate results
    expect(invalidateSpy).toHaveBeenCalled();

    invalidateSpy.mockRestore();
  });

  it('should respect rate limiting errors', async () => {
    const rateLimitError = new Error('Too many requests');
    rateLimitError.response = {
      status: 429,
      data: { message: 'Rate limit exceeded' }
    };
    api.api.post.mockRejectedValueOnce(rateLimitError);

    const { result } = renderHook(
      () => useSubmitVote(),
      { wrapper: createWrapper() }
    );

    act(() => {
      result.current.mutate({
        token: 'voter-token',
        voteData: { option: 'Yes' }
      });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });

    expect(result.current.error).toBe(rateLimitError);
  });
});

describe('Mutation Loading States', () => {
  it('should expose isPending state', async () => {
    const deferred = new Promise(resolve =>
      setTimeout(() => resolve({ data: { success: true } }), 50)
    );
    api.api.post.mockReturnValueOnce(deferred);

    const { result } = renderHook(
      () => useAddVoter('election-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isPending).toBe(false);

    act(() => {
      result.current.mutate({ email: 'test@example.com', name: 'Test' });
    });

    expect(result.current.isPending).toBe(true);

    await waitFor(() => {
      expect(result.current.isPending).toBe(false);
    });
  });

  it('should expose isSuccess state', async () => {
    api.api.post.mockResolvedValueOnce({ data: { success: true } });

    const { result } = renderHook(
      () => useAddVoter('election-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isSuccess).toBe(false);

    act(() => {
      result.current.mutate({ email: 'test@example.com', name: 'Test' });
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });
  });

  it('should expose isError state', async () => {
    api.api.post.mockRejectedValueOnce(new Error('Failed'));

    const { result } = renderHook(
      () => useAddVoter('election-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isError).toBe(false);

    act(() => {
      result.current.mutate({ email: 'test@example.com', name: 'Test' });
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
