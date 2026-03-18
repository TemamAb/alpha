
import React from 'react';
import Card from '../components/ui/Card';
import Table from '../components/ui/Table';
import Badge from '../components/ui/Badge';
import { useApiData, Service } from '../hooks/useApiData';

const ProgressBar = ({ value }: { value: number }) => (
    <div className="w-full bg-gray-600 rounded-full h-2.5">
        <div 
            className="bg-blue-500 h-2.5 rounded-full" 
            style={{ width: `${value}%` }}
        ></div>
    </div>
);

const Services: React.FC = () => {
  const { services } = useApiData();

  const columns = [
    {
      key: 'name' as keyof Service,
      header: 'Service Name',
      render: (item: Service) => <span className="font-medium text-white">{item.name}</span>,
    },
    {
      key: 'status' as keyof Service,
      header: 'Status',
      render: (item: Service) => <Badge status={item.status as 'online' | 'degraded' | 'offline'} />,
    },
    {
      key: 'region' as keyof Service,
      header: 'Region',
    },
    {
      key: 'cpuUsage' as keyof Service,
      header: 'CPU Usage',
      render: (item: Service) => (
        <div className="flex items-center">
            <div className="w-24 mr-2">
                <ProgressBar value={item.cpuUsage} />
            </div>
            <span className="text-xs">{item.cpuUsage.toFixed(1)}%</span>
        </div>
      ),
    },
    {
      key: 'memoryUsage' as keyof Service,
      header: 'Memory Usage',
      render: (item: Service) => (
        <div className="flex items-center">
            <div className="w-24 mr-2">
                <ProgressBar value={item.memoryUsage} />
            </div>
            <span className="text-xs">{item.memoryUsage.toFixed(1)}%</span>
        </div>
      ),
    },
  ];

  return (
    <Card title="Microservice Health Status">
      <Table<Service> columns={columns} data={services} />
    </Card>
  );
};

export default Services;
