import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BookOpen, TrendingUp, TrendingDown, Activity, DollarSign } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

interface OrderBookData {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  midPrice: number;
  timestamp: number;
}

interface LiquidityMetrics {
  bidLiquidity: number;
  askLiquidity: number;
  totalLiquidity: number;
  spreadPercentage: number;
}

const OrderBookVisualizer: React.FC = () => {
  const [orderBook, setOrderBook] = useState<OrderBookData>({
    bids: [
      { price: 1847.50, size: 12.5, total: 12.5 },
      { price: 1847.25, size: 8.3, total: 20.8 },
      { price: 1847.00, size: 15.7, total: 36.5 },
      { price: 1846.75, size: 22.1, total: 58.6 },
      { price: 1846.50, size: 9.4, total: 68.0 },
      { price: 1846.25, size: 18.2, total: 86.2 },
      { price: 1846.00, size: 11.6, total: 97.8 },
      { price: 1845.75, size: 25.3, total: 123.1 }
    ],
    asks: [
      { price: 1848.50, size: 14.2, total: 14.2 },
      { price: 1848.75, size: 7.8, total: 22.0 },
      { price: 1849.00, size: 19.3, total: 41.3 },
      { price: 1849.25, size: 16.7, total: 58.0 },
      { price: 1849.50, size: 8.9, total: 66.9 },
      { price: 1849.75, size: 21.4, total: 88.3 },
      { price: 1850.00, size: 13.1, total: 101.4 },
      { price: 1850.25, size: 17.8, total: 119.2 }
    ],
    spread: 1.00,
    midPrice: 1848.00,
    timestamp: Date.now()
  });

  const [liquidityMetrics, setLiquidityMetrics] = useState<LiquidityMetrics>({
    bidLiquidity: 123.1,
    askLiquidity: 119.2,
    totalLiquidity: 242.3,
    spreadPercentage: 0.054
  });

  const [selectedDepth, setSelectedDepth] = useState<number>(10);

  const { lastMessage } = useWebSocket();

  useEffect(() => {
    if (lastMessage && lastMessage.type === 'ORDERBOOK_UPDATE') {
      const { orderbook, liquidity } = lastMessage.payload;
      if (orderbook) setOrderBook(orderbook);
      if (liquidity) setLiquidityMetrics(liquidity);
    }
  }, [lastMessage]);

  const formatPrice = (value: number) => `$${value.toFixed(2)}`;
  const formatSize = (value: number) => `${value.toFixed(1)}`;
  const formatPercentage = (value: number) => `${(value * 100).toFixed(3)}%`;

  // Prepare data for visualization (top N levels)
  const visibleBids = orderBook.bids.slice(0, selectedDepth).reverse(); // Reverse for chart
  const visibleAsks = orderBook.asks.slice(0, selectedDepth);

  const chartData = [
    ...visibleBids.map(bid => ({
      price: bid.price,
      size: bid.size,
      type: 'bid',
      color: '#10b981'
    })),
    ...visibleAsks.map(ask => ({
      price: ask.price,
      size: ask.size,
      type: 'ask',
      color: '#ef4444'
    }))
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-lg">
          <p className="text-gray-200 font-semibold">{formatPrice(label)}</p>
          <p className={`text-sm ${data.type === 'bid' ? 'text-green-400' : 'text-red-400'}`}>
            {data.type.toUpperCase()}: {formatSize(data.size)} ETH
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2">
          <BookOpen size={20} />
          Order Book Visualizer
        </h3>
        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-500">
            Last updated: {new Date(orderBook.timestamp).toLocaleTimeString()}
          </div>
          <select
            value={selectedDepth}
            onChange={(e) => setSelectedDepth(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
          >
            <option value={5}>5 Levels</option>
            <option value={10}>10 Levels</option>
            <option value={15}>15 Levels</option>
            <option value={20}>20 Levels</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Mid Price</p>
              <p className="text-xl font-bold text-blue-400">{formatPrice(orderBook.midPrice)}</p>
            </div>
            <DollarSign className="text-blue-400" size={24} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Spread</p>
              <p className="text-xl font-bold text-purple-400">{formatPrice(orderBook.spread)}</p>
              <p className="text-xs text-gray-500">{formatPercentage(liquidityMetrics.spreadPercentage)}</p>
            </div>
            <Activity className="text-purple-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Bid Liquidity</p>
              <p className="text-xl font-bold text-green-400">{formatSize(liquidityMetrics.bidLiquidity)}</p>
            </div>
            <TrendingUp className="text-green-400" size={20} />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Ask Liquidity</p>
              <p className="text-xl font-bold text-red-400">{formatSize(liquidityMetrics.askLiquidity)}</p>
            </div>
            <TrendingDown className="text-red-400" size={20} />
          </div>
        </div>
      </div>

      {/* Order Book Chart */}
      <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Order Book Depth (WETH/USDC)</h4>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="price"
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={formatPrice}
              />
              <YAxis stroke="#9CA3AF" fontSize={12} tickFormatter={formatSize} />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="size"
                fill={(entry: any) => entry.color}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Order Book Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bids Table */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 bg-green-900/20">
            <h4 className="text-sm font-semibold text-green-400 flex items-center gap-2">
              <TrendingUp size={16} />
              Bids (Buy Orders)
            </h4>
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {orderBook.bids.slice(0, selectedDepth).map((bid, index) => (
                  <tr key={index} className="hover:bg-gray-800/30">
                    <td className="px-4 py-2 text-sm text-right text-green-400 font-mono">
                      {formatPrice(bid.price)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-200 font-mono">
                      {formatSize(bid.size)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-400 font-mono">
                      {formatSize(bid.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Asks Table */}
        <div className="bg-gray-900/40 border border-gray-700 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-700 bg-red-900/20">
            <h4 className="text-sm font-semibold text-red-400 flex items-center gap-2">
              <TrendingDown size={16} />
              Asks (Sell Orders)
            </h4>
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full">
              <thead className="bg-gray-800/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Price</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-400 uppercase tracking-wider">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {orderBook.asks.slice(0, selectedDepth).map((ask, index) => (
                  <tr key={index} className="hover:bg-gray-800/30">
                    <td className="px-4 py-2 text-sm text-right text-red-400 font-mono">
                      {formatPrice(ask.price)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-200 font-mono">
                      {formatSize(ask.size)}
                    </td>
                    <td className="px-4 py-2 text-sm text-right text-gray-400 font-mono">
                      {formatSize(ask.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Liquidity Summary */}
      <div className="mt-6 bg-gray-900/40 border border-gray-700 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-gray-300 mb-4">Liquidity Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Bid Liquidity</p>
            <p className="text-lg font-bold text-green-400">{formatSize(liquidityMetrics.bidLiquidity)} ETH</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Ask Liquidity</p>
            <p className="text-lg font-bold text-red-400">{formatSize(liquidityMetrics.askLiquidity)} ETH</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-gray-400 uppercase tracking-wider">Total Market Liquidity</p>
            <p className="text-lg font-bold text-blue-400">{formatSize(liquidityMetrics.totalLiquidity)} ETH</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderBookVisualizer;
