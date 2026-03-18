// Alpha-Orion Arbitrage Dashboard
// A comprehensive dashboard for the Alpha-Orion arbitrage engine

import React, { useState, useEffect } from 'react';

// API Base URL for production deployment
const API_BASE_URL = 'https://alpha-orion-core-380955632798.us-central1.run.app';

// Import components
import AlphaCopilot from './components/AlphaCopilot';

// Import icons from lucide-react
import { 
  Activity, Wallet, RefreshCw, Settings, Zap, BarChart3, 
  Layers, Clock, TrendingUp, Shield, ChevronDown, ChevronUp, Plus,
  ArrowUpDown, Trash2, Pencil, Check, X, Loader, AlertTriangle, Upload, FileText
} from 'lucide-react';

// ===== COMPONENTS =====

// 1. Header Component
const Header = ({ 
  refreshInterval, 
  setRefreshInterval, 
  totalBalance,
  walletTotalBalance,
  showEthUsd, 
  setShowEthUsd 
}: { 
  refreshInterval: number; 
  setRefreshInterval: (v: number) => void;
  totalBalance: number;
  walletTotalBalance: number;
  showEthUsd: boolean;
  setShowEthUsd: (v: boolean) => void;
}) => {
  const ethPrice = 3250.00; // Mock ETH price - would come from API
  const balanceInUsd = totalBalance * ethPrice;
  const walletBalanceInUsd = walletTotalBalance * ethPrice;

  return (
    <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      {/* Left: Title */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Zap className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Alpha-Orion Arbitrage Engine</h1>
          <p className="text-xs text-slate-400">Institutional Flash Loan Trading System</p>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-6">
        {/* Refresh Interval Dropdown */}
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-400" />
          <select 
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-slate-800 text-slate-300 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value={1}>1 sec</option>
            <option value={5}>5 sec</option>
            <option value={10}>10 sec</option>
            <option value={15}>15 sec</option>
            <option value={30}>30 sec</option>
          </select>
        </div>

        {/* Wallet Total Balance (from Settings) */}
        <div className="flex items-center gap-2 bg-slate-800 px-4 py-2 rounded-lg border border-purple-500/30">
          <Wallet size={16} className="text-purple-400" />
          <div className="text-right">
            <div className="text-xs text-slate-400">Wallet Balance</div>
            <div className="text-sm font-bold text-purple-400 font-mono">
              {showEthUsd 
                ? `${walletTotalBalance.toFixed(4)} ETH`
                : `${walletBalanceInUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              }
            </div>
          </div>
        </div>

        {/* ETH/USD Toggle */}
        <button
          onClick={() => setShowEthUsd(!showEthUsd)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            showEthUsd 
              ? 'bg-blue-600 text-white' 
              : 'bg-emerald-600 text-white'
          }`}
        >
          {showEthUsd ? 'ETH' : 'USD'}
        </button>
      </div>
    </header>
  );
};

// 2. Sidebar Component
type SidebarTab = 'alphacopilot' | 'monitor' | 'strategies' | 'blockchain' | 'optimization' | 'settings';

const Sidebar = ({ 
  activeTab, 
  setActiveTab 
}: { 
  activeTab: SidebarTab; 
  setActiveTab: (tab: SidebarTab) => void;
}) => {
  const tabs = [
    { id: 'alphacopilot' as const, label: 'Alpha Copilot', icon: Layers, color: 'purple' },
    { id: 'monitor' as const, label: 'Monitor', icon: Activity, color: 'blue' },
    { id: 'strategies' as const, label: 'Strategies', icon: TrendingUp, color: 'green' },
    { id: 'blockchain' as const, label: 'Blockchain Stream', icon: RefreshCw, color: 'orange' },
    { id: 'optimization' as const, label: 'Optimization', icon: Zap, color: 'yellow' },
    { id: 'settings' as const, label: 'Settings', icon: Settings, color: 'slate' },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
      <nav className="flex-1 p-4 space-y-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const colorClasses = {
            purple: isActive ? 'bg-purple-600/20 text-purple-400 border-purple-500/30' : 'text-slate-400 hover:bg-slate-800',
            blue: isActive ? 'bg-blue-600/20 text-blue-400 border-blue-500/30' : 'text-slate-400 hover:bg-slate-800',
            green: isActive ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30' : 'text-slate-400 hover:bg-slate-800',
            orange: isActive ? 'bg-orange-600/20 text-orange-400 border-orange-500/30' : 'text-slate-400 hover:bg-slate-800',
            yellow: isActive ? 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30' : 'text-slate-400 hover:bg-slate-800',
            slate: isActive ? 'bg-slate-700/50 text-white border-slate-600' : 'text-slate-400 hover:bg-slate-800',
          };
          
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${colorClasses[tab.color as keyof typeof colorClasses]} ${isActive ? 'border' : 'border-transparent'}`}
            >
              <Icon size={18} />
              <span className="font-medium">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* System Status */}
      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-950/50 rounded-lg p-3 border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase">System Status</span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="text-emerald-400 text-xs font-mono font-bold">OPERATIONAL</div>
        </div>
      </div>
    </aside>
  );
};

// 3. Monitor Panel
const MonitorPanel = () => {
  const [metrics, setMetrics] = useState({
    profitPerTrade: 145.50,
    tradesPerHour: 12,
    latency: 42,
    capitalVelocity: 85,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        profitPerTrade: prev.profitPerTrade + (Math.random() - 0.5) * 10,
        tradesPerHour: Math.max(0, prev.tradesPerHour + Math.floor(Math.random() * 3) - 1),
        latency: Math.max(20, Math.min(100, prev.latency + Math.floor(Math.random() * 10) - 5)),
        capitalVelocity: Math.max(0, Math.min(100, prev.capitalVelocity + Math.floor(Math.random() * 5) - 2)),
      }));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const metricCards = [
    { label: 'Profit/Trade', value: `$${metrics.profitPerTrade.toFixed(2)}`, icon: TrendingUp, color: 'emerald' },
    { label: 'Trades/Hour', value: metrics.tradesPerHour, icon: Activity, color: 'blue' },
    { label: 'Latency', value: `${metrics.latency}ms`, icon: Zap, color: 'yellow' },
    { label: 'Capital Velocity', value: `${metrics.capitalVelocity}%`, icon: BarChart3, color: 'purple' },
  ];

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
      <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
        <Activity className="text-blue-400" size={24} />
        Monitor
      </h2>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, index) => {
          const Icon = metric.icon;
          const colorClasses = {
            emerald: 'text-emerald-400 bg-emerald-500/10',
            blue: 'text-blue-400 bg-blue-500/10',
            yellow: 'text-yellow-400 bg-yellow-500/10',
            purple: 'text-purple-400 bg-purple-500/10',
          };
          
          return (
            <div key={index} className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-400 uppercase">{metric.label}</span>
                <div className={`p-2 rounded-lg ${colorClasses[metric.color as keyof typeof colorClasses]}`}>
                  <Icon size={16} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{metric.value}</div>
            </div>
          );
        })}
      </div>

      {/* Live Profit Chart Area */}
      <div className="mt-6 p-4 bg-slate-950/50 rounded-lg border border-slate-800">
        <h3 className="text-sm font-bold text-slate-300 mb-4">Live Profit Overview</h3>
        <div className="h-48 flex items-end gap-2">
          {Array.from({ length: 20 }).map((_, i) => {
            const height = 20 + Math.random() * 80;
            return (
              <div 
                key={i} 
                className="flex-1 bg-gradient-to-t from-blue-600 to-blue-400 rounded-t"
                style={{ height: `${height}%` }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

// 4. Strategies Panel
const StrategiesPanel = () => {
  const [strategies] = useState([
    { name: 'Flash Loan Tri-Arb', share: 35, color: 'bg-blue-500' },
    { name: 'Cross-Chain Arbitrage', share: 25, color: 'bg-purple-500' },
    { name: 'Liquidations', share: 18, color: 'bg-emerald-500' },
    { name: 'MEV Protection', share: 12, color: 'bg-yellow-500' },
    { name: 'Statistical Arb', share: 10, color: 'bg-orange-500' },
  ]);

  const [topPairs] = useState([
    { name: 'WETH/USDC', share: 42, color: 'bg-blue-500' },
    { name: 'WBTC/ETH', share: 28, color: 'bg-purple-500' },
    { name: 'USDC/DAI', share: 15, color: 'bg-emerald-500' },
    { name: 'ARB/ETH', share: 10, color: 'bg-yellow-500' },
    { name: 'OP/ETH', share: 5, color: 'bg-orange-500' },
  ]);

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
      <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
        <TrendingUp className="text-green-400" size={24} />
        Strategies
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Contribution */}
        <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Strategy Contribution (%)</h3>
          <div className="space-y-3">
            {strategies.map((strategy, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{strategy.name}</span>
                  <span className="text-slate-400">{strategy.share}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${strategy.color} rounded-full`}
                    style={{ width: `${strategy.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pairs */}
        <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
          <h3 className="text-sm font-bold text-slate-300 mb-4">Top Trading Pairs</h3>
          <div className="space-y-3">
            {topPairs.map((pair, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-300">{pair.name}</span>
                  <span className="text-slate-400">{pair.share}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${pair.color} rounded-full`}
                    style={{ width: `${pair.share}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="p-4 bg-slate-950/30 rounded-lg border border-slate-800 text-center">
          <div className="text-2xl font-bold text-white">5</div>
          <div className="text-xs text-slate-500 mt-1">Chains</div>
        </div>
        <div className="p-4 bg-slate-950/30 rounded-lg border border-slate-800 text-center">
          <div className="text-2xl font-bold text-white">12</div>
          <div className="text-xs text-slate-500 mt-1">DEXes</div>
        </div>
        <div className="p-4 bg-slate-950/30 rounded-lg border border-slate-800 text-center">
          <div className="text-2xl font-bold text-white">3</div>
          <div className="text-xs text-slate-500 mt-1">Flash Loan Providers</div>
        </div>
      </div>
    </div>
  );
};

// 5. Blockchain Stream Panel
const BlockchainStreamPanel = () => {
  const [events, setEvents] = useState([
    { type: 'swap', message: 'WETH/USDC swap executed', time: '2s ago', color: 'blue' },
    { type: 'profit', message: 'Profit: +$145.50', time: '5s ago', color: 'green' },
    { type: 'flash', message: 'Flash loan: 100 ETH', time: '8s ago', color: 'purple' },
    { type: 'gas', message: 'Gas optimized: 15 gwei', time: '12s ago', color: 'yellow' },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      const messages = [
        'New arbitrage opportunity found',
        'Trade executed successfully',
        'Profit realized',
        'Gas optimized',
        'Route calculated',
        'Pool liquidity checked',
      ];
      const colors = ['blue', 'green', 'purple', 'yellow', 'orange', 'emerald'];
      
      setEvents(prev => {
        const newEvent = {
          type: 'swap',
          message: messages[Math.floor(Math.random() * messages.length)],
          time: 'just now',
          color: colors[Math.floor(Math.random() * colors.length)] as any,
        };
        return [newEvent, ...prev.slice(0, 9)];
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const colorClasses: Record<string, string> = {
    blue: 'border-l-blue-500 bg-blue-500/5',
    green: 'border-l-green-500 bg-green-500/5',
    purple: 'border-l-purple-500 bg-purple-500/5',
    yellow: 'border-l-yellow-500 bg-yellow-500/5',
    orange: 'border-l-orange-500 bg-orange-500/5',
    emerald: 'border-l-emerald-500 bg-emerald-500/5',
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
      <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
        <RefreshCw className="text-orange-400" size={24} />
        Blockchain Stream
      </h2>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {events.map((event, i) => (
          <div 
            key={i} 
            className={`p-3 border-l-4 rounded-r-lg ${colorClasses[event.color]}`}
          >
            <div className="flex justify-between items-start">
              <span className="text-sm text-slate-300">{event.message}</span>
              <span className="text-xs text-slate-500">{event.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 6. Optimization Panel
const OptimizationPanel = () => {
  const [optimizations] = useState([
    { metric: 'Route Calculation', value: 94, target: 95 },
    { metric: 'Gas Efficiency', value: 98, target: 100 },
    { metric: 'Slippage Minimization', value: 89, target: 95 },
    { metric: 'Pool Selection', value: 92, target: 95 },
  ]);

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl">
      <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
        <Zap className="text-yellow-400" size={24} />
        Optimization
      </h2>

      <div className="space-y-4">
        {optimizations.map((opt, i) => (
          <div key={i} className="p-4 bg-slate-950/50 rounded-lg border border-slate-800">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-300">{opt.metric}</span>
              <span className="text-sm font-bold text-white">{opt.value}%</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full ${opt.value >= opt.target ? 'bg-green-500' : 'bg-yellow-500'}`}
                style={{ width: `${opt.value}%` }}
              />
            </div>
            <div className="text-xs text-slate-500 mt-1">Target: {opt.target}%</div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-slate-950/30 rounded-lg border border-slate-800">
        <div className="flex items-center gap-2 text-yellow-400">
          <Zap size={18} />
          <span className="text-sm font-bold">Optimization Engine Active</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Continuously analyzing and optimizing trade execution parameters in real-time.
        </p>
      </div>
    </div>
  );
};

// 7. Settings Panel - Wallet Management & Profit Withdrawal
const SettingsPanel = ({ 
  onWalletBalanceChange 
}: { 
  onWalletBalanceChange?: (total: number) => void 
}) => {
  const [wallets, setWallets] = useState([
    { id: 1, name: 'Main Treasury', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2fE00', chain: 'Ethereum', balance: '125.45', valid: true },
    { id: 2, name: 'Execution Wallet', address: '0x8ba1f109551bD432803012645Ac136ddd64DBA72', chain: 'Arbitrum', balance: '5.20', valid: true },
    { id: 3, name: 'Cold Storage', address: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc', chain: 'Ethereum', balance: '1050.00', valid: true },
  ]);

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [profitMode, setProfitMode] = useState<'auto' | 'manual'>('manual');
  const [threshold, setThreshold] = useState(1000);
  const [transferAmount, setTransferAmount] = useState('');
  const [capitalVelocity, setCapitalVelocity] = useState(80);
  const [reinvestmentRate, setReinvestmentRate] = useState(50);
  
  // New state for enhanced wallet management
  const [walletsExpanded, setWalletsExpanded] = useState(true);
  const [showAddWalletModal, setShowAddWalletModal] = useState(false);
  const [newWallet, setNewWallet] = useState({ name: '', address: '', chain: 'Ethereum' });
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Calculate total balance
  const totalBalance = wallets.reduce((acc, w) => {
    const value = parseFloat(w.balance);
    return acc + (isNaN(value) ? 0 : value);
  }, 0);

  // Notify parent of balance change
  useEffect(() => {
    if (onWalletBalanceChange) {
      onWalletBalanceChange(totalBalance);
    }
  }, [totalBalance, onWalletBalanceChange]);

  const sortedWallets = [...wallets].sort((a, b) => {
    if (!sortConfig) return 0;
    return 0;
  });

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const handleDelete = (id: number) => {
    setWallets(wallets.filter(w => w.id !== id));
  };

  const handleAddWallet = () => {
    if (!newWallet.name || !newWallet.address) {
      setUploadError('Please fill in all fields');
      return;
    }
    
    // Validate Ethereum address format
    if (!newWallet.address.startsWith('0x') || newWallet.address.length !== 42) {
      setUploadError('Invalid wallet address format');
      return;
    }

    const newId = Math.max(...wallets.map(w => w.id), 0) + 1;
    setWallets([...wallets, {
      id: newId,
      name: newWallet.name,
      address: newWallet.address,
      chain: newWallet.chain,
      balance: '0.00',
      valid: true
    }]);
    setNewWallet({ name: '', address: '', chain: 'Ethereum' });
    setShowAddWalletModal(false);
    setUploadError('');
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      try {
        // Parse CSV or text file
        const lines = content.split('\n').filter(line => line.trim());
        const newWallets: typeof wallets = [];
        let currentId = Math.max(...wallets.map(w => w.id), 0) + 1;

        lines.forEach((line, index) => {
          // Skip header if present
          if (index === 0 && (line.toLowerCase().includes('name') || line.toLowerCase().includes('address'))) {
            return;
          }
          
          // Parse CSV line (name,address,chain) or just addresses
          const parts = line.split(',').map(p => p.trim());
          if (parts[0] && parts[0].startsWith('0x') && parts[0].length === 42) {
            // Just addresses - generate name
            newWallets.push({
              id: currentId++,
              name: `Wallet ${currentId}`,
              address: parts[0],
              chain: parts[1] || 'Ethereum',
              balance: '0.00',
              valid: true
            });
          } else if (parts.length >= 2 && parts[1]?.startsWith('0x') && parts[1].length === 42) {
            // Name, address, chain format
            newWallets.push({
              id: currentId++,
              name: parts[0] || `Wallet ${currentId}`,
              address: parts[1],
              chain: parts[2] || 'Ethereum',
              balance: '0.00',
              valid: true
            });
          }
        });

        if (newWallets.length > 0) {
          setWallets([...wallets, ...newWallets]);
        } else {
          setUploadError('No valid wallet addresses found in file');
        }
      } catch (err) {
        setUploadError('Error parsing file. Please use CSV format.');
      }
      setIsUploading(false);
    };
    
    reader.onerror = () => {
      setUploadError('Error reading file');
      setIsUploading(false);
    };
    
    reader.readAsText(file);
  };

  return (
    <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
      <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
        <Settings className="text-slate-400" size={24} />
        Settings
      </h2>

      {/* Wallet Management */}
      <div className="mb-8">
        {/* Collapsible Header */}
        <div 
          className="flex items-center justify-between mb-4 cursor-pointer"
          onClick={() => setWalletsExpanded(!walletsExpanded)}
        >
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Wallet size={20} className="text-blue-400" />
            Wallet Management
          </h3>
          <div className="flex items-center gap-3">
            {!walletsExpanded && (
              <div className="flex items-center gap-4 mr-4">
                <span className="text-sm text-slate-400">
                  {wallets.length} wallet{wallets.length !== 1 ? 's' : ''}
                </span>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-bold">
                  {totalBalance.toFixed(4)} ETH
                </span>
              </div>
            )}
            <button className="p-1 hover:bg-slate-800 rounded-lg transition-colors">
              {walletsExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
            </button>
          </div>
        </div>
        
        {/* Expanded Wallet Table */}
        {walletsExpanded && (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-950/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">
                      <button onClick={() => requestSort('name')} className="flex items-center gap-1">
                        Account Name <ArrowUpDown size={14} />
                      </button>
                    </th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Address</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Chain</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Balance (ETH)</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-medium">Status</th>
                    <th className="px-4 py-3 text-right text-slate-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {wallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-slate-800/30">
                      <td className="px-4 py-3 text-white font-medium">{wallet.name}</td>
                      <td className="px-4 py-3 text-slate-400 font-mono text-xs">
                        {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{wallet.chain}</td>
                      <td className="px-4 py-3 text-emerald-400 font-mono">{parseFloat(wallet.balance).toFixed(4)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          wallet.valid 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-red-500/10 text-red-400'
                        }`}>
                          {wallet.valid ? 'Valid' : 'Invalid'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="text-slate-400 hover:text-blue-400 mx-1">
                          <Pencil size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(wallet.id)}
                          className="text-slate-400 hover:text-red-400 mx-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-950/30">
                  <tr>
                    <td className="px-4 py-3 font-bold text-white">Total</td>
                    <td colSpan={2} className="px-4 py-3 text-slate-400">{wallets.length} wallets</td>
                    <td className="px-4 py-3 text-emerald-400 font-mono font-bold">{totalBalance.toFixed(4)} ETH</td>
                    <td colSpan={2}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex flex-wrap gap-3">
              <button 
                onClick={() => setShowAddWalletModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold"
              >
                <Plus size={16} /> Add Wallet
              </button>
              
              <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold cursor-pointer">
                <Upload size={16} />
                {isUploading ? 'Importing...' : 'Import Wallets'}
                <input 
                  type="file" 
                  accept=".csv,.txt"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={isUploading}
                />
              </label>
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm flex items-center gap-2">
                  <AlertTriangle size={16} />
                  {uploadError}
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Wallet Modal */}
      {showAddWalletModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Add New Wallet</h3>
              <button 
                onClick={() => { setShowAddWalletModal(false); setUploadError(''); }}
                className="text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-2">Wallet Name</label>
                <input
                  type="text"
                  value={newWallet.name}
                  onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                  placeholder="e.g., Main Treasury"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-2">Wallet Address</label>
                <input
                  type="text"
                  value={newWallet.address}
                  onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
                  placeholder="0x..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white font-mono text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm text-slate-400 mb-2">Chain</label>
                <select
                  value={newWallet.chain}
                  onChange={(e) => setNewWallet({ ...newWallet, chain: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white"
                >
                  <option value="Ethereum">Ethereum</option>
                  <option value="Arbitrum">Arbitrum</option>
                  <option value="Optimism">Optimism</option>
                  <option value="Base">Base</option>
                  <option value="Polygon">Polygon</option>
                  <option value="BNB Chain">BNB Chain</option>
                </select>
              </div>

              {/* Import Help */}
              <div className="p-3 bg-slate-950/50 rounded-lg border border-slate-800">
                <p className="text-xs text-slate-400 flex items-center gap-2">
                  <FileText size={14} />
                  CSV format: Name, Address, Chain (one per line)
                </p>
              </div>

              {uploadError && (
                <p className="text-red-400 text-sm">{uploadError}</p>
              )}
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setShowAddWalletModal(false); setUploadError(''); }}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWallet}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold"
                >
                  Add Wallet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profit Withdrawal System */}
      <div className="mb-8 p-4 bg-slate-950/30 rounded-lg border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-4">Profit Withdrawal System</h3>
        
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setProfitMode('auto')}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${
              profitMode === 'auto' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            Auto Mode
          </button>
          <button
            onClick={() => setProfitMode('manual')}
            className={`px-4 py-2 rounded-lg text-sm font-bold ${
              profitMode === 'manual' 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-800 text-slate-400'
            }`}
          >
            Manual Mode
          </button>
        </div>

        {profitMode === 'auto' ? (
          <div>
            <label className="block text-sm text-slate-400 mb-2">Threshold Amount (USD)</label>
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value))}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white"
            />
            <p className="text-xs text-slate-500 mt-2">
              Auto-withdraw when profit exceeds threshold
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm text-slate-400 mb-2">Transfer Amount (ETH)</label>
            <input
              type="number"
              value={transferAmount}
              onChange={(e) => setTransferAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white mb-2"
            />
            <button className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold">
              Withdraw Profit
            </button>
          </div>
        )}
      </div>

      {/* Capital Velocity Slider */}
      <div className="mb-6 p-4 bg-slate-950/30 rounded-lg border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-4">Capital Velocity</h3>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={1}
            max={500}
            value={capitalVelocity}
            onChange={(e) => setCapitalVelocity(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-white font-mono w-24 text-right">${capitalVelocity}M</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">Control capital deployment from $1M to $500M</p>
      </div>

      {/* Profit Reinvestment Rate */}
      <div className="p-4 bg-slate-950/30 rounded-lg border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-4">Profit Reinvestment Rate</h3>
        <div className="flex items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            value={reinvestmentRate}
            onChange={(e) => setReinvestmentRate(Number(e.target.value))}
            className="flex-1"
          />
          <span className="text-white font-mono w-16 text-right">{reinvestmentRate}%</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">Percentage of profits to reinvest</p>
      </div>

      {/* Deployment Panel */}
      <div className="mt-8 p-4 bg-slate-950/30 rounded-lg border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-4">Deployment</h3>
        
        <div className="flex flex-wrap gap-4">
          {/* Preflight Check Button */}
          <button 
            onClick={() => {
              const btn = document.getElementById('preflight-btn') as HTMLButtonElement;
              const status = document.getElementById('preflight-status');
              if (btn && status) {
                btn.disabled = true;
                btn.innerHTML = '<svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span className="ml-2">Running Checks...</span>';
                status.innerHTML = '<span className="text-yellow-400">Running preflight checks...</span>';
                
                // Simulate preflight check
                setTimeout(() => {
                  btn.disabled = false;
                  btn.innerHTML = '<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span className="ml-2">Run Preflight Check</span>';
                  status.innerHTML = '<span className="text-green-400">✓ All preflight checks passed!</span>';
                }, 3000);
              }
            }}
            id="preflight-btn"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Run Preflight Check</span>
          </button>
          
          {/* Deploy to GCP Button */}
          <button 
            onClick={() => {
              const btn = document.getElementById('deploy-btn') as HTMLButtonElement;
              const status = document.getElementById('deploy-status');
              if (btn && status) {
                btn.disabled = true;
                btn.innerHTML = '<svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg><span className="ml-2">Deploying...</span>';
                status.innerHTML = '<span className="text-yellow-400">Deploying to Google Cloud Run...</span>';
                
                // Simulate deployment
                setTimeout(() => {
                  btn.disabled = false;
                  btn.innerHTML = '<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="ml-2">Deploy to Cloud Run</span>';
                  status.innerHTML = '<span className="text-green-400">✓ Successfully deployed to Cloud Run!</span>';
                }, 5000);
              }
            }}
            id="deploy-btn"
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            <span>Deploy to Cloud Run</span>
          </button>
        </div>
        
        {/* Status Display */}
        <div className="mt-4 p-3 bg-slate-900 rounded-lg">
          <div className="text-xs text-slate-400 mb-1">Deployment Status</div>
          <div id="preflight-status" className="text-sm font-medium"></div>
          <div id="deploy-status" className="text-sm font-medium"></div>
        </div>
      </div>

      {/* Deployment Registry */}
      <div className="mt-8 p-4 bg-slate-950/30 rounded-lg border border-slate-800">
        <h3 className="text-lg font-bold text-white mb-4">Deployment Registry</h3>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-950/50">
              <tr>
                <th className="px-4 py-3 text-left text-slate-400 font-medium">#</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white">Project Name ↕</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white">Commit ↕</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white">Smart Wallet ↕</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white">Contract # ↕</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white">Timestamp ↕</th>
                <th className="px-4 py-3 text-left text-slate-400 font-medium cursor-pointer hover:text-white">Status ↕</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400">1</td>
                <td className="px-4 py-3 text-white font-medium">Alpha-Orion Core</td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">a1b2c3d</td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">0x742d...4dc0</td>
                <td className="px-4 py-3 text-slate-300">CONTRACT-001</td>
                <td className="px-4 py-3 text-slate-400">2026-02-17 21:00</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/10 text-green-400">Active</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400">2</td>
                <td className="px-4 py-3 text-white font-medium">Alpha-Orion Backend</td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">e5f6g7h</td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">0x8ba1...BA72</td>
                <td className="px-4 py-3 text-slate-300">CONTRACT-002</td>
                <td className="px-4 py-3 text-slate-400">2026-02-17 20:30</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-green-500/10 text-green-400">Active</span>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="px-4 py-3 text-slate-400">3</td>
                <td className="px-4 py-3 text-white font-medium">Alpha-Orion Frontend</td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">i9j0k1l</td>
                <td className="px-4 py-3 text-slate-400 font-mono text-xs">0x9965...A4dc</td>
                <td className="px-4 py-3 text-slate-300">CONTRACT-003</td>
                <td className="px-4 py-3 text-slate-400">2026-02-17 19:00</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 rounded text-xs font-bold bg-red-500/10 text-red-400">Inactive</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end mt-6 pt-4 border-t border-slate-800">
        <button 
          onClick={() => {
            const btn = document.getElementById('save-btn');
            if (btn) {
              btn.innerHTML = `<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg><span className="ml-2">Saved</span>`;
              btn.classList.remove('bg-emerald-600', 'hover:bg-emerald-500');
              btn.classList.add('bg-green-600');
              setTimeout(() => {
                btn.innerHTML = `<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg><span className="ml-2">Save</span>`;
                btn.classList.add('bg-emerald-600', 'hover:bg-emerald-500');
                btn.classList.remove('bg-green-600');
              }, 3000);
            }
          }}
          id="save-btn"
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          <span>Save</span>
        </button>
      </div>
    </div>
  );
};

// ===== MAIN APP =====

const App = () => {
  const [activeTab, setActiveTab] = useState<SidebarTab>('monitor');
  const [refreshInterval, setRefreshInterval] = useState(5);
  const [totalBalance, setTotalBalance] = useState(1180.65);
  const [walletTotalBalance, setWalletTotalBalance] = useState(1180.65); // From wallet management
  const [showEthUsd, setShowEthUsd] = useState(true);

  // Handler for wallet balance changes from Settings
  const handleWalletBalanceChange = (newBalance: number) => {
    setWalletTotalBalance(newBalance);
  };

  // Update balance periodically (mock)
  useEffect(() => {
    const interval = setInterval(() => {
      setTotalBalance(prev => prev + (Math.random() - 0.3) * 5);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'alphacopilot':
        return <AlphaCopilot />;
      case 'monitor':
        return <MonitorPanel />;
      case 'strategies':
        return <StrategiesPanel />;
      case 'blockchain':
        return <BlockchainStreamPanel />;
      case 'optimization':
        return <OptimizationPanel />;
      case 'settings':
        return <SettingsPanel onWalletBalanceChange={handleWalletBalanceChange} />;
      default:
        return <MonitorPanel />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-gray-100 font-sans">
      <Header 
        refreshInterval={refreshInterval}
        setRefreshInterval={setRefreshInterval}
        totalBalance={totalBalance}
        walletTotalBalance={walletTotalBalance}
        showEthUsd={showEthUsd}
        setShowEthUsd={setShowEthUsd}
      />
      
      <div className="flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;
