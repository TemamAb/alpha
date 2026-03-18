import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Clock, 
  Zap,
  Wallet,
  ArrowRightLeft,
  Gift,
  Coins,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Filter,
  Search
} from 'lucide-react';

// Blockchain activity types
interface BlockchainActivity {
  id: string;
  type: 'swap' | 'transfer' | 'flash_loan' | 'bridge' | 'stake' | 'mint' | 'burn';
  chain: string;
  tokenIn: string;
  tokenOut: string;
  amount: string;
  value: number;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
  gasUsed?: number;
  gasFee?: number;
}

// Chain configuration
interface ChainConfig {
  name: string;
  color: string;
  icon: string;
}

const BlockchainStream: React.FC = () => {
  const [activities, setActivities] = useState<BlockchainActivity[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const chains: ChainConfig[] = [
    { name: 'Ethereum', color: '#627EEA', icon: 'ETH' },
    { name: 'Arbitrum', color: '#28A0F0', icon: 'ARB' },
    { name: 'Optimism', color: '#FF0420', icon: 'OP' },
    { name: 'Polygon', color: '#8247E5', icon: 'MATIC' },
    { name: 'Base', color: '#0055FF', icon: 'BASE' },
  ];

  // Initialize with demo data
  useEffect(() => {
    setActivities([
      {
        id: '1',
        type: 'swap',
        chain: 'Ethereum',
        tokenIn: 'ETH',
        tokenOut: 'USDC',
        amount: '2.5 ETH',
        value: 8750,
        txHash: '0x3a2f...8c9d',
        status: 'confirmed',
        timestamp: new Date(Date.now() - 60000),
        gasUsed: 150000,
        gasFee: 0.0045
      },
      {
        id: '2',
        type: 'flash_loan',
        chain: 'Arbitrum',
        tokenIn: 'USDC',
        tokenOut: 'WBTC',
        amount: '500,000 USDC',
        value: 500000,
        txHash: '0x7b3c...2e1f',
        status: 'confirmed',
        timestamp: new Date(Date.now() - 120000),
        gasUsed: 320000,
        gasFee: 0.0085
      },
      {
        id: '3',
        type: 'bridge',
        chain: 'Base',
        tokenIn: 'ETH',
        tokenOut: 'ETH',
        amount: '1.2 ETH',
        value: 4200,
        txHash: '0x9d4e...1a2b',
        status: 'confirmed',
        timestamp: new Date(Date.now() - 180000),
        gasUsed: 85000,
        gasFee: 0.0021
      },
      {
        id: '4',
        type: 'swap',
        chain: 'Optimism',
        tokenIn: 'OP',
        tokenOut: 'ETH',
        amount: '100 OP',
        value: 750,
        txHash: '0x2f8a...5c3d',
        status: 'pending',
        timestamp: new Date(Date.now() - 30000),
        gasUsed: 180000,
        gasFee: 0.0032
      },
      {
        id: '5',
        type: 'transfer',
        chain: 'Polygon',
        tokenIn: 'MATIC',
        tokenOut: 'MATIC',
        amount: '5,000 MATIC',
        value: 4250,
        txHash: '0x1b7d...9e4f',
        status: 'confirmed',
        timestamp: new Date(Date.now() - 240000),
        gasUsed: 21000,
        gasFee: 0.0005
      },
      {
        id: '6',
        type: 'stake',
        chain: 'Ethereum',
        tokenIn: 'ETH',
        tokenOut: 'stETH',
        amount: '10 ETH',
        value: 35000,
        txHash: '0x5c3e...7d2a',
        status: 'confirmed',
        timestamp: new Date(Date.now() - 300000),
        gasUsed: 45000,
        gasFee: 0.012
      }
    ]);
  }, []);

  // Simulate real-time updates
  useEffect(() => {
    if (!isLive) return;
    
    const interval = setInterval(() => {
      const types: Array<BlockchainActivity['type']> = ['swap', 'transfer', 'flash_loan', 'bridge'];
      const tokens = ['ETH', 'USDC', 'WBTC', 'MATIC', 'ARB', 'OP'];
      const chainsList = ['Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'Base'];
      
      const newActivity: BlockchainActivity = {
        id: Date.now().toString(),
        type: types[Math.floor(Math.random() * types.length)],
        chain: chainsList[Math.floor(Math.random() * chainsList.length)],
        tokenIn: tokens[Math.floor(Math.random() * tokens.length)],
        tokenOut: tokens[Math.floor(Math.random() * tokens.length)],
        amount: (Math.random() * 10).toFixed(2) + ' ' + tokens[Math.floor(Math.random() * tokens.length)],
        value: Math.floor(Math.random() * 50000),
        txHash: '0x' + Math.random().toString(16).substring(2, 10) + '...' + Math.random().toString(16).substring(2, 6),
        status: Math.random() > 0.2 ? 'confirmed' : 'pending',
        timestamp: new Date(),
        gasUsed: Math.floor(Math.random() * 300000),
        gasFee: Math.random() * 0.02
      };
      
      setActivities(prev => [newActivity, ...prev].slice(0, 20));
    }, 3000);
    
    return () => clearInterval(interval);
  }, [isLive]);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'swap': return <ArrowRightLeft size={14} className="text-blue-400" />;
      case 'transfer': return <Wallet size={14} className="text-purple-400" />;
      case 'flash_loan': return <Zap size={14} className="text-yellow-400" />;
      case 'bridge': return <TrendingUp size={14} className="text-emerald-400" />;
      case 'stake': return <Gift size={14} className="text-pink-400" />;
      case 'mint': return <Coins size={14} className="text-cyan-400" />;
      case 'burn': return <Activity size={14} className="text-red-400" />;
      default: return <Network size={14} className="text-slate-400" />;
    }
  };

  const getChainColor = (chain: string) => {
    const found = chains.find(c => c.name === chain);
    return found?.color || '#666';
  };

  const getStatusIcon = (status: string) => {
    if (status === 'confirmed') return <CheckCircle2 size={12} className="text-emerald-400" />;
    if (status === 'pending') return <Clock size={12} className="text-yellow-400" />;
    return <AlertCircle size={12} className="text-red-400" />;
  };

  const filteredActivities = activities.filter(activity => {
    const matchesFilter = filter === 'all' || activity.type === filter || activity.chain === filter;
    const matchesSearch = searchTerm === '' || 
      activity.tokenIn.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.tokenOut.toLowerCase().includes(searchTerm.toLowerCase()) ||
      activity.txHash.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="h-full flex flex-col bg-slate-950/80 border-r border-white/5">
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-lg shadow-blue-500/20">
              <Network size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Blockchain Stream</h2>
              <p className="text-[10px] text-slate-400">Real-time on-chain activities</p>
            </div>
          </div>
          <button
            onClick={() => setIsLive(!isLive)}
            className={`p-2 rounded-lg transition-all ${isLive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400'}`}
          >
            <Activity size={14} className={isLive ? 'animate-pulse' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-3">
          <Search size={12} className="text-slate-500" />
          <input
            type="text"
            placeholder="Search tokens or tx..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {['all', 'swap', 'transfer', 'flash_loan', 'bridge', 'stake'].map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-2 py-1 text-[9px] rounded transition-all ${
                filter === type 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {type === 'all' ? 'All' : type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Chain Stats */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center gap-2 mb-2">
          <Filter size={12} className="text-slate-500" />
          <span className="text-[10px] text-slate-400 uppercase">Active Chains</span>
        </div>
        <div className="flex gap-2">
          {chains.map(chain => (
            <div 
              key={chain.name}
              className="flex items-center gap-1 px-2 py-1 bg-slate-900/50 rounded border border-white/5"
            >
              <div 
                className="w-2 h-2 rounded-full" 
                style={{ backgroundColor: chain.color, boxShadow: `0 0 6px ${chain.color}60` }}
              />
              <span className="text-[9px] text-slate-400">{chain.icon}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Activity Stream */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {filteredActivities.map((activity) => (
            <div 
              key={activity.id}
              className="p-3 bg-slate-900/50 rounded-lg border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-slate-800 rounded">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-slate-200 uppercase">
                        {activity.type.replace('_', ' ')}
                      </span>
                      {getStatusIcon(activity.status)}
                    </div>
                    <div className="flex items-center gap-1">
                      <div 
                        className="w-1.5 h-1.5 rounded-full" 
                        style={{ backgroundColor: getChainColor(activity.chain) }}
                      />
                      <span className="text-[9px] text-slate-500">{activity.chain}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold text-white">${activity.value.toLocaleString()}</div>
                  <div className="text-[8px] text-slate-500 font-mono">{activity.txHash}</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between text-[9px]">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">{activity.tokenIn}</span>
                  <ArrowRightIcon size={10} className="text-slate-600" />
                  <span className="text-slate-400">{activity.tokenOut}</span>
                </div>
                <div className="flex items-center gap-3">
                  {activity.gasUsed && (
                    <span className="text-slate-500">{activity.gasUsed.toLocaleString()} gas</span>
                  )}
                  {activity.gasFee && (
                    <span className="text-slate-500">{activity.gasFee.toFixed(4)} ETH</span>
                  )}
                  <span className="text-slate-500">{formatTime(activity.timestamp)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary Footer */}
      <div className="p-4 border-t border-white/5">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2 bg-slate-900/50 rounded">
            <div className="text-[10px] text-slate-500 uppercase">Total Tx</div>
            <div className="text-xs font-bold text-white">{activities.length}</div>
          </div>
          <div className="p-2 bg-slate-900/50 rounded">
            <div className="text-[10px] text-slate-500 uppercase">Volume</div>
            <div className="text-xs font-bold text-emerald-400">
              ${activities.reduce((acc, a) => acc + a.value, 0).toLocaleString()}
            </div>
          </div>
          <div className="p-2 bg-slate-900/50 rounded">
            <div className="text-[10px] text-slate-500 uppercase">Pending</div>
            <div className="text-xs font-bold text-yellow-400">
              {activities.filter(a => a.status === 'pending').length}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Small arrow icon component
const ArrowRightIcon: React.FC<{ size: number; className?: string }> = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
    <line x1="5" y1="12" x2="19" y2="12"></line>
    <polyline points="12 5 19 12 12 19"></polyline>
  </svg>
);

export default BlockchainStream;
