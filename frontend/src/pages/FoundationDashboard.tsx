import React, { useState } from 'react';
import { 
  Activity, 
  Settings, 
  List, 
  History,
  Zap, 
  Brain, 
  RotateCw, 
  TrendingUp, 
  Wallet,
  Check,
  Search,
  X,
  Layers,
  Cpu,
  Network,
  Wifi
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { useWebSocket } from '../hooks/useWebSocket';
import TradeHistory from '../components/TradeHistory';

// --- Type Definitions ---
interface StreamEvent {
  id: string;
  timestamp: string;
  chain: string;
  eventType: string;
  details: string;
  value: string;
}

// --- Mock Data ---
const monitorData = [
  { time: '10:00', profit: 120 },
  { time: '10:05', profit: 190 },
  { time: '10:10', profit: 150 },
  { time: '10:15', profit: 220 },
  { time: '10:20', profit: 180 },
  { time: '10:25', profit: 250 },
];

const strategyData = [
  { name: 'Triangular', value: 25, fill: '#38bdf8' },
  { name: 'Cross-DEX', value: 20, fill: '#818cf8' },
  { name: 'Flash Loan', value: 15, fill: '#a78bfa' },
  { name: 'Spatial', value: 10, fill: '#c084fc' },
  { name: 'Statistical', value: 8, fill: '#e879f9' },
];

const pairsData = [
  { name: 'WETH/USDC', value: 22 },
  { name: 'WBTC/USDT', value: 18 },
  { name: 'MATIC/USDC', value: 15 },
  { name: 'BNB/BUSD', value: 12 },
  { name: 'LINK/ETH', value: 8 },
];

const FoundationDashboard = () => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [currency, setCurrency] = useState('USD');
  const [balance, setBalance] = useState('$1,245,890.00');
  const [refreshRate, setRefreshRate] = useState('5000');
  
  // Use the custom hook to manage WebSocket connection
  const wsUrl = process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8080';
  const { streamEvents, wsStatus, latency } = useWebSocket(wsUrl);

  const toggleCurrency = (curr: string) => {
    setCurrency(curr);
    if (curr === 'USD') {
      setBalance('$1,245,890.00');
    } else {
      setBalance('Ξ 622.94');
    }
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard': return <DashboardSection />;
      case 'monitor': return <MonitorSection />;
      case 'strategies': return <StrategiesSection />;
      case 'stream': return <StreamSection events={streamEvents} />;
      case 'history': return <TradeHistory />;
      case 'optimization': return <OptimizationSection />;
      case 'settings': return <SettingsSection />;
      default: return <DashboardSection />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-200 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0f172a] border-r border-slate-800 flex flex-col">
        <div className="p-4">
            <div 
                className={`mb-6 p-3 rounded-lg border border-purple-500/30 bg-purple-500/10 cursor-pointer transition-colors ${activeSection === 'dashboard' ? 'ring-1 ring-purple-500' : ''}`}
                onClick={() => setActiveSection('dashboard')}
            >
                <div className="flex items-center gap-3">
                    <Brain className="text-purple-400 w-6 h-6" />
                    <div>
                        <div className="font-semibold text-purple-100">Alpha-Copilot</div>
                        <div className="text-[10px] text-purple-300">Gemini Intelligence</div>
                    </div>
                </div>
            </div>

            <div className="text-xs font-bold text-slate-500 uppercase mb-2 px-2">Main Menu</div>

            <nav className="space-y-1">
                <NavItem icon={<Activity size={20} />} label="Monitor" active={activeSection === 'monitor'} onClick={() => setActiveSection('monitor')} />
                <NavItem icon={<Layers size={20} />} label="Strategies" active={activeSection === 'strategies'} onClick={() => setActiveSection('strategies')} />
                <NavItem icon={<List size={20} />} label="Blockchain Stream" active={activeSection === 'stream'} onClick={() => setActiveSection('stream')} />
                <NavItem icon={<History size={20} />} label="Trade History" active={activeSection === 'history'} onClick={() => setActiveSection('history')} />
                <NavItem icon={<Zap size={20} />} label="Optimization" active={activeSection === 'optimization'} onClick={() => setActiveSection('optimization')} />
                <NavItem icon={<Settings size={20} />} label="Settings" active={activeSection === 'settings'} onClick={() => setActiveSection('settings')} />
            </nav>
        </div>
        
        <div className="mt-auto p-4 border-t border-slate-800 bg-slate-900/50">
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Live Feed Status</span>
                <span className={`flex items-center gap-1 ${wsStatus === 'Connected' ? 'text-emerald-400' : 'text-amber-400' }`}>
                    <span className={`w-2 h-2 rounded-full ${wsStatus === 'Connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span> 
                    {wsStatus}
                </span>
            </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-3">
                <div className="bg-sky-500/10 p-2 rounded-lg">
                    <Layers className="text-sky-500 w-5 h-5" />
                </div>
                <div>
                    <h1 className="text-lg font-bold tracking-wide text-white">Alpha-Orion</h1>
                    <div className="text-xs text-sky-400 font-mono">ARBITRAGE ENGINE</div>
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Total Wallet Balance</span>
                    <span className="font-mono font-bold text-emerald-400 text-lg">{balance}</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button 
                        onClick={() => toggleCurrency('USD')} 
                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${currency === 'USD' ? 'bg-sky-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}
                    >
                        USD
                    </button>
                    <button 
                        onClick={() => toggleCurrency('ETH')} 
                        className={`px-3 py-1 rounded text-xs font-bold transition-all ${currency === 'ETH' ? 'bg-purple-600 text-white' : 'hover:bg-slate-700 text-slate-400'}`}
                    >
                        ETH
                    </button>
                </div>

                <div className="flex items-center gap-4 border-l border-slate-700 pl-6">
                    <LatencyIndicator latency={latency} />
                    <RotateCw className="text-slate-400 w-4 h-4" />
                    <select 
                        value={refreshRate} 
                        onChange={(e) => setRefreshRate(e.target.value)}
                        className="bg-slate-800 border border-slate-600 text-xs rounded px-2 py-1 focus:outline-none focus:border-sky-500 text-slate-300"
                    >
                        <option value="1000">1s</option>
                        <option value="5000">5s</option>
                        <option value="15000">15s</option>
                        <option value="30000">30s</option>
                    </select>
                </div>
            </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-[#020617]">
            {renderContent()}
        </main>
      </div>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) => (
    <div 
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-md cursor-pointer transition-all mb-2 ${active ? 'bg-slate-800 text-sky-400' : 'text-slate-400 hover:bg-slate-800 hover:text-sky-400'}`}
    >
        {icon}
        <span className="font-medium text-sm">{label}</span>
    </div>
);

