
import React from 'react';
import { ServiceStatus } from '../../types';

interface BadgeProps {
  status: ServiceStatus;
}

const statusStyles: Record<ServiceStatus, string> = {
  online: 'bg-green-500/20 text-green-400',
  degraded: 'bg-yellow-500/20 text-yellow-400',
  offline: 'bg-red-500/20 text-red-400',
};

const dotStyles: Record<ServiceStatus, string> = {
    online: 'bg-green-500',
    degraded: 'bg-yellow-500',
    offline: 'bg-red-500',
};

const Badge: React.FC<BadgeProps> = ({ status }) => {
  return (
    <span
      className={`px-2.5 py-0.5 text-xs font-medium rounded-full inline-flex items-center capitalize ${statusStyles[status]}`}
    >
      <span className={`w-2 h-2 mr-2 rounded-full ${dotStyles[status]}`}></span>
      {status}
    </span>
  );
};

export default Badge;
