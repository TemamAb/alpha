import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { BarChart3, TrendingUp, Eye, Zap } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface FeatureData {
  feature: string;
  importance: number;
  category: string;
  description: string;
}

interface FeatureCategory {
  name: string;
  features: FeatureData[];
  totalImportance: number;
}

const FeatureImportance: React.FC = () => {
  const [features, setFeatures] = useState<FeatureData[]>([
    { feature: 'Price Momentum', importance: 0.28, category: 'Technical', description: 'Short-term price movement indicators' },
    { feature: 'Volume Ratio', importance: 0.22, category: 'Volume', description: 'Trading volume relative to average' },
    { feature: 'Order Book Depth', importance: 0.18, category: 'Market Structure', description: 'Bid/ask depth and spread analysis' },
    { feature: 'Gas Price', importance: 0.15, category: 'Network', description: 'Current Ethereum gas costs' },
    { feature: 'Time of Day', importance: 0.12, category: 'Temporal', description: 'Hourly trading patterns' },
    { feature: 'Liquidity Score', importance: 0.09, category: 'Market Structure', description: 'Pool liquidity assessment' },
    { feature: 'Slippage History', importance: 0.08, category: 'Execution', description: 'Recent transaction slippage' },
    { feature: 'MEV Activity', importance: 0.06, category: 'Risk', description: 'Miner extractable value indicators' },
    { feature: 'Correlation Matrix', importance: 0.04, category: 'Risk', description: 'Asset correlation changes' },
    { feature: 'News Sentiment', importance: 0.03, category: 'Fundamental', description: 'Market news sentiment analysis' }
  ]);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'importance' | 'category'>('importance');

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'FEATURE_IMPORTANCE_UPDATE') {
      const { features: newFeatures } = lastMessage.payload;
      if (newFeatures) setFeatures(newFeatures);
    }
  }, [lastMessage]);

  const categories = ['all', ...Array.from(new Set(features.map(f => f.category)))];

  const filteredFeatures = selectedCategory === 'all'
    ? features
    : features.filter(f => f.category === selectedCategory);

  const sortedFeatures = [...filteredFeatures].sort((a, b) => {
    if (sortBy === 'importance') {
      return b.importance - a.importance;
    }
    return a.category.localeCompare(b.category);
  });

  const categoryData = categories.slice(1).map(category => {
    const categoryFeatures = features.filter(f => f.category === category);
    return {
      category,
      totalImportance: categoryFeatures.reduce((sum, f) => sum + f.importance, 0),
      featureCount: categoryFeatures.length
    };
  });

  const radarData = sortedFeatures.slice(0, 8).map(feature => ({
    feature: feature.feature.split(' ')[0], // Shorten for radar
    importance: feature.importance * 100
  }));

  const formatPercentage = (value: number) => `${(value * 100).toFixed(1)}%`;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const feature = features.find(f => f.feature === label);
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg max-w-xs">
          <p className="text-gray-200 font-semibold">{label}</p>
          <p className="text-blue-400">Importance: {formatPercentage(payload[0]?.value || 0)}</p>
          {feature && (
            <>
              <p className="text-gray-400 text-sm">Category: {feature.category}</p>
              <p className="text-gray-500 text-xs mt-1">{feature.description}</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const CategoryTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0]?.payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">{data.category}</p>
          <p className="text-green-400">Total Importance: {formatPercentage(data.totalImportance)}</p>
          <p className="text-gray-400 text-sm">{data.featureCount} features</p>
        </div>
      );
    }
    return null;
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'Technical': '#3b82f6',
      'Volume': '#10b981',
      'Market Structure': '#f59e0b',
      'Network': '#ef4444',
      'Temporal': '#8b5cf6',
      'Execution': '#06b6d4',
      'Risk': '#ec4899',
      'Fundamental': '#84cc16'
    };
    return colors[category] || '#6b7280';
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <BarChart3 size={20} />
          Feature Importance Analysis
        </h3>
        <div className="flex items-center gap-4">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'importance' | 'category')}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
          >
            <option value="importance">Sort by Importance</option>
            <option value="category">Sort by Category</option>
          </select>
        </div>
      </div>

      {/* Feature Importance Chart */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">
          Feature Importance Distribution
          {selectedCategory !== 'all' && ` - ${selectedCategory}`}
        </h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sortedFeatures} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                type="number"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={formatPercentage}
              />
              <YAxis
                type="category"
                dataKey="feature"
                stroke="#9CA3AF"
                fontSize={12}
                width={120}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="importance"
                fill="#3b82f6"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category Breakdown */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Category Breakdown</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="category"
                  stroke="#9CA3AF"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatPercentage} />
                <Tooltip content={<CategoryTooltip />} />
                <Bar dataKey="totalImportance" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Radar Chart */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Top Features Radar</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#374151" />
                <PolarAngleAxis
                  dataKey="feature"
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 30]}
                  tick={{ fill: '#9CA3AF', fontSize: 10 }}
                  tickFormatter={formatPercentage}
                />
                <Radar
                  name="Importance"
                  dataKey="importance"
                  stroke="#3b82f6"
                  fill="#3b82f6"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feature Details Table */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Feature Details</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-4 text-gray-400 font-medium">Feature</th>
                <th className="text-left py-2 px-4 text-gray-400 font-medium">Category</th>
                <th className="text-right py-2 px-4 text-gray-400 font-medium">Importance</th>
                <th className="text-left py-2 px-4 text-gray-400 font-medium">Description</th>
              </tr>
            </thead>
            <tbody>
              {sortedFeatures.map((feature, index) => (
                <tr key={feature.feature} className="border-b border-gray-800 hover:bg-gray-800/50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCategoryColor(feature.category) }}
                      ></div>
                      <span className="font-medium text-gray-200">{feature.feature}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 rounded-full text-xs font-medium"
                          style={{
                            backgroundColor: `${getCategoryColor(feature.category)}20`,
                            color: getCategoryColor(feature.category)
                          }}>
                      {feature.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-700 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${feature.importance * 100}%`,
                            backgroundColor: getCategoryColor(feature.category)
                          }}
                        ></div>
                      </div>
                      <span className="font-mono text-blue-400 min-w-[3rem]">
                        {formatPercentage(feature.importance)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-400 max-w-xs truncate">
                    {feature.description}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FeatureImportance;