const LatencyIndicator = ({ latency }: { latency: number | null }) => {
  if (latency === null) {
    return (
      <div className="flex items-center gap-2 text-slate-500 text-xs" title="WebSocket Latency">
        <Wifi size={14} />
        <span>-- ms</span>
      </div>
    );
  }

  const getColor = () => {
    if (latency < 40) return 'text-emerald-400';
    if (latency < 80) return 'text-amber-400';
    return 'text-red-400';
  };

  return (
    <div className={`flex items-center gap-2 text-xs font-mono ${getColor()}`} title="WebSocket Latency">
      <Wifi size={14} />
      <span>{latency} ms</span>
    </div>
  );
};

const DashboardSection = () => (
    <div className="animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 border border-purple-500/20 rounded-lg p-6 shadow-lg">
                <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                    <Brain className="text-purple-400 w-5 h-5" /> Alpha-Copilot Context
                </h2>
                <p className="text-slate-300 text-sm mb-4 leading-relaxed">
                    The Alpha-Copilot is fully aware of the Alpha-Orion <strong>build-deploy-monitor-optimize</strong> lifecycle. 
                    It actively benchmarks against five integrated arbitrage flash loan applications to ensure top-tier performance.
                </p>
                <div className="bg-slate-950/50 p-4 rounded border border-slate-700/50 font-mono text-sm">
                    <div className="flex items-center gap-2 text-emerald-400 mb-1">
                        <Check className="w-4 h-4" /> <span>Benchmarking System Active</span>
                    </div>
                    <div className="text-slate-400 ml-6">
                        &gt; Analyzing metrics from 5 competitor apps...<br/>
                        &gt; Optimization engine targeting <strong>+15%</strong> above benchmark.<br/>
                        &gt; Current Status: <span className="text-sky-400">OPTIMAL</span>
                    </div>
                </div>
            </div>
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg">
                <h3 className="text-xs font-bold text-slate-400 uppercase mb-4">System Vitality</h3>
                <div className="space-y-4">
                    <VitalityBar label="CPU Load" value="24%" color="bg-emerald-500" width="24%" valueColor="text-emerald-400" />
                    <VitalityBar label="Memory" value="4.2 GB" color="bg-sky-500" width="45%" valueColor="text-sky-400" />
                    <VitalityBar label="Network" value="1.2 Gbps" color="bg-purple-500" width="60%" valueColor="text-purple-400" />
                </div>
            </div>
        </div>
    </div>
);

