import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface AssetClass {
  name: string;
  pnl: number;
  percentage: number;
  color: string;
}

interface PortfolioData {
  totalPnL: number;
  assetClasses: AssetClass[];
  timestamp: number;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00', '#ff0000'];

const PortfolioAttribution: React.FC = () => {
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    totalPnL: 12450,
    assetClasses: [
      { name: 'Spot Arbitrage', pnl: 5200, percentage: 41.8, color: '#8884d8' },
      { name: 'Perpetuals', pnl: 3100, percentage: 24.9, color: '#82ca9d' },
      { name: 'Options', pnl: 2150, percentage: 17.3, color: '#ffc658' },
      { name: 'Flash Loans', pnl: 1500, percentage: 12.0, color: '#ff7300' },
      { name: 'Gamma Scalping', pnl: 500, percentage: 4.0, color: '#00ff00' }
    ],
    timestamp: Date.now()
  });

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'PORTFOLIO_UPDATE') {
      const { portfolio } = lastMessage.payload;
      if (portfolio) {
        setPortfolioData(portfolio);
      }
    }
  }, [lastMessage]);

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const pieData = portfolioData.assetClasses.map((asset, index) => ({
    name: asset.name,
    value: asset.pnl,
    percentage: asset.percentage,
    color: COLORS[index % COLORS.length]
  }));

  const barData = portfolioData.assetClasses.map(asset => ({
    name: asset.name.split(' ')[0], // Shorten names for bar chart
    pnl: asset.pnl,
    percentage: asset.percentage
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">{data.name}</p>
          <p className="text-green-400">P&L: {formatCurrency(data.pnl || data.value)}</p>
          <p className="text-blue-400">Share: {formatPercentage(data.percentage)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-green-400 flex items-center gap-2">
          <DollarSign size={20} />
          Portfolio Attribution
        </h3>
        <div className="text-xs text-gray-500">
          Last updated: {new Date(portfolioData.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Total P&L</p>
              <p className="text-xl font-bold text-green-400">{formatCurrency(portfolioData.totalPnL)}</p>
            </div>
            <TrendingUp className="text-green-400" size={24} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Top Performer</p>
              <p className="text-sm font-bold text-blue-400">
                {portfolioData.assetClasses[0]?.name}
              </p>
              <p className="text-xs text-gray-500">
                {formatPercentage(portfolioData.assetClasses[0]?.percentage)}
              </p>
            </div>
            <Percent className="text-blue-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Asset Classes</p>
              <p className="text-xl font-bold text-purple-400">{portfolioData.assetClasses.length}</p>
            </div>
            <BarChart className="text-purple-400" size={20} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">P&L Distribution by Asset Class</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percentage }) => `${name.split(' ')[0]} ${percentage.toFixed(1)}%`}
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">P&L by Strategy</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis
                  dataKey="name"
                  stroke="#9CA3AF"
                  fontSize={12}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="pnl" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Breakdown Table */}
      <div className="mt-6 bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-700">
          <h4 className="text-sm font-semibold text-gray-300">Detailed Attribution</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Asset Class</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">P&L</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Portfolio %</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {portfolioData.assetClasses.map((asset, index) => (
                <tr key={asset.name} className="hover:bg-gray-800/30">
                  <td className="px-4 py-3 text-sm text-gray-200 font-medium">{asset.name}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-400 font-mono">
                    {formatCurrency(asset.pnl)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right text-blue-400 font-mono">
                    {formatPercentage(asset.percentage)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {asset.pnl > 0 ? (
                      <TrendingUp className="text-green-400 mx-auto" size={16} />
                    ) : (
                      <TrendingDown className="text-red-400 mx-auto" size={16} />
                    )}
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

export default PortfolioAttribution;
