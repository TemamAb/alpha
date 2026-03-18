import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Zap, Clock, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface ExecutionMetrics {
  averageSlippage: number;
  successRate: number;
  averageExecutionTime: number;
  gasEfficiency: number;
  timestamp: number;
}

interface SlippageData {
  time: string;
  slippage: number;
  expected: number;
  actual: number;
}

interface ExecutionData {
  pair: string;
  successRate: number;
  avgSlippage: number;
  avgTime: number;
  volume: number;
}

const ExecutionQuality: React.FC = () => {
  const [executionMetrics, setExecutionMetrics] = useState<ExecutionMetrics>({
    averageSlippage: 0.12,
    successRate: 94.7,
    averageExecutionTime: 1.8,
    gasEfficiency: 87.3,
    timestamp: Date.now()
  });

  const [slippageData, setSlippageData] = useState<SlippageData[]>([
    { time: '00:00', slippage: 0.08, expected: 0.05, actual: 0.13 },
    { time: '04:00', slippage: 0.15, expected: 0.08, actual: 0.23 },
    { time: '08:00', slippage: 0.09, expected: 0.06, actual: 0.15 },
    { time: '12:00', slippage: 0.22, expected: 0.12, actual: 0.34 },
    { time: '16:00', slippage: 0.11, expected: 0.07, actual: 0.18 },
    { time: '20:00', slippage: 0.14, expected: 0.09, actual: 0.23 }
  ]);

  const [executionData, setExecutionData] = useState<ExecutionData[]>([
    { pair: 'WETH/USDC', successRate: 96.2, avgSlippage: 0.08, avgTime: 1.2, volume: 125000 },
    { pair: 'WBTC/USDC', successRate: 93.8, avgSlippage: 0.15, avgTime: 2.1, volume: 89000 },
    { pair: 'MATIC/USDC', successRate: 95.1, avgSlippage: 0.11, avgTime: 1.8, volume: 67000 },
    { pair: 'LINK/USDC', successRate: 92.4, avgSlippage: 0.18, avgTime: 2.5, volume: 45000 },
    { pair: 'UNI/USDC', successRate: 94.7, avgSlippage: 0.13, avgTime: 1.9, volume: 38000 }
  ]);

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'EXECUTION_UPDATE') {
      const { metrics, slippage, executions } = lastMessage.payload;
      if (metrics) setExecutionMetrics(metrics);
      if (slippage) setSlippageData(slippage);
      if (executions) setExecutionData(executions);
    }
  }, [lastMessage]);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatTime = (value: number) => `${value.toFixed(1)}s`;
  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;

  const getSlippageColor = (slippage: number) => {
    if (slippage < 0.1) return 'text-green-400';
    if (slippage < 0.2) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getSuccessColor = (rate: number) => {
    if (rate >= 95) return 'text-green-400';
    if (rate >= 90) return 'text-yellow-400';
    return 'text-red-400';
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">{label}</p>
          <p className="text-blue-400">Expected: {formatPercentage(payload[0]?.value || 0)}</p>
          <p className="text-red-400">Actual: {formatPercentage(payload[1]?.value || 0)}</p>
          <p className="text-purple-400">Slippage: {formatPercentage(payload[2]?.value || 0)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <Zap size={20} />
          Execution Quality
        </h3>
        <div className="text-xs text-gray-500">
          Last updated: {new Date(executionMetrics.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Avg Slippage</p>
              <p className="text-xl font-bold text-blue-400">{formatPercentage(executionMetrics.averageSlippage)}</p>
            </div>
            <TrendingUp className="text-blue-400" size={24} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Success Rate</p>
              <p className="text-xl font-bold text-green-400">{formatPercentage(executionMetrics.successRate)}</p>
            </div>
            <CheckCircle className="text-green-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Avg Execution Time</p>
              <p className="text-xl font-bold text-purple-400">{formatTime(executionMetrics.averageExecutionTime)}</p>
            </div>
            <Clock className="text-purple-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Gas Efficiency</p>
              <p className="text-xl font-bold text-cyan-400">{formatPercentage(executionMetrics.gasEfficiency)}</p>
            </div>
            <Zap className="text-cyan-400" size={20} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Slippage Over Time */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Slippage Analysis (24h)</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={slippageData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="time"
                  stroke="#9CA3AF"
                  fontSize={12}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatPercentage} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="expected"
                  stroke="#10b981"
                  strokeWidth={2}
                  name="Expected"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Actual"
                />
                <Line
                  type="monotone"
                  dataKey="slippage"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  name="Slippage"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Success Rate by Pair */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Success Rate by Trading Pair</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={executionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="pair"
                  stroke="#9CA3AF"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatPercentage} />
                <Tooltip
                  formatter={(value: number) => [formatPercentage(value), 'Success Rate']}
                  labelStyle={{ color: '#e5e7eb' }}
                  contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151' }}
                />
                <Bar dataKey="successRate" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Execution Table */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300">Execution Performance by Pair</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Trading Pair</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Success Rate</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Slippage</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Avg Time</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Volume (24h)</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {executionData.map((exec) => (
                <tr key={exec.pair} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm text-gray-200 font-medium">{exec.pair}</td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`font-mono ${getSuccessColor(exec.successRate)}`}>
                      {formatPercentage(exec.successRate)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <span className={`font-mono ${getSlippageColor(exec.avgSlippage)}`}>
                      {formatPercentage(exec.avgSlippage)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-purple-400 font-mono">
                    {formatTime(exec.avgTime)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-blue-400 font-mono">
                    {formatCurrency(exec.volume)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {exec.successRate >= 95 ? (
                      <CheckCircle size={16} className="text-green-500 mx-auto" />
                    ) : exec.successRate >= 90 ? (
                      <AlertTriangle size={16} className="text-yellow-500 mx-auto" />
                    ) : (
                      <XCircle size={16} className="text-red-500 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExecutionQuality;