const VitalityBar = ({ label, value, color, width, valueColor }: any) => (
    <div>
        <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-300">{label}</span>
            <span className={valueColor}>{value}</span>
        </div>
        <div className="w-full bg-slate-700 h-1.5 rounded-full">
            <div className={`${color} h-1.5 rounded-full`} style={{ width }}></div>
        </div>
    </div>
);

const MonitorSection = () => (
    <div className="animate-in fade-in duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <MetricCard label="Profit / Trade" value="$145.20" subtext="+2.4% vs avg" subicon={<TrendingUp size={12} />} color="text-emerald-400" subcolor="text-emerald-500" borderHover="hover:border-emerald-500/50" />
            <MetricCard label="Trades / Hour" value="842" subtext="High Velocity" subicon={<Zap size={12} />} color="text-sky-400" subcolor="text-sky-500" borderHover="hover:border-sky-500/50" />
            <MetricCard label="Latency" value="12ms" subtext="Global Average" color="text-purple-400" subcolor="text-slate-500" borderHover="hover:border-purple-500/50" />
            <MetricCard label="Capital Velocity" value="$4.2M" subtext="Per Hour Volume" color="text-amber-400" subcolor="text-slate-500" borderHover="hover:border-amber-500/50" />
        </div>
        <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg h-96 flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-white">Real-time Profit Performance</h3>
                <span className="text-xs text-slate-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500"></div> Live Stream</span>
            </div>
            <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monitorData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                        <XAxis dataKey="time" stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis stroke="#94a3b8" tick={{fontSize: 12}} axisLine={false} tickLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} 
                            itemStyle={{ color: '#38bdf8' }}
                        />
                        <Line type="monotone" dataKey="profit" stroke="#38bdf8" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#38bdf8' }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
);

const MetricCard = ({ label, value, subtext, subicon, color, subcolor, borderHover }: any) => (
    <div className={`bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg transition-colors ${borderHover}`}>
        <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">{label}</div>
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className={`text-xs mt-2 flex items-center gap-1 ${subcolor}`}>
            {subicon} {subtext}
        </div>
    </div>
);

const StrategiesSection = () => (
    <div className="animate-in fade-in duration-500">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg h-80 flex flex-col">
                <h3 className="font-bold mb-4 text-lg text-white">Strategy Contribution (Daily %)</h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={strategyData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                            <XAxis type="number" stroke="#94a3b8" tick={{fontSize: 10}} />
                            <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{fontSize: 10}} width={80} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                {strategyData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg h-80 flex flex-col">
                <h3 className="font-bold mb-4 text-lg text-white">Top 10 Pairs Profit Share</h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart layout="vertical" data={pairsData} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#334155" />
                            <XAxis type="number" stroke="#94a3b8" tick={{fontSize: 10}} />
                            <YAxis dataKey="name" type="category" stroke="#94a3b8" tick={{fontSize: 10}} width={80} />
                            <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }} />
                            <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg">
                <h3 className="font-bold mb-3 text-sm text-slate-400 uppercase">Active Chains</h3>
                <div className="text-3xl font-bold text-white mb-4">8 <span className="text-sm font-normal text-slate-500">Networks</span></div>
                <div className="flex flex-wrap gap-2">
                    <Badge text="Ethereum" color="bg-slate-800 text-slate-300 border-slate-700" />
                    <Badge text="Polygon" color="bg-purple-900/30 text-purple-300 border-purple-700/50" />
                    <Badge text="BSC" color="bg-yellow-900/30 text-yellow-300 border-yellow-700/50" />
                    <Badge text="Arbitrum" color="bg-blue-900/30 text-blue-300 border-blue-700/50" />
                </div>
            </div>

            <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg">
                <h3 className="font-bold mb-3 text-sm text-slate-400 uppercase">Connected DEXes</h3>
                <div className="text-3xl font-bold text-white mb-2">24</div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-sky-500 to-purple-500 h-full" style={{ width: '100%' }}></div>
                </div>
                <div className="text-xs text-slate-500 mt-2">100% Operational</div>
            </div>

            <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg">
                <h3 className="font-bold mb-3 text-sm text-slate-400 uppercase">Flash Loan Providers</h3>
                <div className="space-y-3">
                    <ProgressBar label="Aave V3" value="45%" color="bg-sky-500" textColor="text-sky-400" />
                    <ProgressBar label="Balancer" value="30%" color="bg-purple-500" textColor="text-purple-400" />
                    <ProgressBar label="Uniswap V3" value="25%" color="bg-pink-500" textColor="text-pink-400" />
                </div>
            </div>
        </div>
    </div>
);

