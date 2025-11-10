/**
 * Accessibility Tests for ErrorAlert Component
 *
 * Tests WCAG 2.1 AA compliance for error alerts
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorAlert from '../ErrorAlert';
import { toHaveNoViolations } from '../../test-utils/axe';
import { axe } from 'axe-core';

// Extend expect with accessibility matchers
expect.extend({ toHaveNoViolations });

describe('ErrorAlert - Accessibility Tests', () => {
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <ErrorAlert
        error="Test error message"
        onDismiss={() => {}}
      />
    );

    // Run axe audit
    const results = await axe.run(container);
    expect(results.violations).toHaveLength(0);
  });

  it('should have proper role="alert"', () => {
    render(<ErrorAlert error="Test error" />);

    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
  });

  it('should have aria-live="assertive"', () => {
    const { container } = render(<ErrorAlert error="Test error" />);

    const alert = container.querySelector('[role="alert"]');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
    expect(alert).toHaveAttribute('aria-atomic', 'true');
  });

  it('should hide decorative icon from screen readers', () => {
    const { container } = render(<ErrorAlert error="Test error" />);

    // AlertCircle icon should have aria-hidden
    const icon = container.querySelector('svg[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('should have accessible close button', () => {
    render(<ErrorAlert error="Test error" onDismiss={() => {}} />);

    const closeButton = screen.getByRole('button', { name: /fermer l'alerte/i });
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAttribute('aria-label', "Fermer l'alerte");
  });

  it('should hide icon in close button from screen readers', () => {
    const { container } = render(
      <ErrorAlert error="Test error" onDismiss={() => {}} />
    );

    // X icon in close button should have aria-hidden
    const closeButton = screen.getByRole('button', { name: /fermer l'alerte/i });
    const icon = closeButton.querySelector('svg[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('should pass color contrast check', async () => {
    const { container } = render(<ErrorAlert error="Test error" />);

    // Run axe with color-contrast rule
    const results = await axe.run(container, {
      runOnly: {
        type: 'rule',
        values: ['color-contrast']
      }
    });

    expect(results.violations).toHaveLength(0);
  });

  it('should announce error to screen readers', () => {
    const { container } = render(<ErrorAlert error="Critical error occurred" />);

    const alert = container.querySelector('[role="alert"][aria-live="assertive"]');
    expect(alert).toHaveTextContent('Critical error occurred');
  });

  it('should handle action hint accessibly', () => {
    const { container } = render(
      <ErrorAlert
        error="Session expired"
        actionHint="Please log in again"
      />
    );

    // Check that action hint icon is hidden
    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThanOrEqual(1);

    // Check that action hint text is present
    expect(screen.getByText('Please log in again')).toBeInTheDocument();
  });

  it('should pass full WCAG 2.1 AA audit with all props', async () => {
    const { container } = render(
      <ErrorAlert
        error="Database connection failed"
        actionHint="Check your internet connection"
        details="Error code: ECONNREFUSED"
        onDismiss={() => {}}
      />
    );

    await expect(container).toHaveNoViolations();
  });

  it('should be keyboard accessible', () => {
    render(
      <ErrorAlert
        error="Test error"
        onDismiss={() => {}}
      />
    );

    const closeButton = screen.getByRole('button', { name: /fermer l'alerte/i });

    // Button should not have negative tabindex
    expect(closeButton).not.toHaveAttribute('tabindex', '-1');

    // Button should be focusable (no tabindex or tabindex="0")
    const tabIndex = closeButton.getAttribute('tabindex');
    expect(tabIndex === null || tabIndex === '0').toBe(true);
  });
});
