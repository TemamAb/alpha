import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Treemap } from 'recharts';
import { Globe, DollarSign, TrendingUp, PieChart } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface ExposureData {
  currency: string;
  exposure: number;
  percentage: number;
  change: number;
}

interface SectorData {
  sector: string;
  exposure: number;
  percentage: number;
  assets: number;
}

interface ExposureMatrixData {
  currencies: ExposureData[];
  sectors: SectorData[];
  totalExposure: number;
  timestamp: number;
}

const ExposureMatrix: React.FC = () => {
  const [exposureData, setExposureData] = useState<ExposureMatrixData>({
    currencies: [
      { currency: 'USDC', exposure: 45000, percentage: 36.1, change: 2.3 },
      { currency: 'WETH', exposure: 32000, percentage: 25.7, change: -1.8 },
      { currency: 'WBTC', exposure: 25000, percentage: 20.1, change: 5.2 },
      { currency: 'MATIC', exposure: 12000, percentage: 9.6, change: 1.1 },
      { currency: 'LINK', exposure: 8500, percentage: 6.8, change: -0.5 },
      { currency: 'UNI', exposure: 2500, percentage: 2.0, change: 3.7 }
    ],
    sectors: [
      { sector: 'DeFi', exposure: 52000, percentage: 41.8, assets: 12 },
      { sector: 'Layer 1', exposure: 28000, percentage: 22.5, assets: 8 },
      { sector: 'Infrastructure', exposure: 18000, percentage: 14.5, assets: 6 },
      { sector: 'Gaming', exposure: 15000, percentage: 12.1, assets: 4 },
      { sector: 'NFT', exposure: 12000, percentage: 9.6, assets: 3 }
    ],
    totalExposure: 124500,
    timestamp: Date.now()
  });

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'EXPOSURE_UPDATE') {
      const { exposure } = lastMessage.payload;
      if (exposure) {
        setExposureData(exposure);
      }
    }
  }, [lastMessage]);

  const formatCurrency = (value: number) => `$${value.toLocaleString()}`;
  const formatPercentage = (value: number) => `${value.toFixed(1)}%`;

  const currencyBarData = exposureData.currencies.map(curr => ({
    name: curr.currency,
    exposure: curr.exposure,
    percentage: curr.percentage,
    change: curr.change
  }));

  const sectorTreemapData = exposureData.sectors.map(sector => ({
    name: sector.sector,
    size: sector.exposure,
    percentage: sector.percentage
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">{label || data.name}</p>
          <p className="text-blue-400">Exposure: {formatCurrency(data.exposure || data.size)}</p>
          <p className="text-purple-400">Share: {formatPercentage(data.percentage)}</p>
          {data.change !== undefined && (
            <p className={`text-sm ${data.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              Change: {data.change >= 0 ? '+' : ''}{data.change.toFixed(1)}%
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const TreemapTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">{data.name}</p>
          <p className="text-blue-400">Exposure: {formatCurrency(data.size)}</p>
          <p className="text-purple-400">Share: {formatPercentage(data.percentage)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <Globe size={20} />
          Exposure Matrix
        </h3>
        <div className="text-xs text-gray-500">
          Last updated: {new Date(exposureData.timestamp).toLocaleTimeString()}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Total Exposure</p>
              <p className="text-xl font-bold text-blue-400">{formatCurrency(exposureData.totalExposure)}</p>
            </div>
            <DollarSign className="text-blue-400" size={24} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Currencies</p>
              <p className="text-xl font-bold text-green-400">{exposureData.currencies.length}</p>
            </div>
            <Globe className="text-green-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Sectors</p>
              <p className="text-xl font-bold text-purple-400">{exposureData.sectors.length}</p>
            </div>
            <PieChart className="text-purple-400" size={20} />
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Currency Exposure Bar Chart */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Currency Exposure</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currencyBarData}>
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
                <Bar dataKey="exposure" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sector Exposure Treemap */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-gray-300 mb-4">Sector Exposure</h4>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <Treemap
                data={sectorTreemapData}
                dataKey="size"
                aspectRatio={1}
                stroke="#374151"
                fill="#8884d8"
              >
                <Tooltip content={<TreemapTooltip />} />
              </Treemap>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* Currency Details */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300">Currency Breakdown</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Currency</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Exposure</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">%</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Change</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {exposureData.currencies.map((curr) => (
                  <tr key={curr.currency} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm text-gray-200 font-medium">{curr.currency}</td>
                    <td className="px-4 py-3 text-sm text-right text-blue-400 font-mono">
                      {formatCurrency(curr.exposure)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-purple-400 font-mono">
                      {formatPercentage(curr.percentage)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-sm font-mono ${curr.change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {curr.change >= 0 ? '+' : ''}{curr.change.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sector Details */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700">
            <h4 className="text-sm font-semibold text-gray-300">Sector Breakdown</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Sector</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Exposure</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">%</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">Assets</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {exposureData.sectors.map((sector) => (
                  <tr key={sector.sector} className="hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-sm text-gray-200 font-medium">{sector.sector}</td>
                    <td className="px-4 py-3 text-sm text-right text-blue-400 font-mono">
                      {formatCurrency(sector.exposure)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-purple-400 font-mono">
                      {formatPercentage(sector.percentage)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm text-gray-400">
                      {sector.assets}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExposureMatrix;
