import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, CheckCircle, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface RiskAlert {
  id: string;
  type: 'correlation' | 'drawdown' | 'volatility' | 'var' | 'sortino';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  recommendedAction: string;
  affectedAssets: string[];
  timestamp: number;
  acknowledged: boolean;
}

const RiskAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<RiskAlert[]>([
    {
      id: '1',
      type: 'correlation',
      severity: 'medium',
      message: 'High correlation detected between WETH and WBTC (85%)',
      recommendedAction: 'Consider reducing exposure to correlated assets',
      affectedAssets: ['WETH', 'WBTC'],
      timestamp: Date.now() - 300000, // 5 minutes ago
      acknowledged: false
    },
    {
      id: '2',
      type: 'volatility',
      severity: 'low',
      message: 'Portfolio volatility increased to 18%',
      recommendedAction: 'Monitor position sizes and consider hedging',
      affectedAssets: ['Portfolio'],
      timestamp: Date.now() - 600000, // 10 minutes ago
      acknowledged: false
    }
  ]);

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'RISK_ALERT') {
      const { alert } = lastMessage.payload;
      if (alert) {
        setAlerts(prev => [alert, ...prev.slice(0, 9)]); // Keep last 10 alerts
      }
    }
  }, [lastMessage]);

  const acknowledgeAlert = (id: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === id ? { ...alert, acknowledged: true } : alert
    ));
  };

  const dismissAlert = (id: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-900/20';
      case 'high': return 'border-orange-500 bg-orange-900/20';
      case 'medium': return 'border-yellow-500 bg-yellow-900/20';
      case 'low': return 'border-blue-500 bg-blue-900/20';
      default: return 'border-gray-500 bg-gray-900/20';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <X size={16} className="text-red-400" />;
      case 'high': return <AlertTriangle size={16} className="text-orange-400" />;
      case 'medium': return <AlertTriangle size={16} className="text-yellow-400" />;
      case 'low': return <TrendingUp size={16} className="text-blue-400" />;
      default: return <AlertTriangle size={16} className="text-gray-400" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'correlation': return <TrendingUp size={14} className="text-purple-400" />;
      case 'drawdown': return <TrendingDown size={14} className="text-red-400" />;
      case 'volatility': return <AlertTriangle size={14} className="text-yellow-400" />;
      case 'var': return <TrendingDown size={14} className="text-orange-400" />;
      case 'sortino': return <CheckCircle size={14} className="text-green-400" />;
      default: return <AlertTriangle size={14} className="text-gray-400" />;
    }
  };

  const unacknowledgedCount = alerts.filter(alert => !alert.acknowledged).length;

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
          <AlertTriangle size={20} />
          Risk Alerts
          {unacknowledgedCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unacknowledgedCount}
            </span>
          )}
        </h3>
        <div className="text-xs text-gray-500">
          {alerts.length} total alerts
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
            <p>No risk alerts at this time</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className={`border-l-4 p-4 rounded-r-lg transition-all ${
                getSeverityColor(alert.severity)
              } ${alert.acknowledged ? 'opacity-60' : 'opacity-100'}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  <div className="flex-shrink-0 mt-0.5">
                    {getSeverityIcon(alert.severity)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getTypeIcon(alert.type)}
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                        {alert.type.replace('_', ' ')}
                      </span>
                      <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                        alert.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                        alert.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                        alert.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {alert.severity}
                      </span>
                      {!alert.acknowledged && (
                        <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                      )}
                    </div>

                    <p className="text-sm text-gray-200 mb-2">{alert.message}</p>

                    <div className="text-xs text-gray-400 mb-2">
                      <strong>Action:</strong> {alert.recommendedAction}
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Affected: {alert.affectedAssets.join(', ')}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {new Date(alert.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {!alert.acknowledged && (
                    <button
                      onClick={() => acknowledgeAlert(alert.id)}
                      className="text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded transition-colors"
                    >
                      Acknowledge
                    </button>
                  )}
                  <button
                    onClick={() => dismissAlert(alert.id)}
                    className="text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {alerts.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-800">
          <div className="flex justify-between items-center text-xs text-gray-500">
            <span>Auto-dismiss acknowledged alerts after 24h</span>
            <button
              onClick={() => setAlerts([])}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiskAlerts;
