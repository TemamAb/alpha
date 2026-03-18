import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BarChart3, TrendingUp, Target, Zap, Activity } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface MonteCarloResult {
  simulation: number;
  finalValue: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalReturn: number;
}

interface DistributionData {
  range: string;
  count: number;
  percentage: number;
}

interface MonteCarloStats {
  mean: number;
  median: number;
  stdDev: number;
  min: number;
  max: number;
  percentile5: number;
  percentile95: number;
  successRate: number;
}

const MonteCarloVisualizer: React.FC = () => {
  const [results, setResults] = useState<MonteCarloResult[]>([]);
  const [stats, setStats] = useState<MonteCarloStats>({
    mean: 125000,
    median: 118000,
    stdDev: 25000,
    min: 65000,
    max: 285000,
    percentile5: 85000,
    percentile95: 185000,
    successRate: 78.5
  });

  const [distributionData, setDistributionData] = useState<DistributionData[]>([
    { range: '< $80K', count: 85, percentage: 8.5 },
    { range: '$80K - $100K', count: 245, percentage: 24.5 },
    { range: '$100K - $120K', count: 320, percentage: 32.0 },
    { range: '$120K - $140K', count: 215, percentage: 21.5 },
    { range: '$140K - $160K', count: 95, percentage: 9.5 },
    { range: '$160K - $180K', count: 30, percentage: 3.0 },
    { range: '> $180K', count: 10, percentage: 1.0 }
  ]);

  const [selectedSimulation, setSelectedSimulation] = useState<number | null>(null);
  const [numSimulations, setNumSimulations] = useState<number>(1000);

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'MONTE_CARLO_UPDATE') {
      const { results: newResults, stats: newStats, distribution } = lastMessage.payload;
      if (newResults) setResults(newResults);
      if (newStats) setStats(newStats);
      if (distribution) setDistributionData(distribution);
    }
  }, [lastMessage]);

  // Generate sample Monte Carlo results
  useEffect(() => {
    const generateResults = () => {
      const simulations = [];
      for (let i = 0; i < numSimulations; i++) {
        const finalValue = 100000 * (1 + (Math.random() - 0.4) * 2); // Random return between -40% and +160%
        const maxDrawdown = Math.random() * 0.4; // Max drawdown up to 40%
        const sharpeRatio = 1 + Math.random() * 2; // Sharpe between 1 and 3
        const totalReturn = (finalValue - 100000) / 100000;

        simulations.push({
          simulation: i + 1,
          finalValue,
          maxDrawdown,
          sharpeRatio,
          totalReturn
        });
      }
      setResults(simulations);
    };

    generateResults();
  }, [numSimulations]);

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const scatterData = results.map(result => ({
    x: result.totalReturn,
    y: result.maxDrawdown,
    simulation: result.simulation,
    finalValue: result.finalValue,
    sharpeRatio: result.sharpeRatio
  }));

  const CustomScatterTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">Simulation {data.simulation}</p>
          <p className="text-blue-400">Final Value: {formatCurrency(data.finalValue)}</p>
          <p className="text-green-400">Total Return: {formatPercentage(data.x)}</p>
          <p className="text-red-400">Max Drawdown: {formatPercentage(data.y)}</p>
          <p className="text-purple-400">Sharpe Ratio: {data.sharpeRatio.toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  const distributionChartData = distributionData.map(item => ({
    name: item.range,
    count: item.count,
    percentage: item.percentage
  }));

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">{label}</p>
          <p className="text-blue-400">Count: {payload[0]?.value}</p>
          <p className="text-green-400">Percentage: {formatPercentage(payload[0]?.value / numSimulations)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <BarChart3 size={20} />
          Monte Carlo Simulation
        </h3>
        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-500">
            {numSimulations.toLocaleString()} Simulations
          </div>
          <select
            value={numSimulations}
            onChange={(e) => setNumSimulations(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
          >
            <option value={100}>100 Simulations</option>
            <option value={500}>500 Simulations</option>
            <option value={1000}>1,000 Simulations</option>
            <option value={5000}>5,000 Simulations</option>
            <option value={10000}>10,000 Simulations</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Expected Value</p>
              <p className="text-xl font-bold text-blue-400">{formatCurrency(stats.mean)}</p>
            </div>
            <Target className="text-blue-400" size={24} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Median</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(stats.median)}</p>
            </div>
            <TrendingUp className="text-green-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Standard Deviation</p>
              <p className="text-xl font-bold text-yellow-400">{formatCurrency(stats.stdDev)}</p>
            </div>
            <Activity className="text-yellow-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Success Rate</p>
              <p className="text-xl font-bold text-purple-400">{formatPercentage(stats.successRate / 100)}</p>
            </div>
            <Zap className="text-purple-400" size={20} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Risk-Return Scatter Plot */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Risk-Return Distribution</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart data={scatterData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Total Return"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={formatPercentage}
                  label={{ value: 'Total Return', position: 'insideBottom', offset: -5 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Max Drawdown"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={formatPercentage}
                  label={{ value: 'Max Drawdown', angle: -90, position: 'insideLeft' }}
                />
                <Tooltip content={<CustomScatterTooltip />} />
                <Scatter dataKey="y" fill="#3b82f6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Distribution Histogram */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Final Value Distribution</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={distributionChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip content={<CustomBarTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Confidence Intervals */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Confidence Intervals</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">5th Percentile</p>
              <p className="text-lg font-bold text-red-400">{formatCurrency(stats.percentile5)}</p>
              <p className="text-xs text-gray-500">Worst 5% of outcomes</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">Median (50th)</p>
              <p className="text-lg font-bold text-blue-400">{formatCurrency(stats.median)}</p>
              <p className="text-xs text-gray-500">Most likely outcome</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-2">95th Percentile</p>
              <p className="text-lg font-bold text-green-400">{formatCurrency(stats.percentile95)}</p>
              <p className="text-xs text-gray-500">Best 5% of outcomes</p>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Metrics Summary */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Risk Metrics Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Value at Risk (95%)</p>
            <p className="text-sm font-bold text-red-400">
              -{formatPercentage((stats.mean - stats.percentile5) / stats.mean)}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Expected Shortfall</p>
            <p className="text-sm font-bold text-orange-400">
              -{formatPercentage((stats.mean - stats.min) / stats.mean)}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Upside Potential</p>
            <p className="text-sm font-bold text-green-400">
              +{formatPercentage((stats.max - stats.mean) / stats.mean)}
            </p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-3">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Probability of Profit</p>
            <p className="text-sm font-bold text-blue-400">{formatPercentage(stats.successRate / 100)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonteCarloVisualizer;
