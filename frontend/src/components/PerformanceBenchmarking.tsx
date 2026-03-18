import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Zap, Shield, Network, Target, Clock, CheckCircle, XCircle, Activity } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { alphaOrionAPI } from '../services/api';

interface ApexBenchmarkData {
  latency: {
    competitor: string;
    target_ms: number;
    current_ms: number;
    status: 'PASS' | 'FAIL';
  };
  mev_protection: {
    competitor: string;
    target_rate: number;
    current_rate: number;
    status: 'PASS' | 'FAIL';
  };
  liquidity_depth: {
    competitor: string;
    target_count: number;
    current_count: number;
    status: 'PASS' | 'FAIL';
  };
}

interface BenchmarkHistory {
  timestamp: string;
  metric: string;
  value: number;
  status: 'PASS' | 'FAIL';
}

const PerformanceBenchmarking: React.FC = () => {
  const [apexData, setApexData] = useState<ApexBenchmarkData | null>(null);
  const [benchmarkHistory, setBenchmarkHistory] = useState<BenchmarkHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBenchmarkData = async () => {
      try {
        const [statusData, historyData] = await Promise.all([
          alphaOrionAPI.getBenchmarkStatus(),
          alphaOrionAPI.getBenchmarkHistory(50)
        ]);

        if (statusData) setApexData(statusData);
        if (historyData) setBenchmarkHistory(historyData);
      } catch (error) {
        console.error('Failed to fetch benchmark data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBenchmarkData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchBenchmarkData, 30000);
    return () => clearInterval(interval);
  }, []);

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'BENCHMARK_UPDATE') {
      const { status, history } = lastMessage.payload;
      if (status) setApexData(status);
      if (history) setBenchmarkHistory(history);
    }
  }, [lastMessage]);

  const formatMs = (value: number) => `${value.toFixed(1)}ms`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const getStatusIcon = (status: 'PASS' | 'FAIL') => {
    return status === 'PASS' ?
      <CheckCircle className="text-green-400" size={16} /> :
      <XCircle className="text-red-400" size={16} />;
  };

  const getStatusColor = (status: 'PASS' | 'FAIL') => {
    return status === 'PASS' ? 'text-green-400' : 'text-red-400';
  };

  if (loading) {
    return (
      <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Loading Apex Benchmarks...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <Target size={20} />
          Apex Benchmarking System
        </h3>
        <div className="text-xs text-gray-500">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Apex Benchmark Cards */}
      {apexData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Latency Benchmark */}
          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="text-yellow-400" size={20} />
                <span className="text-sm font-semibold text-gray-200">Latency</span>
              </div>
              {getStatusIcon(apexData.latency.status)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">vs {apexData.latency.competitor}:</span>
                <span className={`font-mono ${getStatusColor(apexData.latency.status)}`}>
                  {formatMs(apexData.latency.current_ms)} / {formatMs(apexData.latency.target_ms)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${apexData.latency.status === 'PASS' ? 'bg-green-400' : 'bg-red-400'}`}
                  style={{ width: `${Math.min((apexData.latency.current_ms / apexData.latency.target_ms) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* MEV Protection Benchmark */}
          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Shield className="text-blue-400" size={20} />
                <span className="text-sm font-semibold text-gray-200">MEV Protection</span>
              </div>
              {getStatusIcon(apexData.mev_protection.status)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">vs {apexData.mev_protection.competitor}:</span>
                <span className={`font-mono ${getStatusColor(apexData.mev_protection.status)}`}>
                  {formatPercentage(apexData.mev_protection.current_rate)} / {formatPercentage(apexData.mev_protection.target_rate)}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${apexData.mev_protection.status === 'PASS' ? 'bg-green-400' : 'bg-red-400'}`}
                  style={{ width: `${(apexData.mev_protection.current_rate / apexData.mev_protection.target_rate) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* Liquidity Depth Benchmark */}
          <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Network className="text-purple-400" size={20} />
                <span className="text-sm font-semibold text-gray-200">Liquidity Depth</span>
              </div>
              {getStatusIcon(apexData.liquidity_depth.status)}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">vs {apexData.liquidity_depth.competitor}:</span>
                <span className={`font-mono ${getStatusColor(apexData.liquidity_depth.status)}`}>
                  {apexData.liquidity_depth.current_count} / {apexData.liquidity_depth.target_count}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${apexData.liquidity_depth.status === 'PASS' ? 'bg-green-400' : 'bg-red-400'}`}
                  style={{ width: `${(apexData.liquidity_depth.current_count / apexData.liquidity_depth.target_count) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Benchmark History Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Benchmark Performance History</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={benchmarkHistory.slice(-20)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="timestamp"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickFormatter={(value) => new Date(value).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                  labelFormatter={(value) => new Date(value).toLocaleString()}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Benchmark Activity */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Recent Benchmark Activity</h4>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {benchmarkHistory.slice(-10).reverse().map((entry, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity size={16} className="text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-200 capitalize">{entry.metric.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-500">{new Date(entry.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-gray-300">
                    {entry.metric === 'latency' ? formatMs(entry.value) :
                     entry.metric === 'mev_protection' ? formatPercentage(entry.value) :
                     entry.value}
                  </span>
                  {getStatusIcon(entry.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Apex Benchmark Standards Table */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300">Apex Benchmark Standards</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Metric</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Competitor</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Target</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Current</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {apexData && (
                <>
                  <tr className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm text-gray-200 font-medium flex items-center gap-2">
                      <Zap size={14} className="text-yellow-400" />
                      Tick-to-Trade Latency
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{apexData.latency.competitor}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400 font-mono">{formatMs(apexData.latency.target_ms)}</td>
                    <td className="px-4 py-3 text-sm text-right text-blue-400 font-mono">{formatMs(apexData.latency.current_ms)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        apexData.latency.status === 'PASS'
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}>
                        {apexData.latency.status}
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm text-gray-200 font-medium flex items-center gap-2">
                      <Shield size={14} className="text-blue-400" />
                      MEV Protection Rate
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{apexData.mev_protection.competitor}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400 font-mono">{formatPercentage(apexData.mev_protection.target_rate)}</td>
                    <td className="px-4 py-3 text-sm text-right text-blue-400 font-mono">{formatPercentage(apexData.mev_protection.current_rate)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        apexData.mev_protection.status === 'PASS'
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}>
                        {apexData.mev_protection.status}
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm text-gray-200 font-medium flex items-center gap-2">
                      <Network size={14} className="text-purple-400" />
                      Liquidity Sources
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-300">{apexData.liquidity_depth.competitor}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-400 font-mono">{apexData.liquidity_depth.target_count}</td>
                    <td className="px-4 py-3 text-sm text-right text-blue-400 font-mono">{apexData.liquidity_depth.current_count}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        apexData.liquidity_depth.status === 'PASS'
                          ? 'bg-green-900/30 text-green-400'
                          : 'bg-red-900/30 text-red-400'
                      }`}>
                        {apexData.liquidity_depth.status}
                      </span>
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceBenchmarking;
