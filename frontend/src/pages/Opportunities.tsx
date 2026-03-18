
import React from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import { useApiData } from '../hooks/useMockData';
import { Opportunity } from '../types';

const RiskBadge = ({ risk }: { risk: 'Low' | 'Medium' | 'High' }) => {
  const styles = {
    Low: 'bg-green-500/20 text-green-400',
    Medium: 'bg-yellow-500/20 text-yellow-400',
    High: 'bg-red-500/20 text-red-400',
  };
  return <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[risk]}`}>{risk}</span>;
};

const Opportunities: React.FC = () => {
  const { opportunities } = useApiData();

  const columns = [
    {
      key: 'timestamp' as keyof Opportunity,
      header: 'Timestamp',
      render: (item: Opportunity) => new Date(item.timestamp).toLocaleTimeString(),
    },
    {
      key: 'assets' as keyof Opportunity,
      header: 'Asset Pair',
      render: (item: Opportunity) => <span className="font-medium text-white">{item.assets.join('/')}</span>,
    },
    {
      key: 'exchanges' as keyof Opportunity,
      header: 'Exchanges',
      render: (item: Opportunity) => <span>{item.exchanges.join(' → ')}</span>,
    },
    {
      key: 'potentialProfit' as keyof Opportunity,
      header: 'Potential Profit',
      render: (item: Opportunity) => <span className="font-semibold text-green-400">${item.potentialProfit.toFixed(2)}</span>,
    },
    {
      key: 'riskLevel' as keyof Opportunity,
      header: 'Risk Level',
      render: (item: Opportunity) => <RiskBadge risk={item.riskLevel as 'Low' | 'Medium' | 'High'} />,
    },
    {
        key: 'id' as keyof Opportunity,
        header: 'Action',
        render: (_item: Opportunity) => <button className="text-blue-500 hover:text-blue-400 text-xs font-bold">EXECUTE</button>
    }
  ];

  return (
    <Card title="Live Arbitrage Opportunities">
      <p className="text-sm text-gray-500 mb-4">Showing last 50 detected opportunities. Updates in real-time.</p>
      <Table<Opportunity> columns={columns} data={opportunities} />
    </Card>
  );
};

export default Opportunities;
