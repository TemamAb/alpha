import React, { useState, useEffect, useRef } from 'react';
import { Terminal, AlertCircle, CheckCircle, Info, Clock, Trash2, Pause, Play, Search, Maximize2, Minimize2, Download, Copy, X, Check, Settings, Filter, ChevronDown } from 'lucide-react';

interface LogEntry {
  id: number;
  timestamp: Date;
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  source: string;
}

const SystemLogs: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'success' | 'warning' | 'error'>('all');
  const [isPaused, setIsPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [isMaximized, setIsMaximized] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [use24Hour, setUse24Hour] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Generate initial logs
  useEffect(() => {
    const initialLogs: LogEntry[] = Array.from({ length: 5 }).map((_, i) => ({
      id: Date.now() - i * 1000,
      timestamp: new Date(Date.now() - (5 - i) * 60000),
      level: 'info',
      message: `System initialized. Module ${['Alpha', 'Beta', 'Gamma'][i % 3]} loaded.`,
      source: 'SYSTEM'
    }));
    setLogs(initialLogs);
  }, []);

  // Simulate real-time logs
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const types: ('info' | 'success' | 'warning')[] = ['info', 'success', 'info', 'warning', 'success'];
      const sources = ['ARBITRAGE', 'PIMLICO', 'MEMPOOL', 'RISK_GUARD'];
      const messages = [
        'Scanning block 182394...',
        'Gas price updated: 12.5 gwei',
        'Opportunity detected on Polygon zkEVM',
        'Execution verified. Profit: +$12.40',
        'MEV protection active. Transaction bundled.',
        'Liquidity pool depth analysis complete.',
        'Network latency optimized: 45ms'
      ];

      const newLog: LogEntry = {
        id: Date.now(),
        timestamp: new Date(),
        level: types[Math.floor(Math.random() * types.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        source: sources[Math.floor(Math.random() * sources.length)]
      };

      setLogs(prev => [...prev.slice(-49), newLog]); // Keep last 50 logs
    }, 3000);

    return () => clearInterval(interval);
  }, [isPaused]);

  // Auto-scroll
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, filter, searchQuery, sourceFilter]);

  const filteredLogs = logs.filter(log => 
    (filter === 'all' || log.level === filter) &&
    (sourceFilter === 'ALL' || log.source === sourceFilter) &&
    (log.message.toLowerCase().includes(searchQuery.toLowerCase()) || 
     log.source.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getIcon = (level: string) => {
    switch (level) {
      case 'success': return <CheckCircle size={14} className="text-emerald-400" />;
      case 'warning': return <AlertCircle size={14} className="text-amber-400" />;
      case 'error': return <AlertCircle size={14} className="text-red-400" />;
      default: return <Info size={14} className="text-blue-400" />;
    }
  };

  const getColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-emerald-400';
      case 'warning': return 'text-amber-400';
      case 'error': return 'text-red-400';
      default: return 'text-blue-400';
    }
  };

  const handleDownload = () => {
    const content = logs.map(log => 
      `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyLog = (log: LogEntry) => {
    const text = `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] [${log.source}] ${log.message}`;
    navigator.clipboard.writeText(text);
    setCopiedId(log.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`${
      isMaximized 
        ? 'fixed inset-4 z-50 bg-slate-900/95' 
        : 'bg-slate-900/40 h-[400px]'
      } border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl flex flex-col transition-all duration-300 relative`}>
      <div className="flex justify-between items-center mb-6 shrink-0">
        <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-[0.3em] flex items-center gap-2">
          <Terminal size={14} className="text-slate-400" />
          System Event Logs
        </h3>
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition-colors" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..." 
              className="bg-slate-950/50 border border-white/5 rounded-lg pl-7 pr-3 py-1 text-[10px] text-slate-300 placeholder-slate-600 focus:border-blue-500/50 outline-none w-24 focus:w-40 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                <X size={10} />
              </button>
            )}
          </div>
          <div className="relative group">
            <Filter size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-slate-950/50 border border-white/5 rounded-lg pl-7 pr-8 py-1 text-[10px] font-bold text-slate-300 focus:border-blue-500/50 outline-none appearance-none cursor-pointer hover:bg-white/5 transition-all uppercase tracking-wider"
            >
              {['ALL', 'SYSTEM', 'ARBITRAGE', 'PIMLICO', 'MEMPOOL', 'RISK_GUARD'].map(s => (
                <option key={s} value={s} className="bg-slate-900 text-slate-300">{s}</option>
              ))}
            </select>
            <ChevronDown size={10} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          </div>
          <div className="flex bg-slate-950/50 rounded-lg p-1 border border-white/5">
            {(['all', 'success', 'warning', 'error'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider transition-all ${
                  filter === f 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? <Play size={14} className="text-emerald-400" /> : <Pause size={14} className="text-amber-400" />}
            </button>
            <button 
              onClick={handleDownload}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
              title="Download Logs"
            >
              <Download size={14} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
            </button>
            <button 
              onClick={() => setLogs([])}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
              title="Clear Logs"
            >
              <Trash2 size={14} className="text-slate-500 group-hover:text-red-400 transition-colors" />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
              title="Settings"
            >
              <Settings size={14} className="text-slate-500 group-hover:text-blue-400 transition-colors" />
            </button>
            <button 
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
              title={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? <Minimize2 size={14} className="text-blue-400" /> : <Maximize2 size={14} className="text-blue-400" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-amber-400' : 'bg-emerald-400 animate-pulse'}`} />
            <span className={`text-[8px] font-bold ${isPaused ? 'text-amber-400' : 'text-emerald-400'} uppercase tracking-widest`}>
              {isPaused ? 'PAUSED' : 'LIVE'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-2 font-mono">
        {filteredLogs.map((log) => (
          <div key={log.id} className="group flex items-start gap-3 p-3 rounded-lg bg-slate-950/50 border border-white/5 hover:border-white/10 transition-colors text-xs">
            <div className="mt-0.5 shrink-0 opacity-70">
              {getIcon(log.level)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <span className={`font-bold uppercase tracking-wider text-[10px] ${getColor(log.level)}`}>
                  {log.source}
                </span>
                <span className="text-[10px] text-slate-500 flex items-center gap-1">
                  <Clock size={10} />
                  {log.timestamp.toLocaleTimeString('en-US', { hour12: !use24Hour, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              </div>
              <p className={`text-slate-300 leading-relaxed truncate ${
                fontSize === 'small' ? 'text-[10px]' : fontSize === 'large' ? 'text-sm' : 'text-xs'
              }`}>
                {log.message}
              </p>
            </div>
            <button
              onClick={() => handleCopyLog(log)} 
              className={`opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/10 rounded transition-all shrink-0 ${copiedId === log.id ? 'opacity-100' : ''}`}
              title={copiedId === log.id ? "Copied!" : "Copy log entry"}
            >
              {copiedId === log.id ? (
                <Check size={10} className="text-emerald-400" />
              ) : (
                <Copy size={10} className="text-slate-500 hover:text-blue-400" />
              )}
            </button>
          </div>
        ))}
        <div ref={logsEndRef} />
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowSettings(false)} />
          <div className="absolute top-16 right-8 z-20 bg-slate-900 border border-white/10 p-4 rounded-xl shadow-2xl w-64 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Log Settings</h4>
            <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white">
              <X size={12} />
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Font Size</label>
              <div className="flex bg-slate-950 rounded-lg p-1 border border-white/5">
                {['small', 'medium', 'large'].map((s) => (
                  <button
                    key={s}
                    onClick={() => setFontSize(s as any)}
                    className={`flex-1 py-1 text-[9px] font-bold uppercase rounded transition-all ${
                      fontSize === s ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {s.charAt(0).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-2">Time Format</label>
              <div className="flex bg-slate-950 rounded-lg p-1 border border-white/5">
                {[true, false].map((is24) => (
                  <button
                    key={String(is24)}
                    onClick={() => setUse24Hour(is24)}
                    className={`flex-1 py-1 text-[9px] font-bold uppercase rounded transition-all ${
                      use24Hour === is24 ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    {is24 ? '24H' : '12H'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        </>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59, 130, 246, 0.4); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.6); }
      `}</style>
    </div>
  );
};

export default SystemLogs;