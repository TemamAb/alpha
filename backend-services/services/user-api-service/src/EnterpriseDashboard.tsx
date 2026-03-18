import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// --- Helper Components ---

const StatCard = ({ title, value, change, isCurrency = false }) => (
  <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
    <h3 className="text-sm font-medium text-slate-400 uppercase">{title}</h3>
    <p className={`text-3xl font-bold mt-2 ${isCurrency ? 'text-emerald-400' : 'text-white'}`}>
      {isCurrency ? `$${value.toLocaleString()}` : value}
    </p>
    {change && (
      <p className={`text-xs mt-1 ${change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
        {change} vs last 24h
      </p>
    )}
  </div>
);

const WithdrawalPanel = () => {
  const [settings, setSettings] = useState({
    withdrawal_mode: 'auto',
    auto_withdrawal_threshold: 1000,
    profit_withdrawal_address: '',
  });
  const [message, setMessage] = useState({ text: '', type: '' });

  const fetchSettings = useCallback(async () => {
    try {
      // NOTE: In a real app, the token would come from auth context
      const token = localStorage.getItem('jwt_token');
      const { data } = await axios.get('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSettings(data);
    } catch (error) {
      console.error("Failed to fetch settings", error);
      setMessage({ text: 'Failed to load settings.', type: 'error' });
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      await axios.put('/api/settings', settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: 'Settings saved successfully!', type: 'success' });
    } catch (error) {
      console.error("Failed to save settings", error);
      setMessage({ text: 'Failed to save settings.', type: 'error' });
    }
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  const handleManualWithdraw = async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const { data } = await axios.post('/api/withdraw/manual', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ text: `Withdrawal of $${data.amount} submitted!`, type: 'success' });
      fetchSettings(); // Refresh data
    } catch (error) {
      console.error("Manual withdrawal failed", error);
      setMessage({ text: 'Manual withdrawal failed.', type: 'error' });
    }
    setTimeout(() => setMessage({ text: '', type: '' }), 3000);
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mt-6">
      <h3 className="text-xl font-bold text-white mb-4">Profit Withdrawal Control</h3>
      {message.text && (
        <div className={`p-3 rounded-md mb-4 text-sm ${message.type === 'success' ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
          {message.text}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Withdrawal Mode</label>
          <select
            value={settings.withdrawal_mode}
            onChange={(e) => setSettings({ ...settings, withdrawal_mode: e.target.value })}
            className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-white"
          >
            <option value="auto">Auto-Pilot</option>
            <option value="manual">Manual</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Auto-Withdrawal Threshold ($)</label>
          <input
            type="number"
            value={settings.auto_withdrawal_threshold}
            onChange={(e) => setSettings({ ...settings, auto_withdrawal_threshold: parseFloat(e.target.value) })}
            className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-white"
            disabled={settings.withdrawal_mode !== 'auto'}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-400 mb-1">Profit Destination Wallet</label>
          <input
            type="text"
            placeholder="0x..."
            value={settings.profit_withdrawal_address || ''}
            onChange={(e) => setSettings({ ...settings, profit_withdrawal_address: e.target.value })}
            className="w-full bg-slate-900 border border-slate-600 rounded-md p-2 text-white font-mono"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-between items-center">
        <button
          onClick={handleSave}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
          Save Settings
        </button>
        {settings.withdrawal_mode === 'manual' && (
          <button
            onClick={handleManualWithdraw}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
          >
            Withdraw Manually
          </button>
        )}
      </div>
    </div>
  );
};

const MonitoringDashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      const { data: dashboardData } = await axios.get('/api/monitoring/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(dashboardData);
    } catch (err) {
      console.error("Failed to fetch monitoring data", err);
      setError('Failed to load monitoring data. Service may be unavailable.');
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000); // Refresh every 15 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  if (error) {
    return <div className="text-center text-red-400 p-8">{error}</div>;
  }

  if (!data) {
    return <div className="text-center text-slate-400 p-8">Loading Monitoring Data...</div>;
  }

  const statusColor = {
    'HEALTHY': 'text-green-400',
    'WARNING': 'text-yellow-400',
    'CRITICAL': 'text-red-400',
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 mt-6">
      <h3 className="text-xl font-bold text-white mb-4">System Health & KPIs</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="text-center">
          <h4 className="text-sm font-medium text-slate-400 uppercase">Overall Status</h4>
          <p className={`text-2xl font-bold mt-2 ${statusColor[data.systemStatus] || 'text-white'}`}>
            {data.systemStatus}
          </p>
        </div>
        <div className="text-center">
          <h4 className="text-sm font-medium text-slate-400 uppercase">Recent Alerts</h4>
          <p className="text-2xl font-bold mt-2 text-white">{data.metrics.recentAlerts}</p>
        </div>
        <div className="text-center">
          <h4 className="text-sm font-medium text-slate-400 uppercase">Critical Alerts</h4>
          <p className="text-2xl font-bold mt-2 text-red-500">{data.metrics.criticalAlerts}</p>
        </div>
        <div className="text-center">
          <h4 className="text-sm font-medium text-slate-400 uppercase">Open Incidents</h4>
          <p className="text-2xl font-bold mt-2 text-yellow-500">{data.metrics.openIncidents}</p>
        </div>
      </div>

      <div className="mt-8">
        <h4 className="text-lg font-semibold text-white mb-3">Service Level Objectives (SLOs)</h4>
        <div className="space-y-3">
          {Object.values(data.sloStatus).map((slo: any) => (
            <div key={slo.name} className="bg-slate-900 p-3 rounded-md flex justify-between items-center">
              <span className="font-medium text-slate-300">{slo.name}</span>
              <span className={`font-bold ${slo.status === 'COMPLIANT' ? 'text-green-400' : 'text-red-400'}`}>
                {slo.status} ({(slo.current * 100).toFixed(2)}% / {(slo.target * 100).toFixed(2)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- Main Dashboard Component ---

export default function EnterpriseDashboard() {
  const [pnlData, setPnlData] = useState({
    totalPnL: 0,
    realizedProfit: 0,
    unrealizedProfit: 0,
    totalTrades: 0,
  });

  const fetchPnlData = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/analytics/total-pnl');
      setPnlData(data);
    } catch (error) {
      console.error("Failed to fetch PnL data", error);
    }
  }, []);

  useEffect(() => {
    fetchPnlData();
    const interval = setInterval(fetchPnlData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, [fetchPnlData]);

  return (
    <div className="bg-slate-900 text-white min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight">Alpha-Orion Enterprise Dashboard</h1>
          <p className="text-slate-400 mt-2">Real-time monitoring and control for arbitrage operations.</p>
        </header>

        {/* --- Core Profit Metrics --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total P&L"
            value={pnlData.totalPnL}
            change="+5.2%"
            isCurrency
          />
          <StatCard
            title="Realized Profit"
            value={pnlData.realizedProfit}
            isCurrency
          />
          <StatCard
            title="Unrealized Profit"
            value={pnlData.unrealizedProfit}
            isCurrency
          />
          <StatCard
            title="Total Trades (24h)"
            value={pnlData.totalTrades}
            change="+15"
          />
        </div>

        {/* --- Monitoring & KPIs --- */}
        <MonitoringDashboard />

        {/* --- Withdrawal Panel --- */}
        <WithdrawalPanel />

      </div>
    </div>
  );
}
