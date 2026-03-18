import React, { useState } from 'react';
import { Wifi, RefreshCw } from 'lucide-react';
import { useAlphaOrionStore } from '../hooks/useAlphaOrionStore';

const Header: React.FC = () => {
  const { systemHealth, profitData, currency, refreshInterval } = useAlphaOrionStore();
  const { setCurrency, setRefreshInterval } = useAlphaOrionStore.getState();
  const [isEditingInterval, setIsEditingInterval] = useState(false);
  const [intervalInput, setIntervalInput] = useState(String(refreshInterval));

  const handleIntervalSubmit = () => {
    const val = parseInt(intervalInput);
    if (val >= 1 && val <= 30) {
      setRefreshInterval(val);
    }
    setIsEditingInterval(false);
  };

  const formatProfit = () => {
    if (currency === 'ETH' && profitData?.totalPnL) {
      const ethPrice = 3500;
      return `${(profitData.totalPnL / ethPrice).toFixed(4)} ETH`;
    }
    return `$${profitData?.totalPnL?.toLocaleString() || '0'}`;
  };

  return (
    <header className="h-20 border-b border-white/5 bg-slate-950/50 flex items-center justify-between px-10 shrink-0">
      <div className="flex items-center gap-6">
        {/* Engine Node Signal Badge */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full">
          <Wifi size={12} className="text-emerald-400 animate-pulse" />
          <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-wider">Engine Node</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-flush" />
        </div>

        {/* System Status */}
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-100">System:</span>
          <div className={`flex items-center gap-2 px-3 py-1 border rounded-full ${
            systemHealth?.status === 'healthy' ? 'bg-emerald-500/20 border-emerald-500/40' :
            systemHealth?.status === 'warning' ? 'bg-amber-500/20 border-amber-500/40' :
            'bg-red-500/20 border-red-500/40'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              systemHealth?.status === 'healthy' ? 'bg-emerald-400' :
              systemHealth?.status === 'warning' ? 'bg-amber-400' :
              'bg-red-400'
            } animate-pulse`} />
            <span className="text-[9px] font-black uppercase tracking-widest">
              {systemHealth?.mode || 'UNKNOWN'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-8">
        {/* Currency Toggle */}
        <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-1">
          <button
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
              currency === 'USD'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            USD
          </button>
          <button
            onClick={() => setCurrency('ETH')}
            className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded transition-all ${
              currency === 'ETH'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ETH
          </button>
        </div>

        {/* Profit/min Pulse */}
        <div className="text-right">
          <p className="text-[8px] font-light text-slate-400 uppercase tracking-widest">Profit/min</p>
          <p className="text-lg font-thin text-emerald-400 tabular-nums tracking-wide">
            {formatProfit()}
          </p>
        </div>

        <div className="h-8 w-px bg-white/10" />

        {/* Win Rate */}
        <div className="text-right">
          <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Win Rate</p>
          <p className="text-lg font-black text-emerald-400 italic tabular-nums">
            {profitData?.winRate ? `${(profitData.winRate * 100).toFixed(1)}%` : '0%'}
          </p>
        </div>

        {/* Refresh Interval */}
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="text-slate-400" />
          {isEditingInterval ? (
            <input
              type="number"
              min="1"
              max="30"
              value={intervalInput}
              onChange={(e) => setIntervalInput(e.target.value.replace(/[^0-9]/g, ''))}
              onBlur={handleIntervalSubmit}
              onKeyDown={(e) => e.key === 'Enter' && handleIntervalSubmit()}
              className="w-10 bg-transparent text-xs font-bold text-white border-b border-slate-400 focus:border-blue-400 outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={() => { setIsEditingInterval(true); setIntervalInput(String(refreshInterval)); }}
              className="text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              {refreshInterval}s
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;