import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useApiData } from '../hooks/useApiData';
import { Service, Opportunity } from '../hooks/useApiData';
import { DollarSign, Zap, Server, Activity, Settings, RefreshCw, Play, AlertTriangle, CheckCircle } from 'lucide-react';
import IntelligenceDashboard from '../components/IntelligenceDashboard';

const MetricCard = ({ title, value, icon: Icon, change }: { title: string; value: string; icon: React.ElementType; change?: string }) => (
  <Card className="flex flex-col">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-gray-400">{title}</p>
      <Icon className="w-5 h-5 text-gray-500" />
    </div>
    <div className="mt-2">
      <p className="text-2xl font-semibold text-white">{value}</p>
      {change && <p className="text-xs text-green-400">{change}</p>}
    </div>
  </Card>
);

const Dashboard: React.FC = () => {
  const { services, opportunities, pnlData, analytics, loading, error } = useApiData();
  const { totalPnl, totalTrades } = analytics;

  const [withdrawalMode, setWithdrawalMode] = useState<'manual' | 'auto'>('manual');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalAddress, setWithdrawalAddress] = useState('');
  const [autoThreshold, setAutoThreshold] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawalResult, setWithdrawalResult] = useState<string | null>(null);

  const [walletAddress, setWalletAddress] = useState(localStorage.getItem('walletAddress') || '');
  const [isEditingWallet, setIsEditingWallet] = useState(false);
  const [walletResult, setWalletResult] = useState<string | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [reinvestmentRate, setReinvestmentRate] = useState(parseInt(localStorage.getItem('reinvestmentRate') || '50'));
  const [deployMode, setDeployMode] = useState<'sim' | 'live'>('sim');
  const [currency, setCurrency] = useState<'USD' | 'ETH'>(localStorage.getItem('currency') as 'USD' | 'ETH' || 'USD');
  const [settingsResult, setSettingsResult] = useState<string | null>(null);
  const [deployMode, setDeployMode] = useState<'production' | 'live-simulation'>('live-simulation');
  const [isProductionMode, setIsProductionMode] = useState(false);

  // Check current mode on mount
  useEffect(() => {
    const fetchMode = async () => {
      try {
        const response = await fetch('http://localhost:8080/mode/status');
        const data = await response.json();
        setDeployMode(data.mode);
        setIsProductionMode(data.mode === 'live');
      } catch (error) {
        console.error('Error fetching mode:', error);
      }
    };
    fetchMode();
    const interval = setInterval(fetchMode, 5000); // Check every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const onlineServices = services.filter(s => s.status === 'online').length;



  const isValidWalletAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const maskWalletAddress = (address: string) => {
    if (address.length < 10) return address;
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  const handleSaveWallet = () => {
    if (!isValidWalletAddress(walletAddress)) {
      setWalletResult('Invalid wallet address');
      return;
    }
    localStorage.setItem('walletAddress', walletAddress);
    setIsEditingWallet(false);
    setWalletResult('Wallet address saved successfully');
    setTimeout(() => setWalletResult(null), 3000);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('reinvestmentRate', reinvestmentRate.toString());
    localStorage.setItem('deployMode', deployMode);
    localStorage.setItem('currency', currency);
    setSettingsResult('Settings saved successfully');
    setTimeout(() => setSettingsResult(null), 3000);
  };

  const handleDataRefresh = () => {
    // Mock data refresh
    setSettingsResult('Data refreshed successfully');
    setTimeout(() => setSettingsResult(null), 3000);
  };

  const handleDeploy = () => {
    // Mock deploy
    setSettingsResult(`Deployed to ${deployMode} mode`);
    setTimeout(() => setSettingsResult(null), 3000);
  };

  const handleModeSwitch = async () => {
    const newMode = deployMode === 'sim' ? 'live' : 'sim';
    try {
      const response = await fetch('http://localhost:8080/mode/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: newMode, confirmation: true }),
      });
      const data = await response.json();
      if (response.ok) {
        setSettingsResult(`Mode switched to ${newMode}`);
        setDeployMode(newMode);
        setIsProductionMode(newMode === 'live');
      } else {
        setSettingsResult(data.error || 'Mode switch failed');
      }
    } catch (error) {
      setSettingsResult('Error switching mode');
    }
    setTimeout(() => setSettingsResult(null), 3000);
  };

  const handleWithdrawal = async () => {
    if (withdrawalMode === 'manual' && (!withdrawalAmount || !withdrawalAddress)) return;
    if (withdrawalMode === 'auto' && (!autoThreshold || !withdrawalAddress)) return;
    setIsWithdrawing(true);
    setWithdrawalResult(null);
    try {
      const payload = withdrawalMode === 'manual'
        ? { mode: 'manual', amount: parseFloat(withdrawalAmount), address: withdrawalAddress }
        : { mode: 'auto', threshold: parseFloat(autoThreshold), address: withdrawalAddress };
      const response = await fetch('http://localhost:8081/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (data.success) {
        setWithdrawalResult(`${withdrawalMode === 'manual' ? 'Withdrawal' : 'Auto withdrawal'} successful! ${data.txHash ? `TxHash: ${data.txHash}` : data.message || 'Setup complete'}`);
        setWithdrawalAmount('');
        setWithdrawalAddress('');
        setAutoThreshold('');
      } else {
        setWithdrawalResult(data.message || 'Withdrawal setup failed');
      }
    } catch (error) {
      setWithdrawalResult('Error processing withdrawal');
    }
    setIsWithdrawing(false);
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Alpha-Orion Profit Engine</h1>
        <div className="flex items-center space-x-4">
          {isProductionMode && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-red-900/30 border border-red-600 rounded-md">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span className="text-xs font-bold text-red-400">LIVE MODE</span>
            </div>
          )}
          {!isProductionMode && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-900/30 border border-blue-600 rounded-md">
              <CheckCircle className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-400">SIMULATION MODE</span>
            </div>
          )}
          <button
            onClick={handleModeSwitch}
            className="px-3 py-1 bg-blue-700 text-white rounded-md hover:bg-blue-600"
          >
            Switch to {deployMode === 'sim' ? 'Live' : 'Sim'}
          </button>
          <button
            onClick={() => setCurrency(currency === 'USD' ? 'ETH' : 'USD')}
            className="px-3 py-1 bg-gray-700 text-white rounded-md hover:bg-gray-600"
          >
            {currency}
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 bg-gray-700 text-white rounded-md hover:bg-gray-600"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </div>

      <IntelligenceDashboard />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-8">
        <MetricCard title="Total Yield (PnL)" value={`$${totalPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} change={`+$${analytics.projected24hYield || '0.00'} / 24h`} />
        <MetricCard title="Alpha Velocity" value={`${analytics.alphaVelocity || '0.0'} Tx/Hr`} icon={Activity} />
        <MetricCard title="Capture Rate" value={`${(analytics.alphaCaptureRate * 100).toFixed(1) || '0.0'}%`} icon={Zap} />
        <MetricCard title="Execution Latency (RTT)" value={`${analytics.executionLatencyMs || '0'} ms`} icon={Server} />
      </div>

      <Card title="Real-Time PnL">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={pnlData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorPnl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#263148" />
              <XAxis dataKey="time" stroke="#909AAF" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#909AAF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value).toLocaleString()}`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1A2233', border: '1px solid #263148', borderRadius: '0.5rem' }}
                labelStyle={{ color: '#FFFFFF' }}
                formatter={(value) => [`$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`, 'PnL']}
              />
              <Area type="monotone" dataKey="pnl" stroke="#3B82F6" fillOpacity={1} fill="url(#colorPnl)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card title="Latest Opportunities">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {opportunities.slice(0, 7).map((opp: Opportunity) => (
              <div key={opp.id} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-700/50">
                <div>
                  <p className="font-medium text-white">{opp.assets.join('/')} on {opp.exchanges.join(' > ')}</p>
                  <p className="text-xs text-gray-400">Risk: {opp.riskLevel}</p>
                </div>
                <p className="font-semibold text-green-400">+${opp.potentialProfit.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Service Status">
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {services.slice(0, 7).map((service: Service) => (
              <div key={service.id} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-700/50">
                <div>
                  <p className="font-medium text-white">{service.name}</p>
                  <p className="text-xs text-gray-500">{service.region}</p>
                </div>
                <Badge status={service.status} />
              </div>
            ))}
          </div>
        </Card>
      </div>



      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Settings</h2>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6">
              <Card title="Profit Reinvestment Rate">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={reinvestmentRate}
                      onChange={(e) => setReinvestmentRate(parseInt(e.target.value))}
                      className="flex-1"
                    />
                    <span className="text-white font-semibold">{reinvestmentRate}%</span>
                  </div>
                </div>
              </Card>

              <Card title="Data Refresh">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleDataRefresh}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Data</span>
                  </button>
                </div>
              </Card>

              <Card title="System Mode">
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="sim"
                        checked={deployMode === 'sim'}
                        onChange={(e) => setDeployMode(e.target.value as 'sim' | 'live')}
                        className="mr-2"
                      />
                      Simulation
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="live"
                        checked={deployMode === 'live'}
                        onChange={(e) => setDeployMode(e.target.value as 'sim' | 'live')}
                        className="mr-2"
                      />
                      Live
                    </label>
                  </div>
                  <button
                    onClick={handleModeSwitch}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                  >
                    <Play className="w-4 h-4" />
                    <span>Switch Mode</span>
                  </button>
                </div>
              </Card>

              <Card title="Wallet Settings">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium text-gray-400">Profit Destination:</label>
                    {walletAddress && isValidWalletAddress(walletAddress) && (
                      <span className="text-green-400">✓</span>
                    )}
                    <span className="text-white">{maskWalletAddress(walletAddress) || 'Not set'}</span>
                    <button
                      onClick={() => setIsEditingWallet(!isEditingWallet)}
                      className="text-blue-400 hover:text-blue-300 text-sm"
                    >
                      {isEditingWallet ? 'Cancel' : 'Edit'}
                    </button>
                  </div>
                  {isEditingWallet && (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={walletAddress}
                        onChange={(e) => setWalletAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter wallet address (0x...)"
                      />
                      <button
                        onClick={handleSaveWallet}
                        disabled={!walletAddress || !isValidWalletAddress(walletAddress)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Save
                      </button>
                    </div>
                  )}
                  {walletResult && (
                    <p className={`text-sm ${walletResult.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                      {walletResult}
                    </p>
                  )}
                </div>
              </Card>

              <Card title="Profit Withdrawal">
                <div className="space-y-4">
                  <div className="flex space-x-4">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="manual"
                        checked={withdrawalMode === 'manual'}
                        onChange={(e) => setWithdrawalMode(e.target.value as 'manual' | 'auto')}
                        className="mr-2"
                      />
                      Manual Withdrawal
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        value="auto"
                        checked={withdrawalMode === 'auto'}
                        onChange={(e) => setWithdrawalMode(e.target.value as 'manual' | 'auto')}
                        className="mr-2"
                      />
                      Auto Withdrawal
                    </label>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {withdrawalMode === 'manual' ? (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Amount (USD)</label>
                        <input
                          type="number"
                          value={withdrawalAmount}
                          onChange={(e) => setWithdrawalAmount(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter amount"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">Auto Threshold (USD)</label>
                        <input
                          type="number"
                          value={autoThreshold}
                          onChange={(e) => setAutoThreshold(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="Enter threshold"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">Wallet Address</label>
                      <input
                        type="text"
                        value={withdrawalAddress}
                        onChange={(e) => setWithdrawalAddress(e.target.value)}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Enter wallet address"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleWithdrawal}
                    disabled={isWithdrawing || (withdrawalMode === 'manual' ? (!withdrawalAmount || !withdrawalAddress) : (!autoThreshold || !withdrawalAddress))}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isWithdrawing ? 'Processing...' : withdrawalMode === 'manual' ? 'Withdraw Profits' : 'Enable Auto Withdrawal'}
                  </button>
                  {withdrawalResult && (
                    <p className={`text-sm ${withdrawalResult.includes('successful') ? 'text-green-400' : 'text-red-400'}`}>
                      {withdrawalResult}
                    </p>
                  )}
                </div>
              </Card>

              <div className="flex justify-center mt-8">
                <button
                  onClick={handleSaveSettings}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  Save All Settings
                </button>
              </div>

              {settingsResult && (
                <p className={`text-center mt-4 text-sm ${settingsResult.includes('successfully') ? 'text-green-400' : 'text-red-400'}`}>
                  {settingsResult}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="text-center mt-8 text-gray-500">
        <p>Alpha-Orion Profit Engine: 2026 powered by google cloud !</p>
      </div>
    </div>
  );
};

export default Dashboard;
