import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  BarChart3, 
  Layers, 
  Network, 
  Zap,
  DollarSign,
  Activity,
  PieChart,
  Hexagon,
  Globe,
  Database
} from 'lucide-react';

// Strategy data types
interface StrategyData {
  id: string;
  name: string;
  profitShare: number;
  color: string;
  dailyPnL: number;
  trades: number;
  winRate: number;
}

interface TradingPair {
  pair: string;
  profitShare: number;
  volume: number;
  color: string;
}

interface ChainMetric {
  name: string;
  volume: number;
  percentage: number;
  color: string;
}

interface FlashLoanProvider {
  provider: string;
  percentage: number;
  color: string;
}

const StrategiesPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'strategies' | 'pairs' | 'chains' | 'providers'>('strategies');

  // Demo strategy data
  const strategies: StrategyData[] = [
    { id: '1', name: 'Triangular Arbitrage', profitShare: 28.5, color: '#3B82F6', dailyPnL: 24500, trades: 45, winRate: 0.89 },
    { id: '2', name: 'Flash Loan Swap', profitShare: 22.3, color: '#10B981', dailyPnL: 19200, trades: 32, winRate: 0.85 },
    { id: '3', name: 'Cross-Chain Bridge', profitShare: 18.7, color: '#F59E0B', dailyPnL: 16100, trades: 28, winRate: 0.82 },
    { id: '4', name: 'MEV Sandwich', profitShare: 12.4, color: '#EF4444', dailyPnL: 10680, trades: 56, winRate: 0.78 },
    { id: '5', name: 'Liquidation Hunter', profitShare: 8.9, color: '#8B5CF6', dailyPnL: 7660, trades: 12, winRate: 0.92 },
    { id: '6', name: 'Stablecoin Pool', profitShare: 5.2, color: '#06B6D4', dailyPnL: 4480, trades: 22, winRate: 0.95 },
    { id: '7', name: 'DEX Aggregator', profitShare: 2.8, color: '#EC4899', dailyPnL: 2410, trades: 18, winRate: 0.88 },
    { id: '8', name: 'NFT Floor Arbitrage', profitShare: 1.2, color: '#84CC16', dailyPnL: 1034, trades: 5, winRate: 0.72 },
  ];

  // Demo trading pairs
  const tradingPairs: TradingPair[] = [
    { pair: 'ETH/USDC', profitShare: 32.5, volume: 2850000, color: '#627EEA' },
    { pair: 'WBTC/ETH', profitShare: 18.2, volume: 1580000, color: '#F7931A' },
    { pair: 'ARB/USDC', profitShare: 12.8, volume: 1120000, color: '#28A0F0' },
    { pair: 'OP/ETH', profitShare: 9.5, volume: 830000, color: '#FF0420' },
    { pair: 'MATIC/USDC', profitShare: 7.2, volume: 630000, color: '#8247E5' },
    { pair: 'AAVE/ETH', profitShare: 5.8, volume: 507000, color: '#2EBAC6' },
    { pair: 'LINK/ETH', profitShare: 4.1, volume: 359000, color: '#375BD2' },
    { pair: 'UNI/ETH', profitShare: 3.5, volume: 306000, color: '#FF007A' },
    { pair: 'CRV/ETH', profitShare: 2.8, volume: 245000, color: '#FFD700' },
    { pair: 'SOL/ETH', profitShare: 2.4, volume: 210000, color: '#9945FF' },
  ];

  // Demo chain metrics
  const chains: ChainMetric[] = [
    { name: 'Ethereum', volume: 4500000, percentage: 42.5, color: '#627EEA' },
    { name: 'Arbitrum', volume: 2800000, percentage: 26.4, color: '#28A0F0' },
    { name: 'Optimism', volume: 1800000, percentage: 17.0, color: '#FF0420' },
    { name: 'Polygon', volume: 900000, percentage: 8.5, color: '#8247E5' },
    { name: 'Base', volume: 580000, percentage: 5.5, color: '#0055FF' },
  ];

  // Demo flash loan providers
  const flashLoanProviders: FlashLoanProvider[] = [
    { provider: 'Aave V3', percentage: 45.2, color: '#2EBAC6' },
    { provider: 'Balancer', percentage: 22.8, color: '#1E1E1E' },
    { provider: 'Uniswap V3', percentage: 15.5, color: '#FF007A' },
    { provider: 'Compound', percentage: 10.2, color: '#00D395' },
    { provider: 'dYdX', percentage: 6.3, color: '#EABE0C' },
  ];

  const totalVolume = chains.reduce((acc, c) => acc + c.volume, 0);
  const totalDEXes = 12; // Demo value
  const totalTrades = strategies.reduce((acc, s) => acc + s.trades, 0);

  const getMaxShare = () => {
    if (activeTab === 'strategies') return Math.max(...strategies.map(s => s.profitShare));
    if (activeTab === 'pairs') return Math.max(...tradingPairs.map(p => p.profitShare));
    return 100;
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/80 border-r border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg shadow-lg shadow-emerald-500/20">
            <Layers size={20} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Strategies</h2>
            <p className="text-[10px] text-slate-400">Performance breakdown</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-4 border-b border-white/5">
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Globe size={12} className="text-blue-400" />
              <span className="text-[9px] text-slate-500 uppercase">Chains</span>
            </div>
            <div className="text-lg font-bold text-white">{chains.length}</div>
            <div className="text-[8px] text-slate-500">Active Networks</div>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Database size={12} className="text-purple-400" />
              <span className="text-[9px] text-slate-500 uppercase">DEXes</span>
            </div>
            <div className="text-lg font-bold text-white">{totalDEXes}</div>
            <div className="text-[8px] text-slate-500">Connected</div>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Activity size={12} className="text-emerald-400" />
              <span className="text-[9px] text-slate-500 uppercase">Total Trades</span>
            </div>
            <div className="text-lg font-bold text-white">{totalTrades}</div>
            <div className="text-[8px] text-slate-500">Today</div>
          </div>
          <div className="p-3 bg-slate-900/50 rounded-lg border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={12} className="text-yellow-400" />
              <span className="text-[9px] text-slate-500 uppercase">Volume</span>
            </div>
            <div className="text-lg font-bold text-white">${(totalVolume / 1000000).toFixed(1)}M</div>
            <div className="text-[8px] text-slate-500">24h</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4 border-b border-white/5">
        <div className="flex gap-1">
          {[
            { id: 'strategies', label: 'Strategies', icon: TrendingUp },
            { id: 'pairs', label: 'Pairs', icon: BarChart3 },
            { id: 'chains', label: 'Chains', icon: Network },
            { id: 'providers', label: 'Providers', icon: Zap },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 text-[9px] font-bold uppercase rounded-t-lg transition-all ${
                activeTab === tab.id 
                  ? 'bg-slate-900 text-white border-t border-l border-r border-white/10' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <tab.icon size={10} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'strategies' && (
          <div className="space-y-3">
            {strategies.map((strategy) => (
              <div key={strategy.id} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: strategy.color }} />
                    <span className="text-[10px] text-slate-300 font-medium">{strategy.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white">{strategy.profitShare.toFixed(1)}%</span>
                </div>
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(strategy.profitShare / getMaxShare()) * 100}%`,
                      backgroundColor: strategy.color 
                    }}
                  />
                </div>
                <div className="flex justify-between text-[8px] text-slate-500">
                  <span>${strategy.dailyPnL.toLocaleString()} P&L</span>
                  <span>{strategy.trades} trades • {(strategy.winRate * 100).toFixed(0)}% WR</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'pairs' && (
          <div className="space-y-3">
            {tradingPairs.map((pair, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: pair.color }} />
                    <span className="text-[10px] text-slate-300 font-medium">{pair.pair}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white">{pair.profitShare.toFixed(1)}%</span>
                </div>
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${(pair.profitShare / getMaxShare()) * 100}%`,
                      backgroundColor: pair.color 
                    }}
                  />
                </div>
                <div className="text-[8px] text-slate-500">
                  ${(pair.volume / 1000).toFixed(0)}K volume
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'chains' && (
          <div className="space-y-3">
            {chains.map((chain, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Hexagon size={14} className="text-slate-400" style={{ color: chain.color }} />
                    <span className="text-[10px] text-slate-300 font-medium">{chain.name}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white">{chain.percentage.toFixed(1)}%</span>
                </div>
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${chain.percentage}%`,
                      backgroundColor: chain.color 
                    }}
                  />
                </div>
                <div className="text-[8px] text-slate-500">
                  ${(chain.volume / 1000000).toFixed(2)}M volume
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'providers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center mb-4">
              <PieChart size={60} className="text-slate-700" />
            </div>
            {flashLoanProviders.map((provider, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: provider.color }} />
                    <span className="text-[10px] text-slate-300 font-medium">{provider.provider}</span>
                  </div>
                  <span className="text-[10px] font-bold text-white">{provider.percentage.toFixed(1)}%</span>
                </div>
                <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="absolute left-0 top-0 h-full rounded-full transition-all duration-500"
                    style={{ 
                      width: `${provider.percentage}%`,
                      backgroundColor: provider.color 
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <div className="text-center">
          <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Total Daily Profit</div>
          <div className="text-2xl font-bold text-emerald-400">$85,064</div>
          <div className="text-[9px] text-emerald-500/70">+12.4% vs yesterday</div>
        </div>
      </div>
    </div>
  );
};

export default StrategiesPanel;
