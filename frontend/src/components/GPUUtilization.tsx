import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import { Cpu, Zap, Thermometer, HardDrive, Activity, AlertTriangle } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface GPUData {
  timestamp: string;
  utilization: number;
  memoryUsage: number;
  temperature: number;
  powerConsumption: number;
  fanSpeed: number;
}

interface GPUMetrics {
  currentUtilization: number;
  averageUtilization: number;
  peakUtilization: number;
  memoryUsed: number;
  memoryTotal: number;
  temperature: number;
  powerDraw: number;
  fanRPM: number;
}

interface ModelTraining {
  model: string;
  status: 'training' | 'idle' | 'completed' | 'failed';
  progress: number;
  eta: string;
  gpuUtilization: number;
}

const GPUUtilization: React.FC = () => {
  const [gpuData, setGpuData] = useState<GPUMetrics>({
    currentUtilization: 78,
    averageUtilization: 65,
    peakUtilization: 95,
    memoryUsed: 8.2,
    memoryTotal: 11.0,
    temperature: 72,
    powerDraw: 185,
    fanRPM: 2800
  });

  const [historicalData, setHistoricalData] = useState<GPUData[]>([]);
  const [trainingJobs, setTrainingJobs] = useState<ModelTraining[]>([
    { model: 'Arbitrage Predictor v2', status: 'training', progress: 67, eta: '2h 15m', gpuUtilization: 85 },
    { model: 'Risk Assessment Model', status: 'idle', progress: 0, eta: '-', gpuUtilization: 0 },
    { model: 'Price Forecasting NN', status: 'completed', progress: 100, eta: '0m', gpuUtilization: 0 },
    { model: 'MEV Detection Model', status: 'training', progress: 23, eta: '8h 45m', gpuUtilization: 72 }
  ]);

  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'GPU_UPDATE') {
      const { metrics, history, training } = lastMessage.payload;
      if (metrics) setGpuData(metrics);
      if (history) setHistoricalData(history);
      if (training) setTrainingJobs(training);
    }
  }, [lastMessage]);

  // Generate sample historical data
  useEffect(() => {
    const generateHistory = () => {
      const data = [];
      const now = Date.now();
      const hours = selectedTimeframe === '1h' ? 1 : selectedTimeframe === '24h' ? 24 : 168; // 1h, 24h, 7d
      const interval = (hours * 60 * 60 * 1000) / 60; // Data points every interval

      for (let i = 59; i >= 0; i--) {
        const timestamp = new Date(now - i * interval).toISOString();
        data.push({
          timestamp,
          utilization: 60 + Math.random() * 30,
          memoryUsage: 7 + Math.random() * 3,
          temperature: 65 + Math.random() * 15,
          powerConsumption: 150 + Math.random() * 50,
          fanSpeed: 2500 + Math.random() * 500
        });
      }
      setHistoricalData(data);
    };

    generateHistory();
  }, [selectedTimeframe]);

  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;
  const formatTemperature = (value: number) => `${value.toFixed(0)}°C`;
  const formatPower = (value: number) => `${value.toFixed(0)}W`;
  const formatMemory = (value: number) => `${value.toFixed(1)}GB`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">{new Date(label).toLocaleTimeString()}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {
                entry.dataKey === 'utilization' || entry.dataKey === 'memoryUsage' ? formatPercentage(entry.value) :
                entry.dataKey === 'temperature' ? formatTemperature(entry.value) :
                entry.dataKey === 'powerConsumption' ? formatPower(entry.value) :
                entry.value.toFixed(0)
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'training': return 'text-green-400 bg-green-900/30';
      case 'idle': return 'text-gray-400 bg-gray-900/30';
      case 'completed': return 'text-blue-400 bg-blue-900/30';
      case 'failed': return 'text-red-400 bg-red-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'training': return <Activity size={14} className="text-green-400 animate-pulse" />;
      case 'idle': return <Cpu size={14} className="text-gray-400" />;
      case 'completed': return <Zap size={14} className="text-blue-400" />;
      case 'failed': return <AlertTriangle size={14} className="text-red-400" />;
      default: return <Cpu size={14} className="text-gray-400" />;
    }
  };

  const memoryUsagePercent = (gpuData.memoryUsed / gpuData.memoryTotal) * 100;
  const utilizationColor = gpuData.currentUtilization > 90 ? 'text-red-400' :
                          gpuData.currentUtilization > 70 ? 'text-yellow-400' : 'text-green-400';
  const tempColor = gpuData.temperature > 80 ? 'text-red-400' :
                   gpuData.temperature > 70 ? 'text-yellow-400' : 'text-green-400';

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <Cpu size={20} />
          GPU Utilization & Monitoring
        </h3>
        <div className="flex items-center gap-4">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>
        </div>
      </div>

      {/* GPU Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">GPU Utilization</p>
              <p className={`text-xl font-bold ${utilizationColor}`}>{formatPercentage(gpuData.currentUtilization)}</p>
            </div>
            <Activity className={`text-2xl ${utilizationColor}`} />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Avg: {formatPercentage(gpuData.averageUtilization)} | Peak: {formatPercentage(gpuData.peakUtilization)}
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Memory Usage</p>
              <p className="text-xl font-bold text-purple-400">
                {formatMemory(gpuData.memoryUsed)} / {formatMemory(gpuData.memoryTotal)}
              </p>
            </div>
            <HardDrive className="text-purple-400" size={20} />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {formatPercentage(memoryUsagePercent)} utilized
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Temperature</p>
              <p className={`text-xl font-bold ${tempColor}`}>{formatTemperature(gpuData.temperature)}</p>
            </div>
            <Thermometer className={`text-2xl ${tempColor}`} />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Fan: {gpuData.fanRPM.toLocaleString()} RPM
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Power Draw</p>
              <p className="text-xl font-bold text-orange-400">{formatPower(gpuData.powerDraw)}</p>
            </div>
            <Zap className="text-orange-400" size={20} />
          </div>
          <div className="mt-2 text-xs text-gray-500">
            TDP: 250W
          </div>
        </div>
      </div>

      {/* GPU Utilization Chart */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">GPU Metrics History ({selectedTimeframe})</h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={historicalData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timestamp"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis
                yAxisId="percentage"
                orientation="left"
                stroke="#3b82f6"
                fontSize={12}
                tickFormatter={formatPercentage}
              />
              <YAxis
                yAxisId="temperature"
                orientation="right"
                stroke="#ef4444"
                fontSize={12}
                tickFormatter={formatTemperature}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="percentage"
                type="monotone"
                dataKey="utilization"
                stackId="1"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.3}
                name="Utilization"
              />
              <Area
                yAxisId="temperature"
                type="monotone"
                dataKey="temperature"
                stackId="2"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.2}
                name="Temperature"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Training Jobs */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Active Training Jobs</h4>
        <div className="space-y-3">
          {trainingJobs.map((job, index) => (
            <div key={job.model} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(job.status)}
                <div>
                  <p className="text-sm font-medium text-gray-200">{job.model}</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(job.status)}`}>
                    {job.status}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-400">{job.progress}%</p>
                  <p className="text-xs text-gray-400">ETA: {job.eta}</p>
                </div>
                <div className="w-20 bg-gray-700 rounded-full h-2">
                  <div
                    className="h-2 rounded-full bg-blue-500"
                    style={{ width: `${job.progress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GPUUtilization;
