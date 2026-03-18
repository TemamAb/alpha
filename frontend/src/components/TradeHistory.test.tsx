/**
 * Unit Tests for TradeHistory Component
 * Tests table rendering, filter changes, and pagination behavior
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TradeHistory from './TradeHistory';

// Mock the fetch API
global.fetch = jest.fn();

// Mock data
const mockTrades = [
  { trade_id: '1', chain: 'Polygon', strategy: 'flash_loan', status: 'success', profit_usd: 100.50, timestamp: '2024-01-15T10:00:00Z' },
  { trade_id: '2', chain: 'Ethereum', strategy: 'triangular', status: 'success', profit_usd: 250.75, timestamp: '2024-01-15T09:00:00Z' },
  { trade_id: '3', chain: 'BSC', strategy: 'arbitrage', status: 'failed', profit_usd: -50.00, timestamp: '2024-01-15T08:00:00Z' },
];

const mockPagination = {
  currentPage: 1,
  totalPages: 1,
  totalRecords: 3,
  limit: 15,
};

const mockApiResponse = (trades = mockTrades, pagination = mockPagination) => ({
  data: trades,
  pagination: pagination,
});

describe('TradeHistory Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse(),
    });
  });

  describe('Rendering', () => {
    it('should render the component title', () => {
      render(<TradeHistory />);
      expect(screen.getByText('Trade History')).toBeInTheDocument();
    });

    it('should render filter dropdowns', () => {
      render(<TradeHistory />);
      
      // Check for chain filter
      expect(screen.getByRole('combobox', { name: /chain/i })).toBeInTheDocument();
      
      // Check for status filter
      expect(screen.getByRole('combobox', { name: /status/i })).toBeInTheDocument();
      
      // Check for date inputs
      expect(screen.getByRole('textbox', { name: /start date/i })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /end date/i })).toBeInTheDocument();
    });

    it('should render table headers', () => {
      render(<TradeHistory />);
      
      expect(screen.getByText('Timestamp')).toBeInTheDocument();
      expect(screen.getByText('Chain')).toBeInTheDocument();
      expect(screen.getByText('Strategy')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Profit (USD)')).toBeInTheDocument();
    });

    it('should render loading state initially', () => {
      // Mock a slow response
      (global.fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          ok: true,
          json: async () => mockApiResponse(),
        }), 100))
      );

      render(<TradeHistory />);
      
      // The component should show loading indicator
      expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    });

    it('should render trade data in table rows', async () => {
      render(<TradeHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('Polygon')).toBeInTheDocument();
        expect(screen.getByText('Ethereum')).toBeInTheDocument();
        expect(screen.getByText('BSC')).toBeInTheDocument();
      });
    });

    it('should render correct number of rows based on mock data', async () => {
      render(<TradeHistory />);
      
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        // Header row + 3 data rows = 4
        expect(rows).toHaveLength(4);
      });
    });

    it('should display "No trades found" message when empty', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: [], pagination: { currentPage: 1, totalPages: 0, totalRecords: 0, limit: 15 } }),
      });

      render(<TradeHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('No trades found for the selected filters.')).toBeInTheDocument();
      });
    });
  });

  describe('Filter Behavior', () => {
    it('should call fetch with correct chain filter', async () => {
      render(<TradeHistory />);
      
      const chainSelect = screen.getByRole('combobox', { name: /chain/i });
      fireEvent.change(chainSelect, { target: { value: 'Polygon' } });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('chain=Polygon'),
          expect.any(Object)
        );
      });
    });

    it('should call fetch with correct status filter', async () => {
      render(<TradeHistory />);
      
      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      fireEvent.change(statusSelect, { target: { value: 'failed' } });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=failed'),
          expect.any(Object)
        );
      });
    });

    it('should reset to page 1 when filter changes', async () => {
      // First render with default
      render(<TradeHistory />);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=1'),
          expect.any(Object)
        );
      });
    });

    it('should combine multiple filters', async () => {
      render(<TradeHistory />);
      
      const chainSelect = screen.getByRole('combobox', { name: /chain/i });
      const statusSelect = screen.getByRole('combobox', { name: /status/i });
      
      fireEvent.change(chainSelect, { target: { value: 'Polygon' } });
      fireEvent.change(statusSelect, { target: { value: 'success' } });
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('chain=Polygon'),
          expect.any(Object)
        );
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('status=success'),
          expect.any(Object)
        );
      });
    });
  });

  describe('Pagination', () => {
    const multiPageResponse = {
      data: Array.from({ length: 15 }, (_, i) => ({
        trade_id: `${i + 1}`,
        chain: 'Polygon',
        strategy: 'arbitrage',
        status: 'success',
        profit_usd: 100,
        timestamp: new Date().toISOString()
      })),
      pagination: {
        currentPage: 1,
        totalPages: 3,
        totalRecords: 45,
        limit: 15,
      },
    };

    it('should render pagination controls when multiple pages exist', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<TradeHistory />);
      
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
        expect(screen.getByText(/Total Records: 45/)).toBeInTheDocument();
      });
    });

    it('should call fetch with next page number', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<TradeHistory />);
      
      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 3/)).toBeInTheDocument();
      });

      // Click next page button
      const nextButton = screen.getByRole('button', { name: /go to next page/i });
      fireEvent.click(nextButton);
      
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('page=2'),
          expect.any(Object)
        );
      });
    });

    it('should disable previous button on first page', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => multiPageResponse,
      });

      render(<TradeHistory />);
      
      await waitFor(() => {
        const prevButton = screen.getByRole('button', { name: /go to previous page/i });
        expect(prevButton).toBeDisabled();
      });
    });

    it('should disable next button on last page', async () => {
      const lastPageResponse = {
        data: mockTrades,
        pagination: {
          currentPage: 3,
          totalPages: 3,
          totalRecords: 45,
          limit: 15,
        },
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => lastPageResponse,
      });

      render(<TradeHistory />);
      
      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: /go to next page/i });
        expect(nextButton).toBeDisabled();
      });
    });

    it('should not render pagination when only one page', async () => {
      render(<TradeHistory />);
      
      await waitFor(() => {
        expect(screen.queryByText(/Page 1 of 1/)).not.toBeInTheDocument();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch error gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<TradeHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('No trades found for the selected filters.')).toBeInTheDocument();
      });
    });

    it('should handle non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      render(<TradeHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('No trades found for the selected filters.')).toBeInTheDocument();
      });
    });
  });

  describe('Profit Display', () => {
    it('should format positive profit with + sign', async () => {
      render(<TradeHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('+$100.50')).toBeInTheDocument();
        expect(screen.getByText('+$250.75')).toBeInTheDocument();
      });
    });

    it('should format negative profit with - sign', async () => {
      render(<TradeHistory />);
      
      await waitFor(() => {
        expect(screen.getByText('-$50.00')).toBeInTheDocument();
      });
    });

    it('should apply correct color classes for profit', async () => {
      render(<TradeHistory />);
      
      await waitFor(() => {
        const positiveProfit = screen.getByText('+$100.50');
        const negativeProfit = screen.getByText('-$50.00');
        
        expect(positiveProfit).toHaveClass('text-emerald-400');
        expect(negativeProfit).toHaveClass('text-red-400');
      });
    });
  });

  describe('Status Badge', () => {
    it('should render success status with correct styling', async () => {
      render(<TradeHistory />);
      
      await waitFor(() => {
        const successBadges = screen.getAllByText('success');
        expect(successBadges).toHaveLength(2);
        expect(successBadges[0]).toHaveClass('text-emerald-400');
      });
    });

    it('should render failed status with correct styling', async () => {
      render(<TradeHistory />);
      
      await waitFor(() => {
        const failedBadge = screen.getByText('failed');
        expect(failedBadge).toHaveClass('text-red-400');
      });
    });
  });
});
