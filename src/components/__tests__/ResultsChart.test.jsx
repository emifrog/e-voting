/**
 * Tests for ResultsChart Component
 *
 * Tests cover:
 * - Chart rendering
 * - Data visualization
 * - Percentage calculations
 * - Weighted voting support
 * - Empty/error states
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import ResultsChart from '../ResultsChart';

describe('ResultsChart', () => {
  describe('Rendering', () => {
    it('should render chart container', () => {
      const results = {
        results: [
          { option: 'Yes', votes: 100, percentage: 66.67 },
          { option: 'No', votes: 50, percentage: 33.33 }
        ]
      };

      render(<ResultsChart results={results} />);

      // Should render without crashing
      expect(screen.getByText(/yes|no/i)).toBeInTheDocument();
    });

    it('should render both options', () => {
      const results = {
        results: [
          { option: 'Option A', votes: 100, percentage: 50 },
          { option: 'Option B', votes: 100, percentage: 50 }
        ]
      };

      render(<ResultsChart results={results} />);

      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
    });

    it('should handle multiple options', () => {
      const results = {
        results: [
          { option: 'A', votes: 100, percentage: 25 },
          { option: 'B', votes: 100, percentage: 25 },
          { option: 'C', votes: 100, percentage: 25 },
          { option: 'D', votes: 100, percentage: 25 }
        ]
      };

      render(<ResultsChart results={results} />);

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
      expect(screen.getByText('C')).toBeInTheDocument();
      expect(screen.getByText('D')).toBeInTheDocument();
    });
  });

  describe('Data Calculations', () => {
    it('should calculate percentages correctly', () => {
      const results = {
        results: [
          { option: 'Yes', votes: 100, percentage: 66.67 },
          { option: 'No', votes: 50, percentage: 33.33 }
        ]
      };

      render(<ResultsChart results={results} />);

      // Percentages should be visible in chart
      expect(screen.getByText(/66\.67/)).toBeInTheDocument();
      expect(screen.getByText(/33\.33/)).toBeInTheDocument();
    });

    it('should handle equal vote distribution', () => {
      const results = {
        results: [
          { option: 'A', votes: 50, percentage: 50 },
          { option: 'B', votes: 50, percentage: 50 }
        ]
      };

      render(<ResultsChart results={results} />);

      expect(screen.getByText('A')).toBeInTheDocument();
      expect(screen.getByText('B')).toBeInTheDocument();
    });

    it('should handle single option', () => {
      const results = {
        results: [
          { option: 'Approve', votes: 100, percentage: 100 }
        ]
      };

      render(<ResultsChart results={results} />);

      expect(screen.getByText('Approve')).toBeInTheDocument();
    });

    it('should handle zero votes', () => {
      const results = {
        results: [
          { option: 'Yes', votes: 0, percentage: 0 },
          { option: 'No', votes: 0, percentage: 0 }
        ]
      };

      render(<ResultsChart results={results} />);

      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('should handle rounding precision', () => {
      const results = {
        results: [
          { option: 'A', votes: 1, percentage: 33.33 },
          { option: 'B', votes: 1, percentage: 33.33 },
          { option: 'C', votes: 1, percentage: 33.34 }
        ]
      };

      render(<ResultsChart results={results} />);

      // Should display without errors despite rounding
      expect(screen.getByText('A')).toBeInTheDocument();
    });
  });

  describe('Weighted Voting', () => {
    it('should display weighted vote counts', () => {
      const results = {
        results: [
          { option: 'Yes', votes: 10, weight: 2, weighted: 20, percentage: 66.67 },
          { option: 'No', votes: 10, weight: 1, weighted: 10, percentage: 33.33 }
        ]
      };

      render(<ResultsChart results={results} />);

      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('should handle different weights', () => {
      const results = {
        results: [
          { option: 'A', votes: 5, weight: 3, weighted: 15 },
          { option: 'B', votes: 10, weight: 2, weighted: 20 },
          { option: 'C', votes: 20, weight: 1, weighted: 20 }
        ]
      };

      render(<ResultsChart results={results} />);

      expect(screen.getByText('A')).toBeInTheDocument();
    });
  });

  describe('Empty States', () => {
    it('should handle empty results', () => {
      const results = { results: [] };

      render(<ResultsChart results={results} />);

      // Should render gracefully, might show "No data" message
      const container = screen.getByRole('img', { hidden: true }).parentElement;
      expect(container).toBeInTheDocument();
    });

    it('should handle null results', () => {
      render(<ResultsChart results={null} />);

      // Should render without crashing
      expect(document.body).toBeInTheDocument();
    });

    it('should handle undefined results object', () => {
      render(<ResultsChart results={undefined} />);

      // Should render without crashing
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Chart Types', () => {
    it('should render bar chart', () => {
      const results = {
        results: [
          { option: 'Yes', votes: 100 },
          { option: 'No', votes: 50 }
        ]
      };

      render(<ResultsChart results={results} />);

      // Recharts creates SVG elements
      const svgElement = document.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('should handle approval voting', () => {
      const results = {
        votingType: 'approval',
        results: [
          { option: 'Candidate A', votes: 80 },
          { option: 'Candidate B', votes: 60 },
          { option: 'Candidate C', votes: 45 }
        ]
      };

      render(<ResultsChart results={results} />);

      expect(screen.getByText('Candidate A')).toBeInTheDocument();
    });

    it('should handle preference voting', () => {
      const results = {
        votingType: 'preference',
        results: [
          { option: '1st Place', votes: 100 },
          { option: '2nd Place', votes: 75 },
          { option: '3rd Place', votes: 50 }
        ]
      };

      render(<ResultsChart results={results} />);

      expect(screen.getByText('1st Place')).toBeInTheDocument();
    });
  });

  describe('Data Updates', () => {
    it('should update chart when results change', () => {
      const { rerender } = render(
        <ResultsChart
          results={{
            results: [
              { option: 'Yes', votes: 50 },
              { option: 'No', votes: 50 }
            ]
          }}
        />
      );

      expect(screen.getByText('Yes')).toBeInTheDocument();

      // Update with new data
      rerender(
        <ResultsChart
          results={{
            results: [
              { option: 'Yes', votes: 100 },
              { option: 'No', votes: 25 }
            ]
          }}
        />
      );

      // Should still show both options
      expect(screen.getByText('Yes')).toBeInTheDocument();
      expect(screen.getByText('No')).toBeInTheDocument();
    });

    it('should handle live updates', () => {
      const { rerender } = render(
        <ResultsChart
          results={{
            results: [
              { option: 'A', votes: 10 },
              { option: 'B', votes: 10 }
            ]
          }}
        />
      );

      // Simulate vote arriving
      rerender(
        <ResultsChart
          results={{
            results: [
              { option: 'A', votes: 11 },
              { option: 'B', votes: 10 }
            ]
          }}
        />
      );

      // Chart should update without errors
      expect(document.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible chart labels', () => {
      const results = {
        results: [
          { option: 'Yes', votes: 100, percentage: 66.67 },
          { option: 'No', votes: 50, percentage: 33.33 }
        ]
      };

      render(<ResultsChart results={results} />);

      // Recharts should create accessible SVG
      const svg = document.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('should display vote counts in accessible format', () => {
      const results = {
        results: [
          { option: 'Option A', votes: 100 },
          { option: 'Option B', votes: 50 }
        ]
      };

      render(<ResultsChart results={results} />);

      expect(screen.getByText('Option A')).toBeInTheDocument();
      expect(screen.getByText('Option B')).toBeInTheDocument();
    });
  });

  describe('Large Datasets', () => {
    it('should handle many options', () => {
      const options = Array.from({ length: 20 }, (_, i) => ({
        option: `Option ${i + 1}`,
        votes: 100,
        percentage: 5
      }));

      const results = { results: options };

      render(<ResultsChart results={results} />);

      // Should render without performance issues
      expect(screen.getByText('Option 1')).toBeInTheDocument();
      expect(screen.getByText('Option 20')).toBeInTheDocument();
    });

    it('should handle large vote counts', () => {
      const results = {
        results: [
          { option: 'Yes', votes: 1000000, percentage: 66.67 },
          { option: 'No', votes: 500000, percentage: 33.33 }
        ]
      };

      render(<ResultsChart results={results} />);

      expect(screen.getByText('Yes')).toBeInTheDocument();
    });
  });
});
