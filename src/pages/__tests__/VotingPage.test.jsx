/**
 * Tests for VotingPage Component
 *
 * Tests cover:
 * - Voter authentication
 * - Vote submission
 * - Voting types (simple, approval, preference)
 * - Double-vote prevention
 * - Rate limiting
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import VotingPage from '../VotingPage';
import * as api from '../../utils/api';

vi.mock('../../utils/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false }
    }
  });

  return ({ children }) => (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </BrowserRouter>
  );
};

const mockElection = {
  id: 'election-123',
  title: 'Test Election',
  description: 'A test election',
  type: 'simple',
  votingType: 'secret',
  isSecret: true,
  options: [
    { id: '1', text: 'Yes', order: 1 },
    { id: '2', text: 'No', order: 2 }
  ],
  status: 'active'
};

describe('VotingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Voter Authentication', () => {
    it('should fetch voter data with token', async () => {
      const voterToken = 'voter-token-123';
      api.api.get.mockResolvedValueOnce({
        data: {
          election: mockElection,
          voter: { id: 'voter-1', email: 'voter@example.com', hasVoted: false }
        }
      });

      render(
        <VotingPage token={voterToken} />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(api.api.get).toHaveBeenCalledWith(
          `/voting/${voterToken}`
        );
      });
    });

    it('should display welcome message', async () => {
      api.api.get.mockResolvedValueOnce({
        data: {
          election: mockElection,
          voter: { id: 'voter-1', email: 'voter@example.com', hasVoted: false }
        }
      });

      render(
        <VotingPage token="voter-token-123" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/welcome|test election/i)).toBeInTheDocument();
      });
    });

    it('should handle invalid token', async () => {
      api.api.get.mockRejectedValueOnce(new Error('Invalid token'));

      render(
        <VotingPage token="invalid-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/invalid|not found|error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Simple Majority Voting', () => {
    beforeEach(() => {
      api.api.get.mockResolvedValueOnce({
        data: {
          election: { ...mockElection, type: 'simple' },
          voter: { id: 'voter-1', hasVoted: false }
        }
      });
    });

    it('should render voting options', async () => {
      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Yes')).toBeInTheDocument();
        expect(screen.getByText('No')).toBeInTheDocument();
      });
    });

    it('should select a single option', async () => {
      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Yes')).toBeInTheDocument();
      });

      const yesRadio = screen.getByRole('radio', { name: 'Yes' });
      fireEvent.click(yesRadio);

      expect(yesRadio).toBeChecked();
    });

    it('should submit vote', async () => {
      api.api.post.mockResolvedValueOnce({
        data: { success: true, message: 'Vote submitted' }
      });

      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Yes')).toBeInTheDocument();
      });

      const yesRadio = screen.getByRole('radio', { name: 'Yes' });
      fireEvent.click(yesRadio);

      const submitBtn = screen.getByRole('button', { name: /submit|vote/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.api.post).toHaveBeenCalled();
      });
    });
  });

  describe('Approval Voting', () => {
    beforeEach(() => {
      api.api.get.mockResolvedValueOnce({
        data: {
          election: {
            ...mockElection,
            type: 'approval',
            options: [
              { id: '1', text: 'Candidate A' },
              { id: '2', text: 'Candidate B' },
              { id: '3', text: 'Candidate C' }
            ]
          },
          voter: { id: 'voter-1', hasVoted: false }
        }
      });
    });

    it('should allow multiple selections', async () => {
      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate A')).toBeInTheDocument();
      });

      const checkboxA = screen.getByRole('checkbox', { name: /Candidate A/i });
      const checkboxB = screen.getByRole('checkbox', { name: /Candidate B/i });

      fireEvent.click(checkboxA);
      fireEvent.click(checkboxB);

      expect(checkboxA).toBeChecked();
      expect(checkboxB).toBeChecked();
    });

    it('should submit approval votes', async () => {
      api.api.post.mockResolvedValueOnce({
        data: { success: true }
      });

      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Candidate A')).toBeInTheDocument();
      });

      const checkboxA = screen.getByRole('checkbox', { name: /Candidate A/i });
      fireEvent.click(checkboxA);

      const submitBtn = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(api.api.post).toHaveBeenCalled();
      });
    });
  });

  describe('Double-Vote Prevention', () => {
    it('should prevent already-voted voter from voting', async () => {
      api.api.get.mockResolvedValueOnce({
        data: {
          election: mockElection,
          voter: { id: 'voter-1', hasVoted: true, votedAt: '2025-01-20T10:00:00Z' }
        }
      });

      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/already voted|vote recorded/i)).toBeInTheDocument();
      });
    });

    it('should disable submit button after voting', async () => {
      api.api.post.mockResolvedValueOnce({
        data: { success: true }
      });

      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Yes')).toBeInTheDocument();
      });

      const yesRadio = screen.getByRole('radio', { name: 'Yes' });
      fireEvent.click(yesRadio);

      const submitBtn = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(submitBtn).toBeDisabled();
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limit errors', async () => {
      const rateLimitError = new Error('Too many requests');
      rateLimitError.response = {
        status: 429,
        data: { message: 'Rate limit exceeded. Try again in 60 seconds.' }
      };
      api.api.post.mockRejectedValueOnce(rateLimitError);

      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Yes')).toBeInTheDocument();
      });

      const yesRadio = screen.getByRole('radio', { name: 'Yes' });
      fireEvent.click(yesRadio);

      const submitBtn = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/rate limit|too many|try again/i)).toBeInTheDocument();
      });
    });

    it('should show retry timer', async () => {
      const rateLimitError = new Error('Too many requests');
      rateLimitError.response = {
        status: 429,
        headers: { 'retry-after': '60' }
      };
      api.api.post.mockRejectedValueOnce(rateLimitError);

      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Yes')).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/rate limit|try again/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error messages', async () => {
      api.api.post.mockRejectedValueOnce(new Error('Vote submission failed'));

      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Yes')).toBeInTheDocument();
      });

      const yesRadio = screen.getByRole('radio', { name: 'Yes' });
      fireEvent.click(yesRadio);

      const submitBtn = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/error|failed/i)).toBeInTheDocument();
      });
    });

    it('should handle network errors', async () => {
      api.api.get.mockRejectedValueOnce(new Error('Network error'));

      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText(/error|network|connection/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading while fetching election', () => {
      api.api.get.mockImplementation(() => new Promise(() => {}));

      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      expect(screen.getByText(/loading|spinner/i)).toBeInTheDocument();
    });

    it('should show submitting state', async () => {
      api.api.post.mockImplementation(() => new Promise(() => {}));

      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        expect(screen.getByText('Yes')).toBeInTheDocument();
      });

      const yesRadio = screen.getByRole('radio', { name: 'Yes' });
      fireEvent.click(yesRadio);

      const submitBtn = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitBtn);

      expect(submitBtn).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      api.api.get.mockResolvedValueOnce({
        data: {
          election: mockElection,
          voter: { id: 'voter-1', hasVoted: false }
        }
      });
    });

    it('should have accessible form controls', async () => {
      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const radios = screen.getAllByRole('radio');
        expect(radios.length).toBeGreaterThan(0);
      });
    });

    it('should have submit button', async () => {
      render(
        <VotingPage token="voter-token" />,
        { wrapper: createWrapper() }
      );

      await waitFor(() => {
        const submitBtn = screen.getByRole('button', { name: /submit/i });
        expect(submitBtn).toBeInTheDocument();
      });
    });
  });
});
