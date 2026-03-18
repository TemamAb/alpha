import React, { useState, useEffect } from 'react';
import { BrainCircuit, Zap, TrendingUp, Shield, AlertTriangle, CheckCircle2, Activity } from 'lucide-react';

const NeuralAdvisor = () => {
  const [suggestions, setSuggestions] = useState<any[]>([]);

  useEffect(() => {
    // Simulate incoming AI suggestions
    const demoSuggestions = [
      {
        id: 1,
        type: 'OPPORTUNITY',
        title: 'Arbitrage Opportunity Detected',
        description: 'High probability spread detected on WETH/USDC pair across Uniswap V3 and Sushiswap.',
        confidence: 98.5,
        estimatedProfit: 324.50,
        riskLevel: 'LOW',
        timestamp: Date.now() - 1000 * 60 * 2, // 2 mins ago
        status: 'EXECUTED'
      },
      {
        id: 2,
        type: 'OPTIMIZATION',
        title: 'Gas Fee Optimization',
        description: 'Network congestion increasing. Switching to Flashbots private relay to avoid front-running and reduce gas costs.',
        confidence: 92.0,
        estimatedProfit: 15.20, // Savings
        riskLevel: 'MEDIUM',
        timestamp: Date.now() - 1000 * 60 * 15, // 15 mins ago
        status: 'APPLIED'
      },
      {
        id: 3,
        type: 'STRATEGY',
        title: 'Liquidity Rebalancing',
        description: 'Suggesting rebalance of Aave collateral to maintain healthy health factor during market volatility.',
        confidence: 85.0,
        estimatedProfit: 0,
        riskLevel: 'LOW',
        timestamp: Date.now() - 1000 * 60 * 45,
        status: 'PENDING'
      }
    ];
    setSuggestions(demoSuggestions);
  }, []);

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'LOW': return 'text-emerald-400';
      case 'MEDIUM': return 'text-amber-400';
      case 'HIGH': return 'text-red-400';
      default: return 'text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'EXECUTED': return <CheckCircle2 size={16} className="text-emerald-400" />;
      case 'APPLIED': return <CheckCircle2 size={16} className="text-blue-400" />;
      case 'PENDING': return <Activity size={16} className="text-amber-400 animate-pulse" />;
      default: return <AlertTriangle size={16} className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BrainCircuit className="text-purple-500" size={32} />
            Neural Advisor
          </h2>
          <p className="text-slate-400 mt-1">Real-time AI optimization and strategy suggestions.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg">
          <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
          <span className="text-purple-400 text-sm font-medium">AI Model Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Feed */}
        <div className="lg:col-span-2 space-y-4">
          {suggestions.map((item) => (
            <div key={item.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm hover:border-slate-700 transition-all group">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${item.type === 'OPPORTUNITY' ? 'bg-emerald-500/10 text-emerald-400' : item.type === 'OPTIMIZATION' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
                    {item.type === 'OPPORTUNITY' ? <Zap size={20} /> : item.type === 'OPTIMIZATION' ? <TrendingUp size={20} /> : <Shield size={20} />}
                  </div>
                  <div>
                    <h3 className="text-slate-200 font-medium">{item.title}</h3>
                    <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/50 px-3 py-1 rounded-full border border-slate-800">
                  {getStatusIcon(item.status)}
                  <span className="text-xs font-medium text-slate-300">{item.status}</span>
                </div>
              </div>
              
              <p className="text-slate-400 text-sm mb-4 leading-relaxed">
                {item.description}
              </p>

              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Confidence:</span>
                  <span className="text-slate-200 font-medium">{item.confidence}%</span>
                  <div className="w-16 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${item.confidence}%` }} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500">Est. Value:</span>
                  <span className="text-emerald-400 font-medium">+${item.estimatedProfit.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-slate-500">Risk:</span>
                  <span className={`font-medium ${getRiskColor(item.riskLevel)}`}>{item.riskLevel}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Stats / Config Side */}
        <div className="space-y-6">
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm">
            <h3 className="text-lg font-semibold text-white mb-4">Model Performance</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Accuracy (24h)</span>
                <span className="text-emerald-400 font-medium">94.2%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '94.2%' }} />
              </div>
              
              <div className="flex justify-between items-center mt-4">
                <span className="text-slate-400 text-sm">Optimization Rate</span>
                <span className="text-blue-400 font-medium">+12.5%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '75%' }} />
              </div>

              <div className="pt-4 border-t border-slate-800 mt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-slate-400 text-sm">Total Value Added</span>
                  <span className="text-white font-bold">$1,245.50</span>
                </div>
                <p className="text-xs text-slate-500">Cumulative profit from AI optimizations this week.</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-500/20 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-2">Neural Config</h3>
            <p className="text-sm text-slate-400 mb-4">Adjust the sensitivity of the AI advisor.</p>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Risk Tolerance</span>
                  <span className="text-purple-400">Moderate</span>
                </div>
                <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300">Min Confidence</span>
                  <span className="text-purple-400">85%</span>
                </div>
                <input type="range" className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeuralAdvisor;