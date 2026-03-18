
import React from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import Card from '../components/ui/Card';
import { useApiData } from '../hooks/useApiData';

const COLORS = ['#3B82F6', '#10B981', '#F97316', '#8B5CF6', '#EC4899'];

const Analytics: React.FC = () => {
  const { strategies, pnlData, loading, error } = useApiData();

  const strategyPnlData = strategies.map(s => ({ name: s.name, PnL: s.pnl }));
  const winRateData = strategies.map(s => ({ name: s.name, 'Win Rate': s.winRate }));

  const totalPnl = strategies.reduce((acc, s) => acc + s.pnl, 0);
  const pnlDistributionData = strategies.map(s => ({
    name: s.name,
    value: Math.max(0, s.pnl / totalPnl * 100), // only show positive contributions in pie
  })).filter(d => d.value > 0);

  return (
    <div className="space-y-8">
      <Card title="Performance Deep Dive">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <div className="h-80">
            <h4 className="text-md font-semibold text-white mb-4 text-center">PnL by Strategy</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={strategyPnlData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263148" />
                <XAxis dataKey="name" stroke="#909AAF" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#909AAF" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${Number(value) / 1000}k`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A2233', border: '1px solid #263148' }}
                  labelStyle={{ color: '#FFFFFF' }}
                  formatter={(value) => `$${Number(value).toLocaleString()}`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="PnL">
                  {strategyPnlData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.PnL >= 0 ? '#22C55E' : '#EF4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="h-80">
            <h4 className="text-md font-semibold text-white mb-4 text-center">PnL Contribution</h4>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pnlDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name.split(' ')[1]} ${(percent * 100).toFixed(0)}%`}
                  labelStyle={{ fontSize: '12px', fill: '#fff' }}
                >
                  {pnlDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${Number(value).toFixed(2)}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="h-80 lg:col-span-2">
            <h4 className="text-md font-semibold text-white mb-4 text-center">Strategy Win Rate (%)</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={winRateData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#263148" />
                <XAxis type="number" domain={[0, 100]} stroke="#909AAF" fontSize={12} />
                <YAxis type="category" dataKey="name" stroke="#909AAF" fontSize={10} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1A2233', border: '1px solid #263148' }}
                  labelStyle={{ color: '#FFFFFF' }}
                  formatter={(value) => `${Number(value).toFixed(2)}%`}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Win Rate" fill="#3B82F6" barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>

        </div>
      </Card>
    </div>
  );
};

export default Analytics;