const Badge = ({ text, color }: any) => (
    <span className={`px-2 py-1 border rounded text-xs ${color}`}>{text}</span>
);

const ChainBadge = ({ chain }: { chain: string }) => {
    const chainStyles: { [key: string]: string } = {
        'Polygon': 'bg-purple-900/30 text-purple-300 border-purple-700/30',
        'Ethereum': 'bg-slate-800 text-slate-300 border-slate-700',
        'BSC': 'bg-yellow-900/30 text-yellow-300 border-yellow-700/50',
        'Arbitrum': 'bg-blue-900/30 text-blue-300 border-blue-700/50',
    };
    const style = chainStyles[chain] || chainStyles['Ethereum'];
    return (
        <span className={`text-[10px] px-2 py-0.5 rounded uppercase font-bold border ${style}`}>
            {chain}
        </span>
    );
};

const ProgressBar = ({ label, value, color, textColor }: any) => (
    <div>
        <div className="flex justify-between text-xs mb-1"><span className="text-slate-300">{label}</span><span className={textColor}>{value}</span></div>
        <div className="w-full bg-slate-800 h-1.5 rounded-full"><div className={`${color} h-1.5 rounded-full`} style={{ width: value }}></div></div>
    </div>
);

const StreamSection = ({ events }: { events: StreamEvent[] }) => (
    <div className="animate-in fade-in duration-500 bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg h-full flex flex-col">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg text-white">Blockchain Activity Stream</h3>
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-xs rounded border border-emerald-500/20">Live Feed</span>
        </div>
        <div className="overflow-y-auto flex-1">
            <table className="w-full text-sm text-left text-slate-400">
                <thead className="text-xs text-slate-200 uppercase bg-slate-800/50">
                    <tr>
                        <th className="px-4 py-3 w-24">Time</th>
                        <th className="px-4 py-3 w-28">Chain</th>
                        <th className="px-4 py-3 w-48">Event Type</th>
                        <th className="px-4 py-3">Details</th>
                        <th className="px-4 py-3 text-right w-32">Value</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    {events.length > 0 ? (
                        events.map(event => (
                            <tr key={event.id} className="hover:bg-slate-800/40 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-slate-500">{new Date(event.timestamp).toLocaleTimeString()}</td>
                                <td className="px-4 py-3"><ChainBadge chain={event.chain} /></td>
                                <td className={`px-4 py-3 font-bold flex items-center gap-1 ${event.eventType === 'DEX_SWAP' ? 'text-emerald-400' : 'text-sky-400'}`}>
                                    {event.eventType === 'DEX_SWAP' ? <Check size={14} /> : <Search size={14} />}
                                    {event.eventType.replace('_', ' ')}
                                </td>
                                <td className="px-4 py-3 font-mono text-xs">{event.details}</td>
                                <td className={`px-4 py-3 text-right font-mono font-bold ${event.value.startsWith('+') ? 'text-emerald-400' : 'text-slate-500'}`}>{event.value}</td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="text-center py-12 text-slate-500">
                                Awaiting live blockchain data stream...
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
);

const OptimizationSection = () => (
    <div className="animate-in fade-in duration-500 bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg">
        <h3 className="font-bold mb-6 text-lg text-white">Real-time Optimization Metrics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <OptimizationCard label="Gas Optimization" value="98.5%" subtext="Efficiency Rating vs Baseline" color="text-emerald-400" />
            <OptimizationCard label="Slippage Reduction" value="0.04%" subtext="Average Realized Slippage" color="text-sky-400" />
            <OptimizationCard label="Route Efficiency" value="Top 1%" subtext="Global Benchmark Rank" color="text-purple-400" />
        </div>
    </div>
);

const OptimizationCard = ({ label, value, subtext, color }: any) => (
    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700">
        <div className="text-xs text-slate-400 mb-2 uppercase tracking-wider">{label}</div>
        <div className={`text-3xl font-bold mb-1 ${color}`}>{value}</div>
        <div className="text-xs text-slate-500">{subtext}</div>
    </div>
);

const SettingsSection = () => (
    <div className="animate-in fade-in duration-500 space-y-6">
        {/* Wallet Management */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-white">Wallet Management System</h3>
                <button className="bg-sky-500 hover:bg-sky-600 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors flex items-center gap-1">
                    <Wallet size={14} /> Add Wallet
                </button>
            </div>
            <table className="w-full text-sm text-left text-slate-400">
                <thead className="text-xs text-slate-200 uppercase bg-slate-800/50">
                    <tr>
                        <th className="px-4 py-2">Account Name</th>
                        <th className="px-4 py-2">Chain</th>
                        <th className="px-4 py-2">Balance</th>
                        <th className="px-4 py-2">Status</th>
                        <th className="px-4 py-2 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                    <tr>
                        <td className="px-4 py-3 font-medium text-white">Main Executor</td>
                        <td className="px-4 py-3">Multi-Chain</td>
                        <td className="px-4 py-3 font-mono text-emerald-400">$845,200</td>
                        <td className="px-4 py-3"><span className="text-emerald-400 text-xs border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1 w-fit"><Check size={12} /> Valid</span></td>
                        <td className="px-4 py-3 text-right">
                            <button className="text-slate-400 hover:text-sky-400 mr-3 transition-colors"><Settings size={14} /></button>
                            <button className="text-slate-400 hover:text-red-400 transition-colors"><X size={14} /></button>
                        </td>
                    </tr>
                </tbody>
                <tfoot className="bg-slate-800/30 font-bold text-slate-300">
                    <tr>
                        <td className="px-4 py-3" colSpan={2}>Total Wallets: 1</td>
                        <td className="px-4 py-3 font-mono text-emerald-400" colSpan={3}>Total: $845,200</td>
                    </tr>
                </tfoot>
            </table>
        </div>

        {/* Profit Withdrawal */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg">
            <h3 className="font-bold mb-4 text-lg text-white">Profit Withdrawal System</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-xs text-slate-400 mb-2 uppercase font-bold">Mode</label>
                    <div className="flex gap-1 bg-slate-800 p-1 rounded w-fit border border-slate-700">
                        <button className="px-4 py-1.5 rounded bg-sky-600 text-white text-sm font-medium shadow-lg">Auto</button>
                        <button className="px-4 py-1.5 rounded hover:bg-slate-700 text-slate-400 text-sm font-medium transition-colors">Manual</button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-2 uppercase font-bold">Auto-Withdraw Threshold ($)</label>
                    <div className="relative">
                        <span className="absolute left-3 top-2 text-slate-500">$</span>
                        <input type="number" defaultValue="10000" className="bg-slate-800 border border-slate-600 rounded px-3 pl-6 py-1.5 w-full text-sm text-white focus:border-sky-500 focus:outline-none" />
                    </div>
                </div>
                <div>
                    <label className="block text-xs text-slate-400 mb-2 uppercase font-bold">Manual Transfer</label>
                    <div className="flex gap-2">
                        <input type="number" placeholder="Amount" className="bg-slate-800 border border-slate-600 rounded px-3 py-1.5 w-full text-sm text-white focus:border-sky-500 focus:outline-none" />
                        <button className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors">Send</button>
                    </div>
                </div>
            </div>
        </div>

        {/* Capital Controls */}
        <div className="bg-[#1e293b] border border-slate-700 rounded-lg p-6 shadow-lg">
            <h3 className="font-bold mb-6 text-lg text-white">Capital Controls</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <div className="flex justify-between mb-3">
                        <label className="text-sm text-slate-300 font-medium">Capital Velocity Limit</label>
                        <span className="text-sm font-mono text-sky-400 font-bold bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">$250M</span>
                    </div>
                    <input type="range" min="1" max="500" defaultValue="250" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-400 transition-all" />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                        <span>$1M</span>
                        <span>$500M</span>
                    </div>
                </div>
                <div>
                    <div className="flex justify-between mb-3">
                        <label className="text-sm text-slate-300 font-medium">Profit Reinvestment Rate</label>
                        <span className="text-sm font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">80%</span>
                    </div>
                    <input type="range" min="0" max="100" defaultValue="80" className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500 hover:accent-emerald-400 transition-all" />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-2 font-mono">
                        <span>0%</span>
                        <span>100%</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default FoundationDashboard;