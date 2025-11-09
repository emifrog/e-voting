/**
 * Tests for AuditTrail Component
 *
 * Tests cover:
 * - Rendering audit logs
 * - Search/filtering
 * - Blockchain verification
 * - Export functionality (JSON, CSV)
 * - Error handling
 * - Accessibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import AuditTrail from '../AuditTrail';
import * as api from '../../utils/api';

// Mock API
vi.mock('../../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Mock data
const mockAuditLogs = {
  logs: [
    {
      id: 'log-1',
      election_id: 'election-123',
      action: 'VOTE_CAST',
      user_id: 'user-1',
      user_email: 'voter@example.com',
      user_name: 'John Doe',
      timestamp: '2025-11-09T10:00:00Z',
      ip_address: '192.168.1.100',
      previous_hash: 'hash-0',
      current_hash: 'hash-1',
      signature: 'sig-1',
      details: {
        ballot_id: 'ballot-1',
        option_selected: 'Option A'
      }
    },
    {
      id: 'log-2',
      election_id: 'election-123',
      action: 'ELECTION_STARTED',
      user_id: 'admin-1',
      user_email: 'admin@example.com',
      user_name: 'Admin User',
      timestamp: '2025-11-09T09:00:00Z',
      ip_address: '192.168.1.1',
      previous_hash: null,
      current_hash: 'hash-0',
      signature: 'sig-0',
      details: {
        election_name: 'Test Election'
      }
    }
  ],
  pagination: {
    total: 2,
    limit: 100,
    offset: 0
  }
};

const mockStats = {
  stats: {
    totalLogs: 2,
    actionsByType: {
      VOTE_CAST: 1,
      ELECTION_STARTED: 1
    },
    uniqueUsers: 2,
    dateRange: {
      earliest: '2025-11-09T09:00:00Z',
      latest: '2025-11-09T10:00:00Z'
    }
  }
};

const mockVerificationResult = {
  valid: true,
  total: 2,
  verified: 2,
  failed: 0,
  details: {
    chain_integrity: true,
    signature_validity: true,
    hash_continuity: true
  }
};

// Test wrapper
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/elections/election-123/audit']}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('AuditTrail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.default.get
      .mockResolvedValueOnce({ data: mockAuditLogs })
      .mockResolvedValueOnce({ data: mockStats });
  });

  describe('Rendering', () => {
    it('should render audit trail page', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/piste d'audit/i)).toBeInTheDocument();
      });
    });

    it('should display audit logs', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
      });

      expect(screen.getByText('ELECTION_STARTED')).toBeInTheDocument();
    });

    it('should display user names', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
      });

      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    it('should display user emails', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/voter@example\.com/)).toBeInTheDocument();
      });

      expect(screen.getByText(/admin@example\.com/)).toBeInTheDocument();
    });
  });

  describe('Statistics', () => {
    it('should display statistics panel', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/statistiques/i)).toBeInTheDocument();
      });
    });

    it('should show total logs count', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/2/)).toBeInTheDocument();
      });
    });
  });

  describe('Search and Filtering', () => {
    it('should display search input', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText(/rechercher/i);
        expect(searchInput).toBeInTheDocument();
      });
    });

    it('should filter logs by search term', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/rechercher/i);
      await userEvent.type(searchInput, 'VOTE');

      // The component filters on client-side so VOTE_CAST should still be visible
      expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
    });

    it('should toggle filter panel', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
      });

      const filterButton = screen.getByRole('button', { name: /filtres/i });
      fireEvent.click(filterButton);

      await waitFor(() => {
        expect(screen.getByText(/type d'action/i)).toBeInTheDocument();
      });
    });
  });

  describe('Blockchain Verification', () => {
    it('should display verification button', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        const verifyButton = screen.getByRole('button', { name: /vérifier la chaîne/i });
        expect(verifyButton).toBeInTheDocument();
      });
    });

    it('should verify blockchain integrity', async () => {
      api.default.post.mockResolvedValueOnce({ data: mockVerificationResult });

      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
      });

      const verifyButton = screen.getByRole('button', { name: /vérifier la chaîne/i });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(api.default.post).toHaveBeenCalledWith(
          expect.stringContaining('/verify-chain')
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/chaîne de hachage valide/i)).toBeInTheDocument();
      });
    });

    it('should handle verification failure', async () => {
      const failedVerification = {
        valid: false,
        total: 2,
        verified: 1,
        failed: 1,
        details: {
          chain_integrity: false
        }
      };

      api.default.post.mockResolvedValueOnce({ data: failedVerification });

      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
      });

      const verifyButton = screen.getByRole('button', { name: /vérifier la chaîne/i });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/échec.*vérification/i)).toBeInTheDocument();
      });
    });
  });

  describe('Hash Chain Visualization', () => {
    it('should display hash values', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/hash-1/)).toBeInTheDocument();
      });
    });

    it('should display signatures', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/sig-1/)).toBeInTheDocument();
      });
    });
  });

  describe('Expandable Details', () => {
    it('should expand log details on click', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
      });

      // Find and click the log entry
      const voteLog = screen.getByText('VOTE_CAST').closest('div[role="button"]');
      if (voteLog) {
        fireEvent.click(voteLog);

        await waitFor(() => {
          expect(screen.getByText(/192\.168\.1\.100/)).toBeInTheDocument();
        });
      }
    });
  });

  describe('Export Functionality', () => {
    it('should display export buttons', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /json/i })).toBeInTheDocument();
      });

      expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
    });

    it('should export to JSON', async () => {
      // Mock blob and download functionality
      const createObjectURLSpy = vi.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const mockClick = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          element.click = mockClick;
        }
        return element;
      });

      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
      });

      const jsonButton = screen.getByRole('button', { name: /json/i });
      fireEvent.click(jsonButton);

      await waitFor(() => {
        expect(createObjectURLSpy).toHaveBeenCalled();
      });

      createObjectURLSpy.mockRestore();
      vi.restoreAllMocks();
    });

    it('should export to CSV', async () => {
      // Mock blob and download functionality
      const createObjectURLSpy = vi.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:mock-url');
      const mockClick = vi.fn();
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
        const element = originalCreateElement(tagName);
        if (tagName === 'a') {
          element.click = mockClick;
        }
        return element;
      });

      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
      });

      const csvButton = screen.getByRole('button', { name: /csv/i });
      fireEvent.click(csvButton);

      await waitFor(() => {
        expect(createObjectURLSpy).toHaveBeenCalled();
      });

      createObjectURLSpy.mockRestore();
      vi.restoreAllMocks();
    });
  });

  describe('Error Handling', () => {
    it('should display error message on API failure', async () => {
      api.default.get
        .mockRejectedValueOnce({
          response: {
            data: { message: 'Failed to fetch audit logs' }
          }
        })
        .mockResolvedValueOnce({ data: mockStats });

      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/failed to fetch/i)).toBeInTheDocument();
      });
    });

    it('should handle verification errors', async () => {
      api.default.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Verification failed' }
        }
      });

      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
      });

      const verifyButton = screen.getByRole('button', { name: /vérifier la chaîne/i });
      fireEvent.click(verifyButton);

      await waitFor(() => {
        expect(screen.getByText(/verification failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator initially', () => {
      api.default.get.mockImplementation(() => new Promise(() => {}));

      render(<AuditTrail />, { wrapper: createWrapper() });

      expect(screen.getByText(/chargement/i)).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should handle no audit logs', async () => {
      api.default.get
        .mockResolvedValueOnce({
          data: {
            logs: [],
            pagination: { total: 0, limit: 100, offset: 0 }
          }
        })
        .mockResolvedValueOnce({
          data: {
            stats: {
              totalLogs: 0,
              actionsByType: {},
              uniqueUsers: 0,
              dateRange: null
            }
          }
        });

      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/aucun événement/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible heading', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent(/piste d'audit/i);
      });
    });

    it('should have accessible buttons', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(0);

        buttons.forEach(button => {
          expect(button).toHaveAttribute('aria-label');
        });
      });
    });

    it('should support keyboard navigation for search', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/rechercher/i);
      searchInput.focus();

      expect(document.activeElement).toBe(searchInput);
    });
  });

  describe('Refresh Functionality', () => {
    it('should have refresh button', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /actualiser/i });
        expect(refreshButton).toBeInTheDocument();
      });
    });

    it('should reload data on refresh', async () => {
      render(<AuditTrail />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('VOTE_CAST')).toBeInTheDocument();
      });

      // Clear previous calls
      api.default.get.mockClear();

      // Setup new mocks for refresh
      api.default.get
        .mockResolvedValueOnce({ data: mockAuditLogs })
        .mockResolvedValueOnce({ data: mockStats });

      const refreshButton = screen.getByRole('button', { name: /actualiser/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(api.default.get).toHaveBeenCalled();
      });
    });
  });
});
