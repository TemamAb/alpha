import React, { useState, useEffect } from 'react';
import { BarChart, Shield, Activity, Database, Zap, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface RiskMetrics {
  var99: number;
  sortino: number;
  portfolioDelta: number;
  sharpeRatio: number;
  beta: number;
  expectedShortfall: number;
  maxDrawdown: number;
  volatility: number;
}

interface InfraStatus {
  latency: number;
  shards: {
    ok: number;
    total: number;
  };
  kafka: 'Healthy' | 'Degraded' | 'Offline';
}

const RightSidebar: React.FC = () => {
  const [risk, setRisk] = useState<RiskMetrics>({
    var99: 450,
    sortino: 3.2,
    portfolioDelta: 0.0012,
    sharpeRatio: 1.8,
    beta: 0.95,
    expectedShortfall: 650,
    maxDrawdown: 0.08,
    volatility: 0.15
  });
  const [infra, setInfra] = useState<InfraStatus>({ latency: 42, shards: { ok: 8, total: 8 }, kafka: 'Healthy' });
  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'TELEMETRY') {
      const { risk: riskPayload, infra: infraPayload } = lastMessage.payload;

      if (riskPayload) {
        setRisk(riskPayload);
      }

      if (infraPayload) {
        setInfra(prev => ({
          ...prev,
          latency: infraPayload.latency,
          shards: { ok: infraPayload.activeShards, total: prev.shards.total },
          kafka: infraPayload.kafkaStatus,
        }));
      }
    }
  }, [lastMessage]);

  const getDeltaColor = (delta: number) => {
    if (Math.abs(delta) < 0.005) return 'text-green-400'; // Near-neutral
    if (Math.abs(delta) < 0.01) return 'text-yellow-400'; // Moderate exposure
    return 'text-red-500'; // High exposure
  };

  const StatusIndicator: React.FC<{ status: 'Healthy' | 'Degraded' | 'Offline' | boolean }> = ({ status }) => {
    if (status === 'Healthy' || status === true) {
      return <CheckCircle size={14} className="text-green-500" />;
    }
    if (status === 'Degraded') {
      return <AlertTriangle size={14} className="text-yellow-500" />;
    }
    return <XCircle size={14} className="text-red-500" />;
  };

  return (
    <div className="h-full w-64 bg-gray-900 text-white border-l border-gray-700 flex flex-col p-4 font-mono text-sm shadow-xl z-10">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Live Telemetry</h2>
        <div className="h-0.5 w-full bg-purple-600 shadow-[0_0_8px_rgba(147,51,234,0.6)]"></div>
      </div>

      {/* Risk Metrics Section */}
      <div className="mb-8">
        <h3 className="text-xs font-semibold text-red-400 mb-4 uppercase tracking-wide flex items-center gap-2">
          <Shield size={14} />
          Risk Metrics
        </h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">VaR (99%, 1d)</span>
            <span className="text-gray-200 font-bold">${risk.var99.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Sortino Ratio</span>
            <span className="text-gray-200 font-bold">{risk.sortino.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Portfolio Delta</span>
            <span className={`font-bold ${getDeltaColor(risk.portfolioDelta)}`}>
              {risk.portfolioDelta > 0 ? '+' : ''}{risk.portfolioDelta.toFixed(4)}
            </span>
          </div>
        </div>
      </div>

      {/* Infrastructure Health Section */}
      <div className="flex-grow">
        <h3 className="text-xs font-semibold text-teal-400 mb-4 uppercase tracking-wide flex items-center gap-2">
          <Activity size={14} />
          Infrastructure Health
        </h3>
        <div className="space-y-3 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 flex items-center gap-1.5"><Zap size={12}/>Avg. Latency</span>
            <span className="text-gray-200 font-bold">{infra.latency}ms</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 flex items-center gap-1.5"><Database size={12}/>DB Shards</span>
            <div className="flex items-center gap-2">
              <StatusIndicator status={infra.shards.ok === infra.shards.total} />
              <span className="text-gray-200 font-bold">{infra.shards.ok}/{infra.shards.total} OK</span>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400 flex items-center gap-1.5"><BarChart size={12}/>Event Stream</span>
            <div className="flex items-center gap-2">
              <StatusIndicator status={infra.kafka} />
              <span className="text-gray-200 font-bold">{infra.kafka}</span>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="mt-auto pt-4 border-t border-gray-800">
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.7)]"></div>
          <span className="text-xs text-green-400 font-semibold">ALL SYSTEMS OPERATIONAL</span>
        </div>
      </div>
    </div>
  );
};

export default RightSidebar;