
import React, { useState } from 'react';
import Card from '../components/ui/Card';
import { useApiData } from '../hooks/useApiData';
import { Strategy } from '../types';
import { getStrategyOptimization, OptimizationResult } from '../services/openaiService';
import { Bot, Cpu, Zap } from 'lucide-react';

const StrategyCard: React.FC<{ strategy: Strategy }> = ({ strategy }) => (
  <Card className="flex flex-col justify-between">
    <div>
      <div className="flex justify-between items-start">
        <h4 className="text-lg font-bold text-white">{strategy.name}</h4>
        <div className={`w-3 h-3 rounded-full mt-1 ${strategy.isActive ? 'bg-green-500' : 'bg-gray-600'}`}></div>
      </div>
      <p className="text-sm mt-1 mb-4">{strategy.description}</p>
    </div>
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="text-gray-500">Total PnL</p>
        <p className={`font-semibold ${strategy.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          ${strategy.pnl.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </p>
      </div>
      <div>
        <p className="text-gray-500">Win Rate</p>
        <p className="font-semibold text-white">{strategy.winRate.toFixed(2)}%</p>
      </div>
    </div>
  </Card>
);

const Strategies: React.FC = () => {
  const { strategies, loading, error } = useApiData();
  const [isLoading, setIsLoading] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);

  const handleOptimize = async () => {
    setIsLoading(true);
    setOptimizationResult(null);
    const prompt = `Current strategies: ${JSON.stringify(strategies)}. Market volatility is medium. Find optimization.`;
    const result = await getStrategyOptimization(prompt);
    setOptimizationResult(result);
    setIsLoading(false);
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-bold text-white mb-4">Active Strategies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map(s => <StrategyCard key={s.id} strategy={s} />)}
        </div>
      </div>

      <Card title="AI Strategy Optimizer (Powered by Gemini)">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="flex-1">
            <p className="mb-4">
              Leverage our AI-powered engine to analyze current market conditions and strategy performance. Get actionable suggestions to optimize your arbitrage bots.
            </p>
            <button
              onClick={handleOptimize}
              disabled={isLoading}
              className="flex items-center justify-center px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <Cpu className="animate-spin w-5 h-5 mr-2" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Run Optimization
                </>
              )}
            </button>
          </div>
          <div className="flex-1 min-h-[150px] bg-gray-900/50 rounded-lg p-4 flex items-center justify-center">
            {isLoading && <p className="text-gray-400">AI is thinking...</p>}
            {!isLoading && !optimizationResult && (
              <div className="text-center text-gray-500">
                <Bot className="w-10 h-10 mx-auto mb-2" />
                <p>Optimization results will appear here.</p>
              </div>
            )}
            {optimizationResult && (
              <div className="space-y-3 text-sm">
                <p className="font-semibold text-white">AI Suggestion:</p>
                <p className="text-blue-300 bg-blue-500/10 p-3 rounded-md">{optimizationResult.suggestion}</p>
                <div className="grid grid-cols-2 gap-2 pt-2">
                    <p>Confidence: <span className="font-bold text-white">{(optimizationResult.confidence * 100).toFixed(0)}%</span></p>
                    <p>Expected Profit/Trade: <span className="font-bold text-green-400">${optimizationResult.expectedProfit.toFixed(2)}</span></p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Strategies;
