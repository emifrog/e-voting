/**
 * Accessibility Tests for Dashboard
 *
 * Tests WCAG 2.1 AA compliance using axe-core
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from '../Dashboard';
import { toHaveNoViolations } from '../../test-utils/axe';
import { axe } from 'axe-core';

// Extend expect with accessibility matchers
expect.extend({ toHaveNoViolations });

// Mock modules
vi.mock('../../utils/api', () => ({
  default: {
    get: vi.fn()
  }
}));

vi.mock('../../utils/auth', () => ({
  getUser: vi.fn(() => ({
    id: 'user-1',
    name: 'Test User',
    email: 'test@example.com'
  }))
}));

// Create a test query client
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

// Helper to render component with providers
const renderWithProviders = (component) => {
  const queryClient = createTestQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {component}
      </BrowserRouter>
    </QueryClientProvider>
  );
};

// Mock elections data
const mockElections = [
  {
    id: '1',
    title: 'Test Election 1',
    description: 'Description for test election 1',
    status: 'active',
    start_date: '2025-11-01T10:00:00Z',
    end_date: '2025-11-30T18:00:00Z',
    created_at: '2025-10-01T10:00:00Z',
    participation_rate: 75,
    voter_count: 100,
    voted_count: 75
  },
  {
    id: '2',
    title: 'Test Election 2',
    description: 'Description for test election 2',
    status: 'closed',
    start_date: '2025-10-01T10:00:00Z',
    end_date: '2025-10-31T18:00:00Z',
    created_at: '2025-09-01T10:00:00Z',
    participation_rate: 90,
    voter_count: 50,
    voted_count: 45
  }
];

describe('Dashboard - Accessibility Tests', () => {
  beforeAll(() => {
    // Mock API responses
    const api = require('../../utils/api').default;
    api.get.mockResolvedValue({
      data: { elections: mockElections }
    });
  });

  it('should have no accessibility violations when loaded', async () => {
    const { container } = renderWithProviders(<Dashboard setIsAuthenticated={vi.fn()} />);

    // Wait for elections to load
    await waitFor(() => {
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    });

    // Run axe accessibility audit
    const results = await axe.run(container);

    // Assert no violations
    expect(results.violations).toHaveLength(0);
  });

  it('should have proper landmarks', async () => {
    const { container } = renderWithProviders(<Dashboard setIsAuthenticated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    });

    // Check for header landmark
    const header = container.querySelector('header[role="banner"]');
    expect(header).toBeInTheDocument();

    // Check for navigation landmark
    const nav = container.querySelector('nav[aria-label="Navigation principale"]');
    expect(nav).toBeInTheDocument();

    // Check for section landmarks
    const statsSection = container.querySelector('section[aria-labelledby="stats-heading"]');
    expect(statsSection).toBeInTheDocument();

    const electionsSection = container.querySelector('section[aria-labelledby="elections-heading"]');
    expect(electionsSection).toBeInTheDocument();
  });

  it('should have proper heading hierarchy', async () => {
    const { container } = renderWithProviders(<Dashboard setIsAuthenticated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    });

    // Check h1 exists and is unique
    const h1Elements = container.querySelectorAll('h1');
    expect(h1Elements).toHaveLength(1);
    expect(h1Elements[0]).toHaveTextContent('Tableau de bord');

    // Check h2 elements exist
    const h2Elements = container.querySelectorAll('h2');
    expect(h2Elements.length).toBeGreaterThanOrEqual(2); // stats + elections

    // Verify heading for stats section (should be h2, even if sr-only)
    const statsHeading = container.querySelector('#stats-heading');
    expect(statsHeading).toBeInTheDocument();
    expect(statsHeading.tagName).toBe('H2');

    // Verify heading for elections section
    const electionsHeading = container.querySelector('#elections-heading');
    expect(electionsHeading).toBeInTheDocument();
    expect(electionsHeading.tagName).toBe('H2');
  });

  it('should have accessible search input', async () => {
    const { container } = renderWithProviders(<Dashboard setIsAuthenticated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    });

    // Check search input has label
    const searchInput = screen.getByLabelText(/rechercher une élection/i);
    expect(searchInput).toBeInTheDocument();

    // Check search input has proper attributes
    expect(searchInput).toHaveAttribute('id', 'search-elections');
    expect(searchInput).toHaveAttribute('aria-label');

    // Check search icon is hidden from screen readers
    const searchIcon = container.querySelector('svg[aria-hidden="true"]');
    expect(searchIcon).toBeInTheDocument();
  });

  it('should have accessible statistics cards', async () => {
    const { container } = renderWithProviders(<Dashboard setIsAuthenticated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    });

    // Check that icons in stats cards are hidden from screen readers
    const statIcons = container.querySelectorAll('.card svg[aria-hidden="true"]');
    expect(statIcons.length).toBeGreaterThan(0);

    // Check that stats have proper text content
    const totalVotesLabel = screen.getByText(/total des votes/i);
    expect(totalVotesLabel).toBeInTheDocument();

    const activeVotesLabel = screen.getByText(/votes actifs/i);
    expect(activeVotesLabel).toBeInTheDocument();
  });

  it('should have accessible navigation buttons', async () => {
    renderWithProviders(<Dashboard setIsAuthenticated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    });

    // Check security button has accessible label
    const securityButton = screen.getByRole('button', { name: /accéder à la sécurité/i });
    expect(securityButton).toBeInTheDocument();

    // Check logout button has accessible label
    const logoutButton = screen.getByRole('button', { name: /se déconnecter/i });
    expect(logoutButton).toBeInTheDocument();

    // Check new election button
    const newElectionButton = screen.getByRole('button', { name: /nouvelle élection/i });
    expect(newElectionButton).toBeInTheDocument();
  });

  it('should announce search results to screen readers', async () => {
    renderWithProviders(<Dashboard setIsAuthenticated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    });

    // Check for live region
    const liveRegion = screen.getByRole('status');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  it('should have proper color contrast', async () => {
    const { container } = renderWithProviders(<Dashboard setIsAuthenticated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    });

    // Run axe with color-contrast rule specifically
    const results = await axe.run(container, {
      runOnly: {
        type: 'rule',
        values: ['color-contrast']
      }
    });

    expect(results.violations).toHaveLength(0);
  });

  it('should be keyboard navigable', async () => {
    renderWithProviders(<Dashboard setIsAuthenticated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    });

    // Check that all interactive elements are focusable
    const securityButton = screen.getByRole('button', { name: /accéder à la sécurité/i });
    expect(securityButton).not.toHaveAttribute('tabindex', '-1');

    const logoutButton = screen.getByRole('button', { name: /se déconnecter/i });
    expect(logoutButton).not.toHaveAttribute('tabindex', '-1');

    const searchInput = screen.getByLabelText(/rechercher une élection/i);
    expect(searchInput).not.toHaveAttribute('tabindex', '-1');
  });

  it('should have proper ARIA roles', async () => {
    const { container } = renderWithProviders(<Dashboard setIsAuthenticated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    });

    // Run axe with ARIA rules
    const results = await axe.run(container, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21aa']
      }
    });

    // Filter for ARIA-related violations
    const ariaViolations = results.violations.filter(v =>
      v.id.includes('aria') || v.id.includes('role')
    );

    expect(ariaViolations).toHaveLength(0);
  });

  it('should pass full WCAG 2.1 AA audit', async () => {
    const { container } = renderWithProviders(<Dashboard setIsAuthenticated={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Tableau de bord')).toBeInTheDocument();
    });

    // Run full accessibility audit
    await expect(container).toHaveNoViolations();
  });
});
