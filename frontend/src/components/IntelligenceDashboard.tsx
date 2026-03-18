import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: '00:00', sentiment: 45, volatility: 20 },
  { name: '04:00', sentiment: 55, volatility: 35 },
  { name: '08:00', sentiment: 75, volatility: 50 },
  { name: '12:00', sentiment: 65, volatility: 45 },
  { name: '16:00', sentiment: 85, volatility: 60 },
  { name: '20:00', sentiment: 70, volatility: 40 },
  { name: '24:00', sentiment: 60, volatility: 30 },
];

const IntelligenceDashboard: React.FC = () => {
  return (
    <div className="flex-grow bg-gray-900 p-6 rounded-lg border border-gray-800 text-gray-300 overflow-y-auto">
      <h2 className="text-xl font-bold text-purple-400 mb-4">Market Intelligence</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-black/40 p-4 rounded border border-gray-700 h-80">
          <h3 className="text-sm font-semibold mb-4 text-gray-400">Market Sentiment vs Volatility</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                <YAxis stroke="#9CA3AF" fontSize={12} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: 'none', color: '#fff' }} />
                <Line type="monotone" dataKey="sentiment" stroke="#8884d8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="volatility" stroke="#82ca9d" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="bg-black/40 p-4 rounded border border-gray-700 h-80">
             <h3 className="text-sm font-semibold mb-4 text-gray-400">AI Opportunity Detection</h3>
             <div className="space-y-3">
                 <div className="flex justify-between items-center p-3 bg-gray-800 rounded border-l-4 border-green-500">
                     <span className="font-mono text-green-400">WETH/USDC</span>
                     <span className="text-xs text-gray-400">Confidence: <span className="text-white font-bold">98%</span></span>
                 </div>
                 <div className="flex justify-between items-center p-3 bg-gray-800 rounded border-l-4 border-yellow-500">
                     <span className="font-mono text-yellow-400">WBTC/DAI</span>
                     <span className="text-xs text-gray-400">Confidence: <span className="text-white font-bold">85%</span></span>
                 </div>
             </div>
        </div>
      </div>
    </div>
  );
};

export default IntelligenceDashboard;