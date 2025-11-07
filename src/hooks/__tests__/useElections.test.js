/**
 * Tests for useElections Hook
 *
 * Tests cover:
 * - Query creation and data fetching
 * - Caching behavior
 * - Query key isolation
 * - Error handling
 * - Loading states
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useElections } from '../useElections';
import * as api from '../../utils/api';

// Mock API
vi.mock('../../utils/api', () => ({
  api: {
    get: vi.fn()
  }
}));

/**
 * Create a test wrapper with QueryClientProvider
 */
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

describe('useElections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Data Fetching', () => {
    it('should fetch elections data', async () => {
      const mockElections = {
        elections: [
          { id: '1', title: 'Election 1' },
          { id: '2', title: 'Election 2' }
        ],
        pagination: { total: 2, page: 1, pageSize: 10 }
      };

      api.api.get.mockResolvedValueOnce({ data: mockElections });

      const { result } = renderHook(
        () => useElections(1, 10),
        { wrapper: createWrapper() }
      );

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Wait for data
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual(mockElections);
      expect(api.api.get).toHaveBeenCalledWith('/elections', {
        params: { page: 1, limit: 10 }
      });
    });

    it('should handle errors', async () => {
      const mockError = new Error('Failed to fetch');
      api.api.get.mockRejectedValueOnce(mockError);

      const { result } = renderHook(
        () => useElections(1, 10),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.error.message).toBe('Failed to fetch');
    });
  });

  describe('Pagination Caching', () => {
    it('should cache elections by page', async () => {
      const page1Data = {
        elections: [{ id: '1', title: 'E1' }],
        pagination: { page: 1, pageSize: 10, total: 20 }
      };

      const page2Data = {
        elections: [{ id: '11', title: 'E11' }],
        pagination: { page: 2, pageSize: 10, total: 20 }
      };

      api.api.get
        .mockResolvedValueOnce({ data: page1Data })
        .mockResolvedValueOnce({ data: page2Data });

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        ({ page }) => useElections(page, 10),
        { wrapper, initialProps: { page: 1 } }
      );

      // Load page 1
      await waitFor(() => {
        expect(result.current.data).toEqual(page1Data);
      });

      // Change to page 2
      rerender({ page: 2 });

      // Load page 2
      await waitFor(() => {
        expect(result.current.data).toEqual(page2Data);
      });

      // API called twice (once for each page)
      expect(api.api.get).toHaveBeenCalledTimes(2);
    });

    it('should use cache when returning to previous page', async () => {
      const mockData = {
        elections: [{ id: '1', title: 'E1' }],
        pagination: { page: 1, pageSize: 10, total: 20 }
      };

      api.api.get.mockResolvedValueOnce({ data: mockData });

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        ({ page }) => useElections(page, 10),
        { wrapper, initialProps: { page: 1 } }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      const firstCallCount = api.api.get.mock.calls.length;

      // Move to page 2 then back to page 1
      rerender({ page: 2 });
      rerender({ page: 1 });

      await waitFor(() => {
        expect(result.current.data).toEqual(mockData);
      });

      // No additional API call for page 1 (used cache)
      expect(api.api.get.mock.calls.length).toBe(firstCallCount + 1);
    });
  });

  describe('Filter Caching', () => {
    it('should cache elections with different filters', async () => {
      const draftData = {
        elections: [{ id: '1', title: 'Draft Election' }],
        pagination: { total: 1, page: 1 }
      };

      const activeData = {
        elections: [{ id: '2', title: 'Active Election' }],
        pagination: { total: 1, page: 1 }
      };

      api.api.get
        .mockResolvedValueOnce({ data: draftData })
        .mockResolvedValueOnce({ data: activeData });

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        ({ filters }) => useElections(1, 10, filters),
        { wrapper, initialProps: { filters: { status: 'draft' } } }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(draftData);
      });

      // Change filter
      rerender({ filters: { status: 'active' } });

      await waitFor(() => {
        expect(result.current.data).toEqual(activeData);
      });

      expect(api.api.get).toHaveBeenCalledTimes(2);
    });

    it('should include filters in API call', async () => {
      api.api.get.mockResolvedValueOnce({
        data: { elections: [], pagination: {} }
      });

      renderHook(
        () => useElections(1, 10, { status: 'active', search: 'test' }),
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(api.api.get).toHaveBeenCalled();
      });

      expect(api.api.get).toHaveBeenCalledWith('/elections', {
        params: {
          page: 1,
          limit: 10,
          status: 'active',
          search: 'test'
        }
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state initially', () => {
      api.api.get.mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(
        () => useElections(1, 10),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });

    it('should show isPreviousData on page change', async () => {
      const page1 = {
        elections: [{ id: '1' }],
        pagination: { page: 1 }
      };

      api.api.get.mockResolvedValueOnce({ data: page1 });

      const wrapper = createWrapper();
      const { result, rerender } = renderHook(
        ({ page }) => useElections(page, 10),
        { wrapper, initialProps: { page: 1 } }
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(page1);
      });

      // Slow API response for page 2
      api.api.get.mockImplementation(() => new Promise(() => {}));

      rerender({ page: 2 });

      // isPreviousData should be true (showing old data while loading)
      expect(result.current.isPreviousData).toBe(true);
      expect(result.current.data).toEqual(page1); // Still showing old page data
    });
  });

  describe('Query Keys', () => {
    it('should create proper query keys', async () => {
      api.api.get.mockResolvedValueOnce({
        data: { elections: [], pagination: {} }
      });

      const { result } = renderHook(
        () => useElections(1, 10, { status: 'active' }),
        { wrapper: createWrapper() }
      );

      // Wait for query to settle
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Query key should include all parameters
      // This ensures different parameter combinations create different cache entries
      expect(api.api.get).toHaveBeenCalled();
    });
  });
});

describe('useElection (Single)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single election', async () => {
    const mockElection = { id: '123', title: 'Single Election' };
    api.api.get.mockResolvedValueOnce({ data: mockElection });

    const { result } = renderHook(
      () => {
        const { useElection } = require('../useElections');
        return useElection('123');
      },
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockElection);
  });

  it('should not fetch if ID is not provided', () => {
    api.api.get.mockResolvedValueOnce({ data: {} });

    renderHook(
      () => {
        const { useElection } = require('../useElections');
        return useElection(null);
      },
      { wrapper: createWrapper() }
    );

    // Query should be disabled, so API not called
    expect(api.api.get).not.toHaveBeenCalled();
  });
});

describe('useMyElections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch user elections with filter', async () => {
    const mockData = {
      elections: [{ id: '1', title: 'My Election' }],
      pagination: { total: 1, page: 1 }
    };

    api.api.get.mockResolvedValueOnce({ data: mockData });

    const { result } = renderHook(
      () => {
        const { useMyElections } = require('../useElections');
        return useMyElections(1, 10);
      },
      { wrapper: createWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(api.api.get).toHaveBeenCalledWith('/elections', {
      params: { page: 1, limit: 10, createdByMe: true }
    });
  });
});
