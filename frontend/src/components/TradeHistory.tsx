import React, { useState, useEffect, useCallback } from 'react';
import { Filter, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';

// --- Type Definitions ---
interface Trade {
  trade_id: string;
  timestamp: string;
  chain: string;
  strategy: string;
  status: 'success' | 'failed';
  profit_usd: number;
  // Add other potential fields from your 'trades' table
  // e.g., loan_amount: number; gas_cost_usd: number;
}

interface PaginationInfo {
  currentPage: number;
  totalPages: number;
  totalRecords: number;
  limit: number;
}

const TradeHistory = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [filters, setFilters] = useState({
    chain: '',
    status: '',
    startDate: '',
    endDate: '',
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '15', // Show 15 trades per page
        ...filters,
      });

      // This assumes your API is running on the same host or you have a proxy setup.
      // In a real app, you'd use an environment variable for the API base URL.
      // Also, you'd handle authentication (e.g., sending a JWT token).
      const response = await fetch(`/api/history/trades?${params.toString()}`, {
        headers: {
          // Example of how you might add authentication
          // 'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch trade history');
      }

      const { data, pagination: paginationData } = await response.json();
      setTrades(data);
      setPagination(paginationData);
    } catch (error) {
      console.error("Error fetching trade history:", error);
      setTrades([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setCurrentPage(1); // Reset to first page on filter change
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && pagination && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg h-full flex flex-col">
      {/* Header and Filters */}
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h3 className="font-bold text-lg text-white">Trade History</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="text-slate-400 w-5 h-5" />
          <select name="chain" onChange={handleFilterChange} className="bg-slate-800 border border-slate-600 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-sky-500 text-slate-300">
            <option value="">All Chains</option>
            <option value="Polygon">Polygon</option>
            <option value="Ethereum">Ethereum</option>
            <option value="BSC">BSC</option>
          </select>
          <select name="status" onChange={handleFilterChange} className="bg-slate-800 border border-slate-600 text-xs rounded px-2 py-1.5 focus:outline-none focus:border-sky-500 text-slate-300">
            <option value="">All Statuses</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
          <input type="date" name="startDate" onChange={handleFilterChange} className="bg-slate-800 border border-slate-600 text-xs rounded px-2 py-1 focus:outline-none focus:border-sky-500 text-slate-300" />
          <input type="date" name="endDate" onChange={handleFilterChange} className="bg-slate-800 border border-slate-600 text-xs rounded px-2 py-1 focus:outline-none focus:border-sky-500 text-slate-300" />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-y-auto flex-1">
        <table className="w-full text-sm text-left text-slate-400">
          <thead className="text-xs text-slate-200 uppercase bg-slate-800/50 sticky top-0">
            <tr>
              <th className="px-4 py-3">Timestamp</th>
              <th className="px-4 py-3">Chain</th>
              <th className="px-4 py-3">Strategy</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Profit (USD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading ? (
              <tr><td colSpan={5} className="text-center py-12"><Loader2 className="mx-auto animate-spin text-sky-400" /></td></tr>
            ) : trades.length > 0 ? (
              trades.map(trade => (
                <tr key={trade.trade_id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{new Date(trade.timestamp).toLocaleString()}</td>
                  <td className="px-4 py-3"><ChainBadge chain={trade.chain} /></td>
                  <td className="px-4 py-3">{trade.strategy}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${trade.status === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                      {trade.status}
                    </span>
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-bold ${trade.profit_usd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trade.profit_usd >= 0 ? '+' : ''}${trade.profit_usd.toFixed(2)}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="text-center py-12 text-slate-500">No trades found for the selected filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex justify-between items-center pt-4 mt-4 border-t border-slate-800 text-xs text-slate-400">
          <span>Page <strong>{pagination.currentPage}</strong> of <strong>{pagination.totalPages}</strong></span>
          <div className="flex items-center gap-1">
            <button onClick={() => handlePageChange(1)} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronsLeft size={16} /></button>
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
            <span className="px-2">...</span>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === pagination.totalPages} className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
            <button onClick={() => handlePageChange(pagination.totalPages)} disabled={currentPage === pagination.totalPages} className="p-1.5 rounded hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronsRight size={16} /></button>
          </div>
          <span>Total Records: <strong>{pagination.totalRecords}</strong></span>
        </div>
      )}
    </div>
  );
};

// Re-using the ChainBadge component from FoundationDashboard for consistency
const ChainBadge = ({ chain }: { chain: string }) => {
    const chainStyles: { [key: string]: string } = {
        'Polygon': 'bg-purple-900/30 text-purple-300 border-purple-700/30',
        'Ethereum': 'bg-slate-800 text-slate-300 border-slate-700',
        'BSC': 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50',
    };
    const style = chainStyles[chain] || chainStyles['Ethereum'];
    return (
        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${style}`}>
            {chain}
        </span>
    );
};

export default TradeHistory;