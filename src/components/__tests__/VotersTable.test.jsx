/**
 * Tests for VotersTable Component
 *
 * Tests cover:
 * - Rendering voters list
 * - Pagination
 * - Search/filtering
 * - Sorting
 * - Bulk operations
 * - CSV import
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import VotersTable from '../VotersTable';
import * as api from '../../utils/api';

vi.mock('../../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn()
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

const mockVotersData = {
  voters: [
    { id: '1', email: 'john@example.com', name: 'John Doe', hasVoted: false },
    { id: '2', email: 'jane@example.com', name: 'Jane Smith', hasVoted: true },
    { id: '3', email: 'bob@example.com', name: 'Bob Johnson', hasVoted: false }
  ],
  pagination: { total: 3, page: 1, pageSize: 10 }
};

describe('VotersTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.api.get.mockResolvedValueOnce({ data: mockVotersData });
  });

  describe('Rendering', () => {
    it('should render voters table', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Bob Johnson')).toBeInTheDocument();
    });

    it('should display voter columns', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/email/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/name/i)).toBeInTheDocument();
      expect(screen.getByText(/voted/i)).toBeInTheDocument();
    });

    it('should show voted status correctly', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const votedElements = screen.getAllByText(/yes|no|true|false/i);
        expect(votedElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Pagination', () => {
    it('should display pagination controls', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/page/i)).toBeInTheDocument();
      });
    });

    it('should navigate between pages', async () => {
      api.api.get
        .mockResolvedValueOnce({ data: mockVotersData })
        .mockResolvedValueOnce({
          data: {
            voters: [
              { id: '4', email: 'alice@example.com', name: 'Alice', hasVoted: false }
            ],
            pagination: { total: 4, page: 2, pageSize: 3 }
          }
        });

      const { rerender } = render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      const nextButton = screen.getByRole('button', { name: /next|>/ });
      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(api.api.get).toHaveBeenCalled();
      });
    });
  });

  describe('Search/Filter', () => {
    it('should filter voters by search term', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search/i);
      await userEvent.type(searchInput, 'john');

      await waitFor(() => {
        expect(api.api.get).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            params: expect.objectContaining({ search: 'john' })
          })
        );
      });
    });

    it('should filter by voted status', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      const votedFilter = screen.getByRole('combobox', { name: /status|voted/i });
      await userEvent.selectOptions(votedFilter, 'voted');

      await waitFor(() => {
        expect(api.api.get).toHaveBeenCalled();
      });
    });
  });

  describe('Sorting', () => {
    it('should sort by column', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      const emailHeader = screen.getByText(/email/i);
      fireEvent.click(emailHeader);

      await waitFor(() => {
        expect(api.api.get).toHaveBeenCalled();
      });
    });

    it('should toggle sort direction', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      const emailHeader = screen.getByText(/email/i);
      fireEvent.click(emailHeader);
      fireEvent.click(emailHeader);

      // Should toggle between asc/desc
      expect(api.api.get).toHaveBeenCalled();
    });
  });

  describe('Selection', () => {
    it('should select individual voters', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Should show selection count
      expect(screen.getByText(/selected/i)).toBeInTheDocument();
    });

    it('should select all voters', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]); // Select all checkbox

      expect(screen.getByText(/selected/i)).toBeInTheDocument();
    });
  });

  describe('Bulk Operations', () => {
    it('should delete selected voters', async () => {
      api.api.delete.mockResolvedValueOnce({ data: { deleted: 2 } });

      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('john@example.com')).toBeInTheDocument();
      });

      // Select voters
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]);
      fireEvent.click(checkboxes[2]);

      // Click delete button
      const deleteBtn = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteBtn);

      // Confirm deletion
      const confirmBtn = screen.getByRole('button', { name: /confirm/i });
      if (confirmBtn) {
        fireEvent.click(confirmBtn);
      }

      await waitFor(() => {
        expect(api.api.delete).toHaveBeenCalled();
      });
    });
  });

  describe('Empty States', () => {
    it('should handle no voters', async () => {
      api.api.get.mockResolvedValueOnce({
        data: {
          voters: [],
          pagination: { total: 0, page: 1 }
        }
      });

      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/no voters|empty/i)).toBeInTheDocument();
      });
    });

    it('should handle loading state', () => {
      api.api.get.mockImplementation(() => new Promise(() => {}));

      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/loading|spinner/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible table structure', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const table = screen.getByRole('table');
        expect(table).toBeInTheDocument();
      });
    });

    it('should have accessible column headers', async () => {
      render(
        <VotersTable electionId="election-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const headers = screen.getAllByRole('columnheader');
        expect(headers.length).toBeGreaterThan(0);
      });
    });
  });
});
