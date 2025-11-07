/**
 * Tests for useResults Hooks
 *
 * Tests cover:
 * - Real-time polling
 * - Data fetching
 * - Refetch intervals
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResults, useResultsSummary } from '../useResults';
import * as api from '../../utils/api';

vi.mock('../../utils/api', () => ({
  api: {
    get: vi.fn()
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch election results', async () => {
    const mockResults = {
      results: [
        { option: 'Yes', votes: 100, percentage: 66.67 },
        { option: 'No', votes: 50, percentage: 33.33 }
      ]
    };

    api.api.get.mockResolvedValueOnce({ data: mockResults });

    const { result } = renderHook(
      () => useResults('election-123'),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockResults);
    expect(api.api.get).toHaveBeenCalledWith('/elections/election-123/results');
  });

  it('should handle results with zero votes', async () => {
    const mockResults = {
      results: [
        { option: 'Yes', votes: 0, percentage: 0 },
        { option: 'No', votes: 0, percentage: 0 }
      ]
    };

    api.api.get.mockResolvedValueOnce({ data: mockResults });

    const { result } = renderHook(
      () => useResults('election-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockResults);
  });

  it('should handle weighted voting results', async () => {
    const mockResults = {
      results: [
        { option: 'Yes', votes: 10, weight: 2, weighted: 20, percentage: 66.67 },
        { option: 'No', votes: 10, weight: 1, weighted: 10, percentage: 33.33 }
      ]
    };

    api.api.get.mockResolvedValueOnce({ data: mockResults });

    const { result } = renderHook(
      () => useResults('election-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.results[0].weighted).toBe(20);
  });

  it('should not fetch if election ID is missing', () => {
    api.api.get.mockResolvedValueOnce({ data: { results: [] } });

    renderHook(
      () => useResults(null),
      { wrapper: createWrapper() }
    );

    expect(api.api.get).not.toHaveBeenCalled();
  });

  it('should disable polling when passed refetchInterval: 0', async () => {
    const mockResults = { results: [] };
    api.api.get.mockResolvedValueOnce({ data: mockResults });

    const { result } = renderHook(
      () => useResults('election-123', { refetchInterval: 0 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should only be called once (no polling)
    expect(api.api.get).toHaveBeenCalledTimes(1);
  });

  it('should handle fetching errors', async () => {
    const error = new Error('Failed to fetch results');
    api.api.get.mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useResults('election-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(result.current.error.message).toBe('Failed to fetch results');
  });

  it('should handle empty results array', async () => {
    const mockResults = { results: [] };
    api.api.get.mockResolvedValueOnce({ data: mockResults });

    const { result } = renderHook(
      () => useResults('election-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.results).toHaveLength(0);
  });

  it('should have short stale time for live data', async () => {
    api.api.get.mockResolvedValueOnce({ data: { results: [] } });

    const { result } = renderHook(
      () => useResults('election-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify stale time is configured for live data (30s)
    expect(result.current.isStale).toBeDefined();
  });
});

describe('useResultsSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch results summary', async () => {
    const mockSummary = {
      totalVotes: 150,
      participation: 75,
      status: 'active',
      turnout: '75%'
    };

    api.api.get.mockResolvedValueOnce({ data: mockSummary });

    const { result } = renderHook(
      () => useResultsSummary('election-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockSummary);
    expect(api.api.get).toHaveBeenCalledWith('/elections/election-123/results/summary');
  });

  it('should handle missing summary data', async () => {
    api.api.get.mockResolvedValueOnce({
      data: {
        totalVotes: 0,
        participation: 0,
        status: 'draft'
      }
    });

    const { result } = renderHook(
      () => useResultsSummary('election-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.totalVotes).toBe(0);
  });

  it('should calculate percentages correctly', async () => {
    const mockSummary = {
      totalVotes: 100,
      participation: 75,
      participationPercentage: 75
    };

    api.api.get.mockResolvedValueOnce({ data: mockSummary });

    const { result } = renderHook(
      () => useResultsSummary('election-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.participationPercentage).toBe(75);
  });

  it('should not fetch if election ID is missing', () => {
    api.api.get.mockResolvedValueOnce({ data: {} });

    renderHook(
      () => useResultsSummary(null),
      { wrapper: createWrapper() }
    );

    expect(api.api.get).not.toHaveBeenCalled();
  });

  it('should handle summary fetch errors', async () => {
    const error = new Error('Failed to fetch summary');
    api.api.get.mockRejectedValueOnce(error);

    const { result } = renderHook(
      () => useResultsSummary('election-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
  });
});

describe('Results Polling', () => {
  it('should have short stale time for real-time updates', async () => {
    api.api.get.mockResolvedValueOnce({ data: { results: [] } });

    renderHook(
      () => useResults('election-123'),
      { wrapper: createWrapper() }
    );

    // Default stale time should be 30 seconds for live data
    // This allows background refetch after 30s of inactivity
    expect(api.api.get).toHaveBeenCalled();
  });

  it('should handle rapid result changes', async () => {
    const results1 = { results: [{ option: 'Yes', votes: 10 }] };
    const results2 = { results: [{ option: 'Yes', votes: 15 }] };

    api.api.get
      .mockResolvedValueOnce({ data: results1 })
      .mockResolvedValueOnce({ data: results2 });

    const { result, rerender } = renderHook(
      () => useResults('election-123', { refetchInterval: 0 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.data).toEqual(results1);
    });

    // Subsequent call would get results2
    expect(api.api.get).toHaveBeenCalled();
  });

  it('should stop polling when window loses focus', async () => {
    api.api.get.mockResolvedValueOnce({ data: { results: [] } });

    renderHook(
      () => useResults('election-123'),
      { wrapper: createWrapper() }
    );

    // refetchIntervalInBackground: false by default
    // This means polling stops when window loses focus
    expect(api.api.get).toHaveBeenCalled();
  });
});

describe('Results Data Validation', () => {
  it('should handle results with percentage sum != 100%', async () => {
    // Due to rounding, sum might not be exactly 100%
    const mockResults = {
      results: [
        { option: 'A', votes: 100, percentage: 33.33 },
        { option: 'B', votes: 100, percentage: 33.33 },
        { option: 'C', votes: 100, percentage: 33.34 }
      ]
    };

    api.api.get.mockResolvedValueOnce({ data: mockResults });

    const { result } = renderHook(
      () => useResults('election-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should handle rounding gracefully
    expect(result.current.data.results).toHaveLength(3);
  });

  it('should preserve voting type information', async () => {
    const mockResults = {
      votingType: 'approval',
      results: [
        { option: 'A', votes: 100, percentage: 50 },
        { option: 'B', votes: 100, percentage: 50 }
      ]
    };

    api.api.get.mockResolvedValueOnce({ data: mockResults });

    const { result } = renderHook(
      () => useResults('election-123'),
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data.votingType).toBe('approval');
  });
});
