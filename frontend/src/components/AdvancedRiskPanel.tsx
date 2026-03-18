import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, BarChart3, AlertTriangle, Activity, Target } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface RiskMetrics {
  sharpeRatio: number;
  sortinoRatio: number;
  beta: number;
  maxDrawdown: number;
  valueAtRisk: number;
  expectedShortfall: number;
  volatility: number;
  skewness: number;
  kurtosis: number;
  timestamp: number;
}

const AdvancedRiskPanel: React.FC = () => {
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics>({
    sharpeRatio: 1.8,
    sortinoRatio: 2.1,
    beta: 0.95,
    maxDrawdown: 0.08,
    valueAtRisk: 450,
    expectedShortfall: 650,
    volatility: 0.15,
    skewness: -0.2,
    kurtosis: 3.5,
    timestamp: Date.now()
  });

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'RISK_METRICS_UPDATE') {
      const { metrics } = lastMessage.payload;
      if (metrics) {
        setRiskMetrics(metrics);
      }
    }
  }, [lastMessage]);

  const formatPercentage = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  const getRiskColor = (value: number, thresholds: { good: number; warning: number; danger: number }) => {
    if (value <= thresholds.good) return 'text-green-400';
    if (value <= thresholds.warning) return 'text-yellow-400';
    return 'text-red-400';
  };

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    color,
    subtitle,
    trend
  }: {
    title: string;
    value: string;
    icon: any;
    color: string;
    subtitle?: string;
    trend?: 'up' | 'down' | 'neutral';
  }) => (
    <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4 hover:bg-gray-900/80 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${color.replace('text-', 'bg-').replace('-400', '-900/30')}`}>
          <Icon size={16} className={color} />
        </div>
        {trend && (
          <div className={`flex items-center gap-1 text-xs ${
            trend === 'up' ? 'text-green-400' :
            trend === 'down' ? 'text-red-400' : 'text-gray-400'
          }`}>
            {trend === 'up' && <TrendingUp size={12} />}
            {trend === 'down' && <TrendingDown size={12} />}
            {trend === 'neutral' && <Activity size={12} />}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{title}</p>
        <p className="text-lg font-bold text-white">{value}</p>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>
    </div>
  );

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <BarChart3 size={20} />
          Advanced Risk Analytics
        </h3>
        <div className="text-xs text-gray-500">
          Last updated: {new Date(riskMetrics.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Primary Risk Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Sharpe Ratio"
          value={riskMetrics.sharpeRatio.toFixed(2)}
          icon={Target}
          color="text-blue-400"
          subtitle="Risk-adjusted returns"
          trend={riskMetrics.sharpeRatio > 1.5 ? 'up' : riskMetrics.sharpeRatio > 1 ? 'neutral' : 'down'}
        />
        <MetricCard
          title="Sortino Ratio"
          value={riskMetrics.sortinoRatio.toFixed(2)}
          icon={TrendingUp}
          color="text-green-400"
          subtitle="Downside risk only"
          trend={riskMetrics.sortinoRatio > 2 ? 'up' : riskMetrics.sortinoRatio > 1.5 ? 'neutral' : 'down'}
        />
        <MetricCard
          title="Beta"
          value={riskMetrics.beta.toFixed(3)}
          icon={Activity}
          color="text-purple-400"
          subtitle="Market correlation"
          trend={Math.abs(riskMetrics.beta - 1) < 0.2 ? 'neutral' : 'down'}
        />
        <MetricCard
          title="Max Drawdown"
          value={formatPercentage(riskMetrics.maxDrawdown)}
          icon={TrendingDown}
          color="text-red-400"
          subtitle="Worst peak-to-trough"
          trend={riskMetrics.maxDrawdown < 0.1 ? 'up' : riskMetrics.maxDrawdown < 0.2 ? 'neutral' : 'down'}
        />
      </div>

      {/* Risk Measures */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} />
            Tail Risk Measures
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">VaR (99%, 1d)</span>
              <span className={`text-sm font-bold ${getRiskColor(riskMetrics.valueAtRisk, {good: 300, warning: 500, danger: 700})}`}>
                {formatCurrency(riskMetrics.valueAtRisk)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Expected Shortfall (CVaR)</span>
              <span className={`text-sm font-bold ${getRiskColor(riskMetrics.expectedShortfall, {good: 400, warning: 600, danger: 800})}`}>
                {formatCurrency(riskMetrics.expectedShortfall)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
            <BarChart3 size={16} />
            Distribution Statistics
          </h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Volatility (Annualized)</span>
              <span className={`text-sm font-bold ${getRiskColor(riskMetrics.volatility, {good: 0.1, warning: 0.2, danger: 0.3})}`}>
                {formatPercentage(riskMetrics.volatility)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Skewness</span>
              <span className={`text-sm font-bold ${Math.abs(riskMetrics.skewness) < 0.5 ? 'text-green-400' : 'text-yellow-400'}`}>
                {riskMetrics.skewness.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400">Kurtosis</span>
              <span className={`text-sm font-bold ${riskMetrics.kurtosis < 4 ? 'text-green-400' : riskMetrics.kurtosis < 6 ? 'text-yellow-400' : 'text-red-400'}`}>
                {riskMetrics.kurtosis.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Assessment Summary */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-3">Risk Assessment</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              riskMetrics.sharpeRatio > 1.5 && riskMetrics.sortinoRatio > 2 && riskMetrics.maxDrawdown < 0.15
                ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-gray-400">Return Efficiency</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              riskMetrics.volatility < 0.2 && Math.abs(riskMetrics.beta) < 1.2
                ? 'bg-green-500' : 'bg-yellow-500'
            }`}></div>
            <span className="text-gray-400">Volatility Control</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              riskMetrics.valueAtRisk < 500 && riskMetrics.expectedShortfall < 700
                ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-gray-400">Tail Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdvancedRiskPanel;
