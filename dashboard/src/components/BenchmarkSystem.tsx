import React, { useState, useEffect } from 'react';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Activity, 
  Zap, 
  BarChart3,
  Clock,
  DollarSign,
  Layers,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
  Award,
  Filter
} from 'lucide-react';

// Benchmark competitor data
interface BenchmarkCompetitor {
  id: string;
  name: string;
  category: string;
  apy: number;
  winRate: number;
  latency: number;
  tradesPerHour: number;
  profitPerTrade: number;
  status: 'active' | 'inactive' | 'monitoring';
  alphaOrionComparison: number; // positive = better, negative = worse
}

// Performance metric
interface PerformanceMetric {
  label: string;
  alphaOrionValue: number;
  benchmarkValue: number;
  unit: string;
  isHigherBetter: boolean;
}

const BenchmarkSystem: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [competitors, setCompetitors] = useState<BenchmarkCompetitor[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);

  // Initialize with demo data
  useEffect(() => {
    setCompetitors([
      { 
        id: '1', 
        name: 'Wintermute', 
        category: 'Market Maker', 
        apy: 142.5, 
        winRate: 96.2, 
        latency: 50, 
        tradesPerHour: 245, 
        profitPerTrade: 580,
        status: 'active',
        alphaOrionComparison: 8.5
      },
      { 
        id: '2', 
        name: '1inch', 
        category: 'Aggregator', 
        apy: 125.8, 
        winRate: 94.5, 
        latency: 65, 
        tradesPerHour: 312, 
        profitPerTrade: 420,
        status: 'active',
        alphaOrionComparison: 16.2
      },
      { 
        id: '3', 
        name: 'Gnosis', 
        category: 'DEX', 
        apy: 98.2, 
        winRate: 91.2, 
        latency: 80, 
        tradesPerHour: 180, 
        profitPerTrade: 350,
        status: 'monitoring',
        alphaOrionComparison: 44.3
      },
      { 
        id: '4', 
        name: 'dYdX', 
        category: 'Perpetuals', 
        apy: 165.4, 
        winRate: 88.5, 
        latency: 45, 
        tradesPerHour: 420, 
        profitPerTrade: 680,
        status: 'active',
        alphaOrionComparison: -12.4
      },
      { 
        id: '5', 
        name: 'Synthetix', 
        category: 'Derivatives', 
        apy: 85.6, 
        winRate: 89.2, 
        latency: 95, 
        tradesPerHour: 150, 
        profitPerTrade: 280,
        status: 'inactive',
        alphaOrionComparison: 56.8
      },
      { 
        id: 'alpha', 
        name: 'Alpha-Orion', 
        category: 'Flash Loan', 
        apy: 152.4, 
        winRate: 98.2, 
        latency: 42, 
        tradesPerHour: 380, 
        profitPerTrade: 620,
        status: 'active',
        alphaOrionComparison: 0
      }
    ]);

    setMetrics([
      { label: 'Latency', alphaOrionValue: 42, benchmarkValue: 50, unit: 'ms', isHigherBetter: false },
      { label: 'Win Rate', alphaOrionValue: 98.2, benchmarkValue: 92.5, unit: '%', isHigherBetter: true },
      { label: 'Trades/Hour', alphaOrionValue: 380, benchmarkValue: 261, unit: '', isHigherBetter: true },
      { label: 'Profit/Trade', alphaOrionValue: 620, benchmarkValue: 462, unit: '$', isHigherBetter: true },
      { label: 'Gas Efficiency', alphaOrionValue: 94, benchmarkValue: 78, unit: '%', isHigherBetter: true },
      { label: 'APY', alphaOrionValue: 152.4, benchmarkValue: 123.5, unit: '%', isHigherBetter: true }
    ]);
  }, []);

  const refreshBenchmarks = () => {
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
    }, 1500);
  };

  const getComparisonIcon = (value: number) => {
    if (value > 0) return <ArrowUp size={12} className="text-emerald-400" />;
    if (value < 0) return <ArrowDown size={12} className="text-red-400" />;
    return <Minus size={12} className="text-slate-400" />;
  };

  const getComparisonColor = (value: number) => {
    if (value > 0) return 'text-emerald-400';
    if (value < 0) return 'text-red-400';
    return 'text-slate-400';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'monitoring': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'inactive': return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const filteredCompetitors = selectedCategory === 'all' 
    ? competitors 
    : competitors.filter(c => c.category === selectedCategory);

  const categories = ['all', ...new Set(competitors.map(c => c.category))];

  return (
    <div className="h-full flex flex-col bg-slate-950/80 border-r border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-lg shadow-lg shadow-emerald-500/20">
              <Trophy size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Benchmark System</h2>
              <p className="text-[10px] text-slate-400">Alpha-Orion vs Top 5 Apps</p>
            </div>
          </div>
          <button
            onClick={refreshBenchmarks}
            disabled={isLoading}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <RefreshCw size={14} className={`text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Alpha-Orion Performance Summary */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Award size={14} className="text-yellow-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Alpha-Orion Performance</h3>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="p-3 bg-gradient-to-br from-emerald-900/50 to-teal-900/50 rounded-lg border border-emerald-500/20">
            <div className="flex items-center gap-1">
              <TrendingUp size={12} className="text-emerald-400" />
              <span className="text-[10px] text-slate-400">APY</span>
            </div>
            <div className="text-lg font-bold text-white mt-1">152.4%</div>
            <div className="flex items-center gap-1 mt-1">
              <ArrowUp size={10} className="text-emerald-400" />
              <span className="text-[10px] text-emerald-400">+23% vs avg</span>
            </div>
          </div>
          <div className="p-3 bg-gradient-to-br from-blue-900/50 to-indigo-900/50 rounded-lg border border-blue-500/20">
            <div className="flex items-center gap-1">
              <Activity size={12} className="text-blue-400" />
              <span className="text-[10px] text-slate-400">Win Rate</span>
            </div>
            <div className="text-lg font-bold text-white mt-1">98.2%</div>
            <div className="flex items-center gap-1 mt-1">
              <Target size={10} className="text-blue-400" />
              <span className="text-[10px] text-blue-400">Industry Leader</span>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics Comparison */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 size={14} className="text-purple-400" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Metrics Comparison</h3>
        </div>
        <div className="space-y-3">
          {metrics.map((metric, index) => {
            const alphaBetter = metric.isHigherBetter 
              ? metric.alphaOrionValue > metric.benchmarkValue 
              : metric.alphaOrionValue < metric.benchmarkValue;
            
            return (
              <div key={index} className="bg-slate-900/50 rounded-lg p-2 border border-white/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-slate-400">{metric.label}</span>
                  <span className={`text-[10px] font-bold ${alphaBetter ? 'text-emerald-400' : 'text-red-400'}`}>
                    {alphaBetter ? 'Ahead' : 'Behind'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="flex justify-between text-[9px] mb-1">
                      <span className="text-emerald-400">Alpha: {metric.alphaOrionValue}{metric.unit}</span>
                      <span className="text-slate-500">Bench: {metric.benchmarkValue}{metric.unit}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
                        style={{ width: `${Math.min((metric.alphaOrionValue / (metric.benchmarkValue * 1.5)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Competitor Rankings */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers size={14} className="text-blue-400" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Rankings</h3>
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-400 focus:outline-none focus:border-blue-500"
          >
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat === 'all' ? 'All' : cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {filteredCompetitors
            .sort((a, b) => b.apy - a.apy)
            .map((competitor, index) => (
              <div 
                key={competitor.id} 
                className={`p-3 rounded-lg border transition-all hover:scale-[1.01] ${
                  competitor.id === 'alpha' 
                    ? 'bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border-emerald-500/30' 
                    : 'bg-slate-900/50 border-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                      index === 1 ? 'bg-slate-400/20 text-slate-300' :
                      index === 2 ? 'bg-amber-700/20 text-amber-500' :
                      'bg-slate-700/20 text-slate-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${competitor.id === 'alpha' ? 'text-emerald-400' : 'text-slate-200'}`}>
                          {competitor.name}
                        </span>
                        {competitor.id === 'alpha' && (
                          <span className="text-[8px] px-1 py-0.5 bg-emerald-500/20 text-emerald-400 rounded">YOU</span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-500">{competitor.category}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-white">{competitor.apy}%</div>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getStatusColor(competitor.status)}`}>
                      {competitor.status}
                    </span>
                  </div>
                </div>
                
                {competitor.id !== 'alpha' && (
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                    <div className="flex items-center gap-1">
                      <Clock size={10} className="text-slate-500" />
                      <span className="text-[9px] text-slate-400">{competitor.latency}ms</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Zap size={10} className="text-slate-500" />
                      <span className="text-[9px] text-slate-400">{competitor.tradesPerHour}/hr</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign size={10} className="text-slate-500" />
                      <span className="text-[9px] text-slate-400">${competitor.profitPerTrade}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {getComparisonIcon(competitor.alphaOrionComparison)}
                      <span className={`text-[9px] font-bold ${getComparisonColor(competitor.alphaOrionComparison)}`}>
                        {Math.abs(competitor.alphaOrionComparison)}%
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
        </div>
      </div>

      {/* Optimization Engine Status */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400">Optimization Engine</span>
          <span className="text-[10px] font-bold text-emerald-400">Matching to Beat</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 w-[87%]" />
        </div>
        <p className="text-[9px] text-slate-500 mt-1">87% - Continually optimizing to exceed benchmarks</p>
      </div>
    </div>
  );
};

export default BenchmarkSystem;
