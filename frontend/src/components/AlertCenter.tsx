import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, XCircle, Settings, TrendingUp, TrendingDown, Zap } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface Alert {
  id: string;
  type: 'risk' | 'performance' | 'system' | 'compliance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  source: string;
  value?: number;
  threshold?: number;
}

interface AlertRule {
  id: string;
  name: string;
  type: 'risk' | 'performance' | 'system' | 'compliance';
  condition: string;
  threshold: number;
  enabled: boolean;
  escalation: 'none' | 'email' | 'sms' | 'both';
}

const AlertCenter: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: '1',
      type: 'risk',
      severity: 'high',
      title: 'VaR Threshold Exceeded',
      message: 'Portfolio VaR has exceeded 5% threshold at 6.2%',
      timestamp: Date.now() - 300000,
      acknowledged: false,
      source: 'Risk Engine',
      value: 6.2,
      threshold: 5.0
    },
    {
      id: '2',
      type: 'performance',
      severity: 'medium',
      title: 'Strategy Underperformance',
      message: 'Spot Arbitrage strategy P&L down 12% in last hour',
      timestamp: Date.now() - 1800000,
      acknowledged: true,
      source: 'Performance Monitor',
      value: -12,
      threshold: -10
    },
    {
      id: '3',
      type: 'system',
      severity: 'low',
      title: 'High Latency Detected',
      message: 'Average execution latency increased to 450ms',
      timestamp: Date.now() - 900000,
      acknowledged: false,
      source: 'System Monitor',
      value: 450,
      threshold: 300
    }
  ]);

  const [alertRules, setAlertRules] = useState<AlertRule[]>([
    {
      id: 'var_threshold',
      name: 'VaR Threshold Alert',
      type: 'risk',
      condition: 'Portfolio VaR > 5%',
      threshold: 5.0,
      enabled: true,
      escalation: 'email'
    },
    {
      id: 'drawdown_alert',
      name: 'Max Drawdown Alert',
      type: 'risk',
      condition: 'Max Drawdown > 15%',
      threshold: 15.0,
      enabled: true,
      escalation: 'both'
    },
    {
      id: 'latency_alert',
      name: 'Execution Latency Alert',
      type: 'system',
      condition: 'Avg Latency > 300ms',
      threshold: 300,
      enabled: true,
      escalation: 'none'
    }
  ]);

  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'acknowledged'>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'risk' | 'performance' | 'system' | 'compliance'>('all');

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'ALERT_UPDATE') {
      const { alert } = lastMessage.payload;
      if (alert) {
        setAlerts(prev => [alert, ...prev.slice(0, 49)]); // Keep last 50 alerts
      }
    }
  }, [lastMessage]);

  const acknowledgeAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert
    ));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-900/30 border-red-700';
      case 'high': return 'text-orange-500 bg-orange-900/30 border-orange-700';
      case 'medium': return 'text-yellow-500 bg-yellow-900/30 border-yellow-700';
      case 'low': return 'text-blue-500 bg-blue-900/30 border-blue-700';
      default: return 'text-gray-500 bg-gray-900/30 border-gray-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'risk': return <AlertTriangle size={16} className="text-red-400" />;
      case 'performance': return <TrendingUp size={16} className="text-green-400" />;
      case 'system': return <Zap size={16} className="text-blue-400" />;
      case 'compliance': return <CheckCircle size={16} className="text-purple-400" />;
      default: return <Bell size={16} className="text-gray-400" />;
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    const statusMatch = filter === 'all' ||
      (filter === 'acknowledged' && alert.acknowledged) ||
      (filter === 'unacknowledged' && !alert.acknowledged);

    const typeMatch = typeFilter === 'all' || alert.type === typeFilter;

    return statusMatch && typeMatch;
  });

  const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <Bell size={20} />
          Alert Center
          {unacknowledgedCount > 0 && (
            <span className="bg-red-600 text-white text-xs px-2 py-1 rounded-full">
              {unacknowledgedCount}
            </span>
          )}
        </h3>
        <div className="flex items-center gap-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
          >
            <option value="all">All Alerts</option>
            <option value="unacknowledged">Unacknowledged</option>
            <option value="acknowledged">Acknowledged</option>
          </select>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
          >
            <option value="all">All Types</option>
            <option value="risk">Risk</option>
            <option value="performance">Performance</option>
            <option value="system">System</option>
            <option value="compliance">Compliance</option>
          </select>
        </div>
      </div>

      {/* Alert Rules Configuration */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
          <Settings size={16} />
          Alert Rules Configuration
        </h4>
        <div className="space-y-2">
          {alertRules.map(rule => (
            <div key={rule.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getTypeIcon(rule.type)}
                <div>
                  <p className="text-sm font-medium text-gray-200">{rule.name}</p>
                  <p className="text-xs text-gray-400">{rule.condition}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-xs ${
                  rule.escalation === 'none' ? 'bg-gray-700 text-gray-300' :
                  rule.escalation === 'email' ? 'bg-blue-900/50 text-blue-300' :
                  rule.escalation === 'sms' ? 'bg-green-900/50 text-green-300' :
                  'bg-purple-900/50 text-purple-300'
                }`}>
                  {rule.escalation.toUpperCase()}
                </span>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => {
                      setAlertRules(prev => prev.map(r =>
                        r.id === rule.id ? { ...r, enabled: e.target.checked } : r
                      ));
                    }}
                    className="sr-only"
                  />
                  <div className={`w-4 h-4 rounded border-2 transition-colors ${
                    rule.enabled ? 'bg-blue-600 border-blue-600' : 'border-gray-600'
                  }`}></div>
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle size={48} className="mx-auto mb-4 opacity-50" />
            <p>No alerts match the current filters</p>
          </div>
        ) : (
          filteredAlerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 rounded-lg border transition-all ${
                alert.acknowledged
                  ? 'bg-gray-800/30 border-gray-700 opacity-60'
                  : `border-l-4 ${getSeverityColor(alert.severity)}`
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getTypeIcon(alert.type)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-semibold text-gray-200">{alert.title}</h5>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      {alert.acknowledged && (
                        <CheckCircle size={14} className="text-green-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mb-2">{alert.message}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>{alert.source}</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      {alert.value !== undefined && alert.threshold !== undefined && (
                        <span className={alert.value > alert.threshold ? 'text-red-400' : 'text-green-400'}>
                          {alert.value > alert.threshold ? '↑' : '↓'} {alert.value} / {alert.threshold}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => acknowledgeAlert(alert.id)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AlertCenter;
