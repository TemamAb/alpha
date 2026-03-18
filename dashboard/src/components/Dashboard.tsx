import React from 'react';
import { DollarSign, TrendingUp, Zap, ShieldCheck, Activity } from 'lucide-react';
import { useAlphaOrionStore } from '../hooks/useAlphaOrionStore';

const MetricCard = ({ label, value, icon: Icon, color, trend }: any) => (
  <div className="bg-slate-900 border border-white/20 p-6 rounded-2xl shadow-xl flex items-start justify-between group hover:border-white/40 transition-all">
    <div>
      <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-xl font-black text-white italic tracking-tighter tabular-nums">{value}</p>
      {trend && (
        <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest mt-1">
          {trend}
        </p>
      )}
    </div>
    <Icon size={16} className={`${color} opacity-80 group-hover:opacity-100 transition-all`} />
  </div>
);

const Dashboard: React.FC = () => {
  const {
    profitData,
    opportunities,
    systemHealth,
    pimlicoStatus,
    isLoading,
    currency
  } = useAlphaOrionStore();

  const formatValue = (value: number) => {
    if (currency === 'ETH') {
      const ethPrice = 3500;
      return `${(value / ethPrice).toFixed(4)} ETH`;
    }
    return `$${value.toLocaleString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-fade-in">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          label="Total PnL"
          value={formatValue(profitData?.totalPnL || 0)}
          icon={DollarSign}
          color="text-emerald-400"
          trend={profitData?.dailyPnL ? `+${formatValue(profitData.dailyPnL)} today` : null}
        />
        <MetricCard
          label="Active Opportunities"
          value={opportunities.filter(o => o.status === 'pending').length}
          icon={TrendingUp}
          color="text-blue-400"
        />
        <MetricCard
          label="Gas Savings"
          value={formatValue(pimlicoStatus?.totalGasSavings || 0)}
          icon={Zap}
          color="text-purple-400"
        />
        <MetricCard
          label="System Health"
          value={systemHealth?.status === 'healthy' ? 'HEALTHY' : systemHealth?.status?.toUpperCase() || 'UNKNOWN'}
          icon={ShieldCheck}
          color={systemHealth?.status === 'healthy' ? 'text-emerald-400' : 'text-amber-400'}
        />
      </div>

      {/* Opportunities Table */}
      <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-[0.3em]">Arbitrage Opportunities</h3>
          <Activity size={14} className="text-blue-400" />
        </div>

        {isLoading.opportunities ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
          </div>
        ) : opportunities.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <p className="text-sm">No arbitrage opportunities found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="px-6 py-4 text-[9px] font-black text-slate-200 uppercase tracking-widest">Chain</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-200 uppercase tracking-widest">Pair</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-200 uppercase tracking-widest">Spread</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-200 uppercase tracking-widest">Est. Profit</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-200 uppercase tracking-widest">Risk</th>
                  <th className="px-6 py-4 text-[9px] font-black text-slate-200 uppercase tracking-widest">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {opportunities.slice(0, 10).map((opp) => (
                  <tr key={opp.id} className="hover:bg-white/[0.05] transition-colors">
                    <td className="px-6 py-4 text-sm font-bold text-white">{opp.chain}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-300">{opp.tokenPair}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-400">
                      {(opp.spread * 100).toFixed(2)}%
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-400">
                      {formatValue(opp.estimatedProfit)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        opp.riskLevel === 'low' ? 'bg-emerald-500/20 text-emerald-400' :
                        opp.riskLevel === 'medium' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {opp.riskLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        opp.status === 'pending' ? 'bg-blue-500/20 text-blue-400' :
                        opp.status === 'executing' ? 'bg-amber-500/20 text-amber-400' :
                        opp.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {opp.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* System Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-[0.3em] mb-6">System Health</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Mode</span>
              <span className="text-sm font-bold text-white">{systemHealth?.mode || 'UNKNOWN'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Status</span>
              <span className={`text-sm font-bold ${
                systemHealth?.status === 'healthy' ? 'text-emerald-400' :
                systemHealth?.status === 'warning' ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {systemHealth?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Uptime</span>
              <span className="text-sm font-bold text-white">
                {systemHealth?.uptime ? `${(systemHealth.uptime / 3600).toFixed(1)}h` : '0h'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Active Connections</span>
              <span className="text-sm font-bold text-white">{systemHealth?.activeConnections || 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
          <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-[0.3em] mb-6">Pimlico Gasless Mode</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Status</span>
              <span className={`text-sm font-bold ${
                pimlicoStatus?.status === 'active' ? 'text-emerald-400' :
                pimlicoStatus?.status === 'inactive' ? 'text-amber-400' :
                'text-red-400'
              }`}>
                {pimlicoStatus?.status?.toUpperCase() || 'UNKNOWN'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Gas Savings</span>
              <span className="text-sm font-bold text-emerald-400">
                {formatValue(pimlicoStatus?.totalGasSavings || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Transactions</span>
              <span className="text-sm font-bold text-white">
                {pimlicoStatus?.transactionsProcessed || 0}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-300">Avg Reduction</span>
              <span className="text-sm font-bold text-purple-400">
                {pimlicoStatus?.averageGasReduction ? `${pimlicoStatus.averageGasReduction.toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;