import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';

interface CorrelationData {
  [asset: string]: { [asset: string]: number };
}

const CorrelationHeatmap: React.FC = () => {
  const [correlationData, setCorrelationData] = useState<CorrelationData>({
    'WETH': { 'WETH': 1.0, 'WBTC': 0.85, 'USDC': -0.15, 'DAI': -0.12 },
    'WBTC': { 'WETH': 0.85, 'WBTC': 1.0, 'USDC': -0.08, 'DAI': -0.05 },
    'USDC': { 'WETH': -0.15, 'WBTC': -0.08, 'USDC': 1.0, 'DAI': 0.95 },
    'DAI': { 'WETH': -0.12, 'WBTC': -0.05, 'USDC': 0.95, 'DAI': 1.0 }
  });

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'CORRELATION_UPDATE') {
      const { correlationMatrix } = lastMessage.payload;
      if (correlationMatrix) {
        setCorrelationData(correlationMatrix);
      }
    }
  }, [lastMessage]);

  const assets = Object.keys(correlationData);
  const maxCorrelation = Math.max(...assets.flatMap(asset =>
    Object.values(correlationData[asset])
  ));
  const minCorrelation = Math.min(...assets.flatMap(asset =>
    Object.values(correlationData[asset])
  ));

  const getColor = (value: number) => {
    if (value === 1.0) return 'bg-gray-800 text-white'; // Diagonal
    if (value >= 0.7) return 'bg-red-600 text-white'; // High positive
    if (value >= 0.3) return 'bg-red-400 text-white'; // Moderate positive
    if (value >= -0.3) return 'bg-yellow-400 text-black'; // Low correlation
    if (value >= -0.7) return 'bg-blue-400 text-white'; // Moderate negative
    return 'bg-blue-600 text-white'; // High negative
  };

  const getIntensity = (value: number) => {
    return Math.abs(value) * 100; // For opacity or intensity
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <h3 className="text-lg font-bold text-blue-400 mb-4">Asset Correlation Matrix</h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="p-2 text-left text-xs font-bold text-gray-400 uppercase">Asset</th>
              {assets.map(asset => (
                <th key={asset} className="p-2 text-center text-xs font-bold text-gray-400 uppercase min-w-[60px]">
                  {asset}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assets.map(rowAsset => (
              <tr key={rowAsset} className="border-t border-gray-800">
                <td className="p-2 text-xs font-bold text-gray-200 min-w-[60px]">
                  {rowAsset}
                </td>
                {assets.map(colAsset => {
                  const value = correlationData[rowAsset]?.[colAsset] || 0;
                  const isDiagonal = rowAsset === colAsset;

                  return (
                    <td key={colAsset} className="p-1 text-center">
                      <div
                        className={`w-12 h-12 rounded flex items-center justify-center text-xs font-bold transition-all hover:scale-110 ${getColor(value)}`}
                        title={`${rowAsset} vs ${colAsset}: ${(value * 100).toFixed(1)}%`}
                      >
                        {isDiagonal ? '—' : `${(value * 100).toFixed(0)}%`}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded"></div>
          <span>High Positive (70-100%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 rounded"></div>
          <span>Moderate Positive (30-70%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 rounded"></div>
          <span>Low Correlation (-30-30%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-400 rounded"></div>
          <span>Moderate Negative (-70--30%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-600 rounded"></div>
          <span>High Negative (-100--70%)</span>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

export default CorrelationHeatmap;
