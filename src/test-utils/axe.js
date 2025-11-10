/**
 * Axe Accessibility Testing Utilities for Vitest
 *
 * Provides helper functions to run accessibility audits on React components
 * using axe-core for WCAG 2.1 AA compliance testing.
 */

import { configureAxe } from 'axe-core';

/**
 * Configure axe-core for WCAG 2.1 AA testing
 */
export const axe = configureAxe({
  // Run all WCAG 2.1 AA rules
  runOnly: {
    type: 'tag',
    values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
  },
  // Report all issues, not just violations
  resultTypes: ['violations', 'incomplete'],
  // Include rules for screen readers
  rules: {
    'color-contrast': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'label': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-roles': { enabled: true },
    'button-name': { enabled: true },
    'bypass': { enabled: true },
    'document-title': { enabled: true },
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    'label-title-only': { enabled: true },
    'landmark-one-main': { enabled: true },
    'link-name': { enabled: true },
    'list': { enabled: true },
    'listitem': { enabled: true },
    'meta-refresh': { enabled: true },
    'meta-viewport': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    'scope-attr-valid': { enabled: true },
    'tabindex': { enabled: true },
    'table-duplicate-name': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    'valid-lang': { enabled: true },
    'video-caption': { enabled: true }
  }
});

/**
 * Run axe accessibility audit on a container element
 *
 * @param {HTMLElement} container - The DOM element to audit
 * @param {Object} options - Additional axe-core options
 * @returns {Promise<Object>} - Axe results object
 */
export async function runAxe(container, options = {}) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
    },
    ...options
  });

  return results;
}

/**
 * Assert that a component has no accessibility violations
 *
 * Usage in tests:
 * ```js
 * import { toHaveNoViolations } from './test-utils/axe';
 *
 * expect.extend({ toHaveNoViolations });
 *
 * test('should be accessible', async () => {
 *   const { container } = render(<MyComponent />);
 *   await expect(container).toHaveNoViolations();
 * });
 * ```
 */
export const toHaveNoViolations = {
  async toHaveNoViolations(container) {
    const results = await runAxe(container);

    const violations = results.violations;
    const incomplete = results.incomplete;

    const hasViolations = violations.length > 0;
    const hasIncomplete = incomplete.length > 0;

    // Format violations for error message
    const formatViolations = (items) => {
      return items.map((violation) => {
        const targets = violation.nodes.map(node => node.target.join(' ')).join(', ');
        return `
  - ${violation.id}: ${violation.help}
    Impact: ${violation.impact}
    Description: ${violation.description}
    Affected elements: ${targets}
    Help: ${violation.helpUrl}`;
      }).join('\n');
    };

    const pass = !hasViolations && !hasIncomplete;

    if (pass) {
      return {
        pass: true,
        message: () => 'Expected element to have accessibility violations, but none were found.'
      };
    }

    const violationMessage = hasViolations
      ? `\n\nViolations:\n${formatViolations(violations)}`
      : '';

    const incompleteMessage = hasIncomplete
      ? `\n\nIncomplete (needs manual review):\n${formatViolations(incomplete)}`
      : '';

    return {
      pass: false,
      message: () => `Expected element to have no accessibility violations, but found ${violations.length} violation(s) and ${incomplete.length} incomplete check(s):${violationMessage}${incompleteMessage}`
    };
  }
};

/**
 * Check for specific accessibility rule violations
 *
 * @param {HTMLElement} container - The DOM element to audit
 * @param {string[]} ruleIds - Array of axe rule IDs to check
 * @returns {Promise<Object[]>} - Array of violations for the specified rules
 */
export async function checkA11yRules(container, ruleIds) {
  const results = await axe.run(container, {
    runOnly: {
      type: 'rule',
      values: ruleIds
    }
  });

  return results.violations;
}

/**
 * Get a detailed report of all accessibility issues
 *
 * @param {HTMLElement} container - The DOM element to audit
 * @returns {Promise<string>} - Formatted report
 */
export async function getA11yReport(container) {
  const results = await runAxe(container);

  const { violations, incomplete, passes } = results;

  let report = `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ACCESSIBILITY AUDIT REPORT (WCAG 2.1 AA)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Summary:
  ✅ Passed: ${passes.length} rule(s)
  ❌ Violations: ${violations.length}
  ⚠️  Incomplete (needs review): ${incomplete.length}

`;

  if (violations.length > 0) {
    report += `\n━━━ VIOLATIONS (MUST FIX) ━━━\n`;
    violations.forEach((violation, index) => {
      report += `\n${index + 1}. ${violation.id} (Impact: ${violation.impact})\n`;
      report += `   ${violation.help}\n`;
      report += `   ${violation.helpUrl}\n`;
      report += `   Affected: ${violation.nodes.length} element(s)\n`;
      violation.nodes.forEach((node, nodeIndex) => {
        report += `   [${nodeIndex + 1}] ${node.target.join(' ')}\n`;
        report += `       ${node.failureSummary}\n`;
      });
    });
  }

  if (incomplete.length > 0) {
    report += `\n━━━ INCOMPLETE (MANUAL REVIEW NEEDED) ━━━\n`;
    incomplete.forEach((item, index) => {
      report += `\n${index + 1}. ${item.id}\n`;
      report += `   ${item.help}\n`;
      report += `   ${item.helpUrl}\n`;
      report += `   Needs review: ${item.nodes.length} element(s)\n`;
    });
  }

  report += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

  return report;
}

/**
 * Export for use with expect.extend
 */
export const matchers = {
  toHaveNoViolations
};

export default {
  axe,
  runAxe,
  toHaveNoViolations,
  checkA11yRules,
  getA11yReport,
  matchers
};
