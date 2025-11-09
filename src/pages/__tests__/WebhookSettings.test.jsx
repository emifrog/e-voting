/**
 * Tests for WebhookSettings Component
 *
 * Tests cover:
 * - Rendering webhook list
 * - Creating new webhooks
 * - Editing webhooks
 * - Deleting webhooks
 * - Testing webhooks
 * - Toggling webhook active status
 * - Form validation
 * - Error handling
 * - Accessibility
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import WebhookSettings from '../WebhookSettings';
import * as api from '../../utils/api';

// Mock API
vi.mock('../../utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
}));

// Mock data
const mockWebhooksData = {
  webhooks: [
    {
      id: 'webhook-1',
      platform: 'slack',
      webhook_url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX',
      events: ['election_started', 'election_closed', 'quorum_reached'],
      is_active: true,
      last_triggered_at: '2025-11-09T10:00:00Z',
      created_at: '2025-11-08T10:00:00Z'
    },
    {
      id: 'webhook-2',
      platform: 'teams',
      webhook_url: 'https://outlook.office.com/webhook/xxxx',
      events: ['vote_cast', 'security_alert'],
      is_active: false,
      last_triggered_at: null,
      created_at: '2025-11-08T11:00:00Z'
    }
  ]
};

const mockEventsData = {
  events: [
    {
      id: 'election_started',
      name: 'Election Started',
      description: 'Une élection a été démarrée'
    },
    {
      id: 'election_closed',
      name: 'Election Closed',
      description: 'Une élection a été fermée'
    },
    {
      id: 'quorum_reached',
      name: 'Quorum Reached',
      description: 'Le quorum a été atteint'
    },
    {
      id: 'vote_cast',
      name: 'Vote Cast',
      description: 'Un vote a été enregistré'
    },
    {
      id: 'security_alert',
      name: 'Security Alert',
      description: 'Une alerte de sécurité a été déclenchée'
    }
  ]
};

// Test wrapper
const createWrapper = (electionId = 'election-123') => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/elections/${electionId}/webhooks`]}>
        <Routes>
          <Route path="/elections/:electionId/webhooks" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('WebhookSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.default.get
      .mockResolvedValueOnce({ data: mockWebhooksData })
      .mockResolvedValueOnce({ data: mockEventsData });
  });

  describe('Rendering', () => {
    it('should render webhook settings page', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/configuration des webhooks/i)).toBeInTheDocument();
      });
    });

    it('should display existing webhooks', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      expect(screen.getByText('teams')).toBeInTheDocument();
    });

    it('should show webhook URLs', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/hooks\.slack\.com/)).toBeInTheDocument();
      });

      expect(screen.getByText(/outlook\.office\.com/)).toBeInTheDocument();
    });

    it('should display event badges', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Election Started')).toBeInTheDocument();
      });

      expect(screen.getByText('Election Closed')).toBeInTheDocument();
      expect(screen.getByText('Vote Cast')).toBeInTheDocument();
    });

    it('should show active/inactive status', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        const activeButtons = screen.getAllByText(/actif/i);
        expect(activeButtons.length).toBeGreaterThan(0);
      });

      expect(screen.getByText(/inactif/i)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should display empty state when no webhooks', async () => {
      api.default.get
        .mockResolvedValueOnce({ data: { webhooks: [] } })
        .mockResolvedValueOnce({ data: mockEventsData });

      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/aucun webhook configuré/i)).toBeInTheDocument();
      });
    });

    it('should show add webhook button in empty state', async () => {
      api.default.get
        .mockResolvedValueOnce({ data: { webhooks: [] } })
        .mockResolvedValueOnce({ data: mockEventsData });

      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        const addButtons = screen.getAllByRole('button', { name: /ajouter un webhook/i });
        expect(addButtons.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Add Webhook', () => {
    it('should open add webhook form', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /ajouter un webhook/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        expect(screen.getByText(/ajouter un webhook/i)).toBeInTheDocument();
      });
    });

    it('should allow selecting platform', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /ajouter un webhook/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        const slackButton = screen.getAllByText('Slack').find(el => el.closest('button'));
        expect(slackButton).toBeInTheDocument();
      });
    });

    it('should submit new webhook', async () => {
      api.default.post.mockResolvedValueOnce({ data: { webhook: { id: 'new-webhook' } } });

      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /ajouter un webhook/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        const urlInput = screen.getByLabelText(/url du webhook/i);
        expect(urlInput).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/url du webhook/i);
      await userEvent.type(urlInput, 'https://hooks.slack.com/services/TEST');

      // Select at least one event
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      const submitButton = screen.getByRole('button', { name: /enregistrer/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.default.post).toHaveBeenCalledWith(
          '/api/webhooks/election-123',
          expect.objectContaining({
            platform: 'slack',
            webhookUrl: 'https://hooks.slack.com/services/TEST',
            events: expect.any(Array)
          })
        );
      });
    });

    it('should validate webhook URL starts with https', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /ajouter un webhook/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        const urlInput = screen.getByLabelText(/url du webhook/i);
        expect(urlInput).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/url du webhook/i);
      await userEvent.type(urlInput, 'http://example.com/webhook');

      // Select at least one event
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      const submitButton = screen.getByRole('button', { name: /enregistrer/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/url doit commencer par https/i)).toBeInTheDocument();
      });
    });

    it('should validate at least one event is selected', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /ajouter un webhook/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        const urlInput = screen.getByLabelText(/url du webhook/i);
        expect(urlInput).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/url du webhook/i);
      await userEvent.type(urlInput, 'https://hooks.slack.com/services/TEST');

      const submitButton = screen.getByRole('button', { name: /enregistrer/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/sélectionnez au moins un événement/i)).toBeInTheDocument();
      });
    });
  });

  describe('Edit Webhook', () => {
    it('should open edit form when clicking edit button', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /modifier le webhook/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/modifier le webhook/i)).toBeInTheDocument();
      });
    });

    it('should submit webhook updates', async () => {
      api.default.put.mockResolvedValueOnce({ data: { message: 'Success' } });

      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByRole('button', { name: /modifier le webhook/i });
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /enregistrer/i });
        expect(submitButton).toBeInTheDocument();
      });

      const submitButton = screen.getByRole('button', { name: /enregistrer/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(api.default.put).toHaveBeenCalled();
      });
    });
  });

  describe('Delete Webhook', () => {
    it('should delete webhook with confirmation', async () => {
      // Mock window.confirm
      global.confirm = vi.fn(() => true);
      api.default.delete.mockResolvedValueOnce({ data: { message: 'Deleted' } });

      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /supprimer le webhook/i });
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.confirm).toHaveBeenCalledWith(
          expect.stringContaining('Êtes-vous sûr')
        );
      });

      expect(api.default.delete).toHaveBeenCalledWith(
        '/api/webhooks/election-123/webhook-1'
      );

      // Restore confirm
      global.confirm.mockRestore();
    });

    it('should cancel delete when confirmation is denied', async () => {
      // Mock window.confirm to return false
      global.confirm = vi.fn(() => false);

      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /supprimer le webhook/i });
      fireEvent.click(deleteButtons[0]);

      expect(api.default.delete).not.toHaveBeenCalled();

      // Restore confirm
      global.confirm.mockRestore();
    });
  });

  describe('Toggle Active Status', () => {
    it('should toggle webhook active status', async () => {
      api.default.put.mockResolvedValueOnce({ data: { message: 'Updated' } });

      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const activeButtons = screen.getAllByRole('button', { name: /actif/i });
      fireEvent.click(activeButtons[0]);

      await waitFor(() => {
        expect(api.default.put).toHaveBeenCalledWith(
          '/api/webhooks/election-123/webhook-1',
          { isActive: false }
        );
      });
    });
  });

  describe('Test Webhook', () => {
    it('should open test modal', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const testButtons = screen.getAllByRole('button', { name: /tester le webhook/i });
      fireEvent.click(testButtons[0]);

      await waitFor(() => {
        expect(screen.getByText(/tester le webhook/i)).toBeInTheDocument();
      });
    });

    it('should send test webhook', async () => {
      api.default.post.mockResolvedValueOnce({
        data: { success: true, message: 'Test réussi' }
      });

      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const testButtons = screen.getAllByRole('button', { name: /tester le webhook/i });
      fireEvent.click(testButtons[0]);

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /envoyer le test/i });
        expect(sendButton).toBeInTheDocument();
      });

      const sendButton = screen.getByRole('button', { name: /envoyer le test/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(api.default.post).toHaveBeenCalledWith(
          '/api/webhooks/test',
          expect.objectContaining({
            platform: 'slack',
            webhookUrl: expect.any(String)
          })
        );
      });

      await waitFor(() => {
        expect(screen.getByText(/test réussi/i)).toBeInTheDocument();
      });
    });

    it('should handle test failure', async () => {
      api.default.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Test failed' }
        }
      });

      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const testButtons = screen.getAllByRole('button', { name: /tester le webhook/i });
      fireEvent.click(testButtons[0]);

      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /envoyer le test/i });
        expect(sendButton).toBeInTheDocument();
      });

      const sendButton = screen.getByRole('button', { name: /envoyer le test/i });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(screen.getByText(/test failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should display error message on fetch failure', async () => {
      api.default.get
        .mockRejectedValueOnce({
          response: {
            data: { message: 'Failed to fetch webhooks' }
          }
        })
        .mockResolvedValueOnce({ data: mockEventsData });

      render(<WebhookSettings />, { wrapper: createWrapper() });

      // Should still render the page structure even with error
      await waitFor(() => {
        expect(screen.getByText(/configuration des webhooks/i)).toBeInTheDocument();
      });
    });

    it('should handle creation errors', async () => {
      api.default.post.mockRejectedValueOnce({
        response: {
          data: { message: 'Creation failed' }
        }
      });

      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /ajouter un webhook/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        const urlInput = screen.getByLabelText(/url du webhook/i);
        expect(urlInput).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/url du webhook/i);
      await userEvent.type(urlInput, 'https://hooks.slack.com/services/TEST');

      // Select at least one event
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      const submitButton = screen.getByRole('button', { name: /enregistrer/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/creation failed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator initially', () => {
      api.default.get.mockImplementation(() => new Promise(() => {}));

      render(<WebhookSettings />, { wrapper: createWrapper() });

      expect(screen.getByText(/chargement/i)).toBeInTheDocument();
    });

    it('should show loading state during submission', async () => {
      api.default.post.mockImplementation(() => new Promise(() => {}));

      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /ajouter un webhook/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        const urlInput = screen.getByLabelText(/url du webhook/i);
        expect(urlInput).toBeInTheDocument();
      });

      const urlInput = screen.getByLabelText(/url du webhook/i);
      await userEvent.type(urlInput, 'https://hooks.slack.com/services/TEST');

      // Select at least one event
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      const submitButton = screen.getByRole('button', { name: /enregistrer/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/enregistrement/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('should have back to election button', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/retour à l'élection/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have accessible heading', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        const heading = screen.getByRole('heading', { level: 1 });
        expect(heading).toBeInTheDocument();
        expect(heading).toHaveTextContent(/configuration des webhooks/i);
      });
    });

    it('should have accessible buttons with aria-labels', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        // Buttons should have either text content or aria-label
        const hasText = button.textContent && button.textContent.trim().length > 0;
        const hasAriaLabel = button.getAttribute('aria-label');
        expect(hasText || hasAriaLabel).toBeTruthy();
      });
    });

    it('should have accessible form inputs', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('slack')).toBeInTheDocument();
      });

      const addButton = screen.getByRole('button', { name: /ajouter un webhook/i });
      fireEvent.click(addButton);

      await waitFor(() => {
        const urlInput = screen.getByLabelText(/url du webhook/i);
        expect(urlInput).toBeInTheDocument();
        expect(urlInput).toHaveAttribute('type', 'url');
        expect(urlInput).toHaveAttribute('required');
      });
    });
  });

  describe('Info Banner', () => {
    it('should display info banner with instructions', async () => {
      render(<WebhookSettings />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/comment configurer un webhook/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/slack/i)).toBeInTheDocument();
      expect(screen.getByText(/teams/i)).toBeInTheDocument();
    });
  });
});
