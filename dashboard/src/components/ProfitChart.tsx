import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

interface ProfitChartProps {
  data: Array<{ timestamp: string; value: number }>;
  title?: string;
  color?: string;
  valuePrefix?: string;
  valueSuffix?: string;
}

const ProfitChart: React.FC<ProfitChartProps> = ({
  data,
  title = "Profit Over Time",
  color = "#10b981",
  valuePrefix = "$",
  valueSuffix = ""
}) => {
  // Format data for the chart
  const chartData = data.map(item => ({
    ...item,
    formattedTime: new Date(item.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }));

  return (
    <div className="bg-slate-900/40 border border-white/10 rounded-3xl p-8 backdrop-blur-xl shadow-2xl">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-[10px] font-black text-slate-100 uppercase tracking-[0.3em] flex items-center gap-2">
          <TrendingUp size={14} className="text-emerald-400" />
          {title}
        </h3>
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis
              dataKey="formattedTime"
              stroke="rgba(255,255,255,0.6)"
              fontSize={10}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              stroke="rgba(255,255,255,0.6)"
              fontSize={10}
              tick={{ fontSize: 10 }}
              tickFormatter={(value) => `${valuePrefix}${value.toLocaleString()}${valueSuffix}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '12px'
              }}
              labelFormatter={(label) => `Time: ${label}`}
              formatter={(value: number) => [`${valuePrefix}${value.toLocaleString()}${valueSuffix}`, title]}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, strokeWidth: 2, r: 3 }}
              activeDot={{ r: 5, stroke: color, strokeWidth: 2, fill: 'rgba(15, 23, 42, 0.9)' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProfitChart;
