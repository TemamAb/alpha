import React, { useState, useEffect } from 'react';
import { Shield, AlertTriangle, CheckCircle, XCircle, Zap, Clock, Target } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface MEVMetrics {
  protectionStatus: 'Active' | 'Degraded' | 'Offline';
  mevAttemptsBlocked: number;
  frontRunningDetected: number;
  sandwichAttacksPrevented: number;
  gasOptimizationSavings: number;
  averageBlockDelay: number;
  successRate: number;
  timestamp: number;
}

interface MEVEvent {
  id: string;
  type: 'front-running' | 'sandwich' | 'liquidation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  blocked: boolean;
  value: number;
  description: string;
}

const MEVProtection: React.FC = () => {
  const [mevMetrics, setMevMetrics] = useState<MEVMetrics>({
    protectionStatus: 'Active',
    mevAttemptsBlocked: 47,
    frontRunningDetected: 23,
    sandwichAttacksPrevented: 12,
    gasOptimizationSavings: 1250.50,
    averageBlockDelay: 1.2,
    successRate: 98.7,
    timestamp: Date.now()
  });

  const [recentEvents, setRecentEvents] = useState<MEVEvent[]>([
    {
      id: '1',
      type: 'sandwich',
      severity: 'high',
      timestamp: Date.now() - 300000,
      blocked: true,
      value: 450.25,
      description: 'Sandwich attack on WETH/USDC arbitrage blocked'
    },
    {
      id: '2',
      type: 'front-running',
      severity: 'medium',
      timestamp: Date.now() - 600000,
      blocked: true,
      value: 125.80,
      description: 'Front-running attempt on LINK arbitrage prevented'
    },
    {
      id: '3',
      type: 'liquidation',
      severity: 'low',
      timestamp: Date.now() - 900000,
      blocked: false,
      value: 0,
      description: 'Legitimate liquidation processed'
    },
    {
      id: '4',
      type: 'sandwich',
      severity: 'critical',
      timestamp: Date.now() - 1200000,
      blocked: true,
      value: 890.60,
      description: 'Critical sandwich attack on UNI flash loan blocked'
    }
  ]);

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'MEV_UPDATE') {
      const { metrics, events } = lastMessage.payload;
      if (metrics) setMevMetrics(metrics);
      if (events) setRecentEvents(events);
    }
  }, [lastMessage]);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatTime = (value: number) => `${value.toFixed(1)}s`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'text-green-400';
      case 'Degraded': return 'text-yellow-400';
      case 'Offline': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Active': return <CheckCircle size={16} className="text-green-500" />;
      case 'Degraded': return <AlertTriangle size={16} className="text-yellow-500" />;
      case 'Offline': return <XCircle size={16} className="text-red-500" />;
      default: return <XCircle size={16} className="text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-900/30';
      case 'high': return 'text-orange-500 bg-orange-900/30';
      case 'medium': return 'text-yellow-500 bg-yellow-900/30';
      case 'low': return 'text-green-500 bg-green-900/30';
      default: return 'text-gray-500 bg-gray-900/30';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'sandwich': return <Shield size={14} className="text-red-400" />;
      case 'front-running': return <Zap size={14} className="text-yellow-400" />;
      case 'liquidation': return <Target size={14} className="text-blue-400" />;
      default: return <AlertTriangle size={14} className="text-gray-400" />;
    }
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <Shield size={20} />
          MEV Protection Dashboard
        </h3>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {getStatusIcon(mevMetrics.protectionStatus)}
            <span className={`text-sm font-semibold ${getStatusColor(mevMetrics.protectionStatus)}`}>
              {mevMetrics.protectionStatus}
            </span>
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {new Date(mevMetrics.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">MEV Attempts Blocked</p>
              <p className="text-xl font-bold text-green-400">{mevMetrics.mevAttemptsBlocked}</p>
            </div>
            <Shield className="text-green-400" size={24} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Protection Success</p>
              <p className="text-xl font-bold text-blue-400">{formatPercentage(mevMetrics.successRate)}</p>
            </div>
            <CheckCircle className="text-blue-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Gas Savings</p>
              <p className="text-xl font-bold text-purple-400">{formatCurrency(mevMetrics.gasOptimizationSavings)}</p>
            </div>
            <Zap className="text-purple-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Avg Block Delay</p>
              <p className="text-xl font-bold text-cyan-400">{formatTime(mevMetrics.averageBlockDelay)}</p>
            </div>
            <Clock className="text-cyan-400" size={20} />
          </div>
        </div>
      </div>

      {/* Attack Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Attack Types Prevented</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <Shield size={12} className="text-red-400" />
                Sandwich Attacks
              </span>
              <span className="text-sm font-bold text-red-400">{mevMetrics.sandwichAttacksPrevented}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <Zap size={12} className="text-yellow-400" />
                Front-Running
              </span>
              <span className="text-sm font-bold text-yellow-400">{mevMetrics.frontRunningDetected}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-400 flex items-center gap-2">
                <Target size={12} className="text-blue-400" />
                Liquidations
              </span>
              <span className="text-sm font-bold text-blue-400">0</span>
            </div>
          </div>
        </div>

        {/* Protection Effectiveness */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Protection Effectiveness</h4>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Detection Rate</span>
                <span className="text-green-400 font-mono">99.2%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '99.2%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">Block Rate</span>
                <span className="text-blue-400 font-mono">98.7%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '98.7%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-400">False Positives</span>
                <span className="text-yellow-400 font-mono">0.3%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '0.3%' }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Current Risk Assessment</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 bg-green-900/20 rounded">
              <span className="text-sm text-green-400">Network Congestion</span>
              <span className="text-xs text-green-400 font-mono">LOW</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-yellow-900/20 rounded">
              <span className="text-sm text-yellow-400">MEV Activity</span>
              <span className="text-xs text-yellow-400 font-mono">MODERATE</span>
            </div>
            <div className="flex items-center justify-between p-2 bg-green-900/20 rounded">
              <span className="text-sm text-green-400">Gas Price Volatility</span>
              <span className="text-xs text-green-400 font-mono">STABLE</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent MEV Events */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300">Recent MEV Events</h4>
        </div>
        <div className="overflow-x-auto max-h-80">
          <table className="w-full">
            <thead className="bg-gray-800/50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Value</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {recentEvents.map((event) => (
                <tr key={event.id} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm text-gray-200 font-mono">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-200 flex items-center gap-2">
                    {getEventIcon(event.type)}
                    <span className="capitalize">{event.type.replace('-', ' ')}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${getSeverityColor(event.severity)}`}>
                      {event.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-200 max-w-xs truncate">
                    {event.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-blue-400 font-mono">
                    {event.value > 0 ? formatCurrency(event.value) : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {event.blocked ? (
                      <CheckCircle size={16} className="text-green-500 mx-auto" />
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

export default MEVProtection;
