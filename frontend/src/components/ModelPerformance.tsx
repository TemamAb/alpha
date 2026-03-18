import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Brain, TrendingUp, TrendingDown, Target, AlertTriangle, CheckCircle } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  mse: number;
}

interface ModelPerformanceData {
  timestamp: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  mse: number;
}

interface ModelComparison {
  model: string;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  status: 'active' | 'deprecated' | 'experimental';
}

const ModelPerformance: React.FC = () => {
  const [currentMetrics, setCurrentMetrics] = useState<ModelMetrics>({
    accuracy: 0.87,
    precision: 0.84,
    recall: 0.89,
    f1Score: 0.86,
    auc: 0.92,
    mse: 0.023
  });

  const [performanceHistory, setPerformanceHistory] = useState<ModelPerformanceData[]>([]);
  const [modelComparison, setModelComparison] = useState<ModelComparison[]>([
    { model: 'XGBoost Classifier', accuracy: 0.87, precision: 0.84, recall: 0.89, f1Score: 0.86, auc: 0.92, status: 'active' },
    { model: 'Random Forest', accuracy: 0.82, precision: 0.79, recall: 0.85, f1Score: 0.82, auc: 0.88, status: 'deprecated' },
    { model: 'Neural Network', accuracy: 0.91, precision: 0.88, recall: 0.93, f1Score: 0.90, auc: 0.95, status: 'experimental' },
    { model: 'Ensemble Model', accuracy: 0.89, precision: 0.86, recall: 0.91, f1Score: 0.88, auc: 0.94, status: 'active' }
  ]);

  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24h');

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'MODEL_PERFORMANCE_UPDATE') {
      const { metrics, history, comparison } = lastMessage.payload;
      if (metrics) setCurrentMetrics(metrics);
      if (history) setPerformanceHistory(history);
      if (comparison) setModelComparison(comparison);
    }
  }, [lastMessage]);

  // Generate sample performance history data
  useEffect(() => {
    const generateHistory = () => {
      const data = [];
      const now = Date.now();
      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now - i * 60 * 60 * 1000).toISOString();
        data.push({
          timestamp,
          accuracy: 0.85 + (Math.random() - 0.5) * 0.1,
          precision: 0.82 + (Math.random() - 0.5) * 0.1,
          recall: 0.87 + (Math.random() - 0.5) * 0.1,
          f1Score: 0.84 + (Math.random() - 0.5) * 0.1,
          auc: 0.90 + (Math.random() - 0.5) * 0.1,
          mse: 0.025 + (Math.random() - 0.5) * 0.01
        });
      }
      setPerformanceHistory(data);
    };

    generateHistory();
  }, [selectedTimeframe]);

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;
  const formatDecimal = (value: number) => value.toFixed(3);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">{new Date(label).toLocaleTimeString()}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {entry.value > 1 ? formatPercentage(entry.value) : formatDecimal(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400 bg-green-900/30';
      case 'deprecated': return 'text-red-400 bg-red-900/30';
      case 'experimental': return 'text-yellow-400 bg-yellow-900/30';
      default: return 'text-gray-400 bg-gray-900/30';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle size={14} className="text-green-400" />;
      case 'deprecated': return <AlertTriangle size={14} className="text-red-400" />;
      case 'experimental': return <Brain size={14} className="text-yellow-400" />;
      default: return <Target size={14} className="text-gray-400" />;
    }
  };

  const comparisonData = modelComparison.map(model => ({
    name: model.model.split(' ')[0], // Shorten names for chart
    accuracy: model.accuracy,
    precision: model.precision,
    recall: model.recall,
    f1Score: model.f1Score,
    auc: model.auc
  }));

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <Brain size={20} />
          Model Performance
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
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Current Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Accuracy</p>
              <p className="text-xl font-bold text-blue-400">{formatPercentage(currentMetrics.accuracy)}</p>
            </div>
            <Target className="text-blue-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Precision</p>
              <p className="text-xl font-bold text-green-400">{formatPercentage(currentMetrics.precision)}</p>
            </div>
            <TrendingUp className="text-green-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Recall</p>
              <p className="text-xl font-bold text-purple-400">{formatPercentage(currentMetrics.recall)}</p>
            </div>
            <CheckCircle className="text-purple-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">F1 Score</p>
              <p className="text-xl font-bold text-yellow-400">{formatPercentage(currentMetrics.f1Score)}</p>
            </div>
            <Brain className="text-yellow-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">AUC</p>
              <p className="text-xl font-bold text-orange-400">{formatPercentage(currentMetrics.auc)}</p>
            </div>
            <TrendingUp className="text-orange-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">MSE</p>
              <p className="text-xl font-bold text-red-400">{formatDecimal(currentMetrics.mse)}</p>
            </div>
            <TrendingDown className="text-red-400" size={20} />
          </div>
        </div>
      </div>

      {/* Performance History Chart */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Performance History ({selectedTimeframe})</h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceHistory}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="timestamp"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => new Date(value).toLocaleTimeString()}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} domain={[0.7, 1.0]} />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="accuracy"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                name="Accuracy"
              />
              <Line
                type="monotone"
                dataKey="precision"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                name="Precision"
              />
              <Line
                type="monotone"
                dataKey="recall"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                name="Recall"
              />
              <Line
                type="monotone"
                dataKey="f1Score"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                name="F1 Score"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Model Comparison Table */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Model Comparison</h4>
          <div className="space-y-3">
            {modelComparison.map((model, index) => (
              <div key={model.model} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(model.status)}
                  <div>
                    <p className="text-sm font-medium text-gray-200">{model.model}</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(model.status)}`}>
                      {model.status}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-blue-400">{formatPercentage(model.accuracy)}</p>
                  <p className="text-xs text-gray-400">AUC: {formatPercentage(model.auc)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Accuracy Distribution */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Accuracy Distribution</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} domain={[0.7, 1.0]} />
                <Tooltip
                  formatter={(value: any) => [formatPercentage(value), 'Accuracy']}
                  labelStyle={{ color: '#9CA3AF' }}
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151' }}
                />
                <Bar dataKey="accuracy" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelPerformance;
